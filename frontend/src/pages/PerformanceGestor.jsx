import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import { getCycles, createCycle, updateCycle, deleteCycle, getEvaluations, getEmployees, getMyProfile, createEvaluation } from "../api";

const CYCLE_STATUS_LABEL = { draft: "Rascunho", active: "Ativo", closed: "Encerrado" };
const CYCLE_STATUS_TONE = { draft: "muted", active: "green", closed: "rose" };
const SCORE_LABELS = { 1: "Insatisfatório", 2: "A Melhorar", 3: "Satisfatório", 4: "Bom", 5: "Excelente" };
const SCORE_COLOR = (s) => s >= 4.5 ? "var(--success)" : s >= 3.5 ? "var(--primary)" : s >= 2.5 ? "var(--warning)" : "var(--rose)";

const DEFAULT_METRICS = ["Trabalho em Equipa", "Comunicação", "Qualidade do Trabalho", "Iniciativa", "Cumprimento de Prazos"];

function toKey(label) {
  return label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
function emptyCycleForm() {
  return { name: "", startDate: "", endDate: "", metrics: DEFAULT_METRICS.map(label => ({ label })) };
}

function ScoreButtons({ value, onChange }) {
  return (
    <div className="score-buttons">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          className={`score-btn ${value === n ? "is-selected" : ""}`}
          onClick={() => onChange(n)} title={SCORE_LABELS[n]}>
          {n}
        </button>
      ))}
      {value ? <span className="score-label-hint">{SCORE_LABELS[value]}</span> : null}
    </div>
  );
}

function CompTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13,
      boxShadow: "0 4px 16px rgba(0,0,0,.15)"
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>{label}</p>
      <p style={{ color: score >= 4 ? "#22c55e" : score >= 3 ? "#3b82f6" : "#f43f5e", margin: 0 }}>
        Nota: <strong>{score?.toFixed(1)} / 5</strong>
      </p>
    </div>
  );
}

export function PerformanceGestor({ session }) {
  const [tab, setTab] = useState("cycles");
  const [cycles, setCycles] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [selfEmployee, setSelfEmployee] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cycle management
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleForm, setCycleForm] = useState(emptyCycleForm());
  const [savingCycle, setSavingCycle] = useState(false);

  // Evaluate team
  const [evalCycleId, setEvalCycleId] = useState("");
  const [evalTarget, setEvalTarget] = useState(null);
  const [evalScores, setEvalScores] = useState({});
  const [evalComment, setEvalComment] = useState("");
  const [saving, setSaving] = useState(false);

  // Comparative
  const [compCycleId, setCompCycleId] = useState("");

  // History search
  const [historySearch, setHistorySearch] = useState("");

  // My evals
  const [expanded, setExpanded] = useState(new Set());

  const firstName = session.user.name.split(" ")[0];

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [c, e, allEmployees, profile] = await Promise.allSettled([
        getCycles(session.token),
        getEvaluations(session.token),
        getEmployees(session.token),
        getMyProfile(session.token)
      ]);

      const cyclesVal = c.status === "fulfilled" ? c.value : [];
      const evalsVal = e.status === "fulfilled" ? e.value : [];
      const empsVal = allEmployees.status === "fulfilled" ? allEmployees.value : [];
      const profileVal = profile.status === "fulfilled" ? profile.value : null;

      setCycles(cyclesVal);
      setEvaluations(evalsVal);
      setMyProfile(profileVal);

      const team = empsVal.filter(emp => emp.manager?.toLowerCase() === session.user.name.toLowerCase());
      setTeamEmployees(team);

      try {
        setSelfEmployee(profileVal);
      } catch (_) { setSelfEmployee(null); }

      if (cyclesVal.length > 0 && !evalCycleId) {
        const active = cyclesVal.find(c => c.status === "active");
        setEvalCycleId(active?._id || "");
        setCompCycleId(active?._id || cyclesVal[0]._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Department cycles (created by gestor for their dept)
  const deptCycles = cycles.filter(c => c.department && c.department !== "");
  // Global cycles (created by admin)
  const globalCycles = cycles.filter(c => !c.department || c.department === "");
  // Available for evaluation
  const availableForEval = cycles.filter(c => c.status !== "closed");

  const selectedCycle = cycles.find(c => c._id === evalCycleId) || null;
  const myEvals = selfEmployee
    ? evaluations.filter(e => e.employee?.toString() === selfEmployee._id?.toString())
    : [];
  const teamEvals = selfEmployee
    ? evaluations.filter(e => e.employee?.toString() !== selfEmployee._id?.toString())
    : evaluations;

  const evaluatedInSelectedCycle = selectedCycle
    ? new Set(teamEvals.filter(e => e.cycle?._id === selectedCycle._id).map(e => e.employee))
    : new Set();

  // Cycle form helpers
  function addMetric() { setCycleForm(f => ({ ...f, metrics: [...f.metrics, { label: "" }] })); }
  function removeMetric(idx) { setCycleForm(f => ({ ...f, metrics: f.metrics.filter((_, i) => i !== idx) })); }
  function setMetricLabel(idx, label) { setCycleForm(f => ({ ...f, metrics: f.metrics.map((m, i) => i === idx ? { ...m, label } : m) })); }

  async function handleCreateCycle(e) {
    e.preventDefault();
    try {
      setSavingCycle(true);
      setError("");
      await createCycle(session.token, {
        name: cycleForm.name,
        startDate: cycleForm.startDate,
        endDate: cycleForm.endDate,
        metrics: cycleForm.metrics.filter(m => m.label.trim()).map(m => ({ key: toKey(m.label), label: m.label.trim() }))
      });
      setShowCycleForm(false);
      setCycleForm(emptyCycleForm());
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCycle(false);
    }
  }

  async function handleStatusChange(cycleId, status) {
    try {
      setError("");
      await updateCycle(session.token, cycleId, { status });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteCycle(cycleId) {
    const evalCount = evaluations.filter(e => e.cycle?._id === cycleId).length;
    const msg = evalCount > 0
      ? `Este ciclo tem ${evalCount} avaliação(ões). Eliminar apaga tudo. Confirmar?`
      : "Eliminar este ciclo?";
    if (!window.confirm(msg)) return;
    try {
      setError("");
      await deleteCycle(session.token, cycleId);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function openEvalForm(employee) {
    setEvalTarget(employee);
    const initialScores = {};
    if (selectedCycle) selectedCycle.metrics.forEach(m => { initialScores[m.key] = 0; });
    setEvalScores(initialScores);
    setEvalComment("");
    setError("");
  }

  async function handleSubmitEval(e) {
    e.preventDefault();
    if (!selectedCycle || !evalTarget) return;
    const missing = selectedCycle.metrics.find(m => !evalScores[m.key]);
    if (missing) { setError(`Defina uma pontuação para "${missing.label}".`); return; }
    try {
      setSaving(true);
      setError("");
      await createEvaluation(session.token, {
        cycleId: selectedCycle._id,
        employeeId: evalTarget._id,
        scores: selectedCycle.metrics.map(m => ({ metricKey: m.key, metricLabel: m.label, score: evalScores[m.key] })),
        overallComment: evalComment
      });
      setEvalTarget(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleExpand(id) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // Comparative data
  const compData = teamEvals
    .filter(e => e.cycle?._id === compCycleId && e.finalScore != null)
    .sort((a, b) => b.finalScore - a.finalScore)
    .map(e => ({ name: e.employeeName, score: e.finalScore }));
  const compCycleName = cycles.find(c => c._id === compCycleId)?.name || "";

  if (loading) return <section className="page stack-lg"><p style={{ color: "var(--text-muted)" }}>A carregar...</p></section>;

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">
            {myProfile?.department ? `Gestor de ${myProfile.department}` : `Gestor · ${session.user.name}`}
          </span>
          <h2>Olá, {firstName}.</h2>
          <p>Gira os ciclos do seu departamento e avalie a sua equipa.</p>
        </div>
        <div className="hero-score">
          <span>Equipa</span>
          <strong>{teamEmployees.length}</strong>
          <small>colaboradores</small>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="perf-tabs">
        <button className={`perf-tab ${tab === "cycles" ? "is-active" : ""}`} onClick={() => { setTab("cycles"); setEvalTarget(null); }}>
          Ciclos do Departamento
          {deptCycles.length > 0 && <span className="perf-tab-count">{deptCycles.length}</span>}
        </button>
        <button className={`perf-tab ${tab === "evaluate" ? "is-active" : ""}`} onClick={() => { setTab("evaluate"); setEvalTarget(null); }}>
          Avaliar Equipa
        </button>
        <button className={`perf-tab ${tab === "history" ? "is-active" : ""}`} onClick={() => { setTab("history"); setEvalTarget(null); }}>
          Histórico da Equipa
          {teamEvals.length > 0 && <span className="perf-tab-count">{teamEvals.length}</span>}
        </button>
        <button className={`perf-tab ${tab === "comparative" ? "is-active" : ""}`} onClick={() => { setTab("comparative"); setEvalTarget(null); }}>
          Comparativo
        </button>
        <button className={`perf-tab ${tab === "mine" ? "is-active" : ""}`} onClick={() => { setTab("mine"); setEvalTarget(null); }}>
          As minhas avaliações
          {myEvals.length > 0 && <span className="perf-tab-count">{myEvals.length}</span>}
        </button>
      </div>

      {/* ── Ciclos do Departamento ── */}
      {tab === "cycles" && (
        <div className="stack-lg">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => { setShowCycleForm(v => !v); setCycleForm(emptyCycleForm()); setError(""); }}>
              {showCycleForm ? "Cancelar" : "+ Novo Ciclo"}
            </button>
          </div>

          {showCycleForm && (
            <form className="cycle-form-panel" onSubmit={handleCreateCycle}>
              <h3 style={{ margin: "0 0 4px" }}>Novo ciclo de avaliação</h3>
              {myProfile?.department && (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
                  Este ciclo será criado para o departamento <strong>{myProfile.department}</strong>.
                </p>
              )}
              <div className="cycle-form-grid">
                <div className="auth-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Nome do ciclo</label>
                  <input type="text" placeholder="Ex: Avaliação Q2 2026" value={cycleForm.name}
                    onChange={e => setCycleForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="auth-field">
                  <label>Data de início</label>
                  <input type="date" value={cycleForm.startDate}
                    onChange={e => setCycleForm(f => ({ ...f, startDate: e.target.value }))} required />
                </div>
                <div className="auth-field">
                  <label>Data de fim</label>
                  <input type="date" value={cycleForm.endDate}
                    onChange={e => setCycleForm(f => ({ ...f, endDate: e.target.value }))} required />
                </div>
              </div>
              <div className="metrics-editor">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <strong style={{ fontSize: 14 }}>Métricas de avaliação</strong>
                  <button type="button" className="ghost-button" style={{ padding: "4px 12px", fontSize: 13 }} onClick={addMetric}>+ Adicionar</button>
                </div>
                {cycleForm.metrics.map((m, idx) => (
                  <div key={idx} className="metric-edit-row">
                    <input type="text" placeholder={`Métrica ${idx + 1}`} value={m.label}
                      onChange={e => setMetricLabel(idx, e.target.value)} />
                    <button type="button" className="ghost-button" style={{ padding: "4px 10px", color: "var(--rose)" }} onClick={() => removeMetric(idx)}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" disabled={savingCycle}>{savingCycle ? "A criar..." : "Criar ciclo"}</button>
                <button type="button" className="ghost-button" onClick={() => setShowCycleForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {globalCycles.length > 0 && (
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: 10 }}>Ciclos globais (criados pelo administrador)</span>
              <div className="cycle-list">
                {globalCycles.map(cycle => {
                  const evalCount = evaluations.filter(e => e.cycle?._id === cycle._id).length;
                  return (
                    <div key={cycle._id} className="cycle-card">
                      <div className="cycle-card-main">
                        <div>
                          <span className={`cycle-status-badge tone-${CYCLE_STATUS_TONE[cycle.status]}`}>{CYCLE_STATUS_LABEL[cycle.status]}</span>
                          <h3 style={{ margin: "6px 0 4px" }}>{cycle.name}</h3>
                          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                            {new Date(cycle.startDate).toLocaleDateString("pt-PT")} — {new Date(cycle.endDate).toLocaleDateString("pt-PT")}
                            {" · "}{cycle.metrics.length} métrica(s){" · "}{evalCount} avaliação(ões) da equipa
                          </p>
                        </div>
                      </div>
                      {cycle.metrics.length > 0 && (
                        <div className="cycle-metrics-preview">
                          {cycle.metrics.map(m => <span key={m.key} className="metric-chip">{m.label}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {deptCycles.length === 0 && !showCycleForm ? (
            <div className="empty-state">
              <strong>Sem ciclos de departamento</strong>
              <p>Crie um ciclo específico para avaliar a sua equipa com as métricas do seu departamento.</p>
            </div>
          ) : deptCycles.length > 0 && (
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: 10 }}>Ciclos do departamento {myProfile?.department}</span>
              <div className="cycle-list">
                {deptCycles.map(cycle => {
                  const evalCount = evaluations.filter(e => e.cycle?._id === cycle._id).length;
                  return (
                    <div key={cycle._id} className="cycle-card">
                      <div className="cycle-card-main">
                        <div>
                          <span className={`cycle-status-badge tone-${CYCLE_STATUS_TONE[cycle.status]}`}>{CYCLE_STATUS_LABEL[cycle.status]}</span>
                          <h3 style={{ margin: "6px 0 4px" }}>{cycle.name}</h3>
                          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                            {new Date(cycle.startDate).toLocaleDateString("pt-PT")} — {new Date(cycle.endDate).toLocaleDateString("pt-PT")}
                            {" · "}{cycle.metrics.length} métrica(s){" · "}{evalCount} avaliação(ões)
                          </p>
                        </div>
                        <div className="cycle-card-actions">
                          {cycle.status === "draft" && <button className="ghost-button" style={{ fontSize: 13 }} onClick={() => handleStatusChange(cycle._id, "active")}>Ativar</button>}
                          {cycle.status === "active" && <button className="ghost-button" style={{ fontSize: 13 }} onClick={() => handleStatusChange(cycle._id, "closed")}>Encerrar</button>}
                          {cycle.status === "closed" && <button className="ghost-button" style={{ fontSize: 13 }} onClick={() => handleStatusChange(cycle._id, "active")}>Reabrir</button>}
                          <button className="ghost-button" style={{ fontSize: 13, color: "var(--rose)" }} onClick={() => handleDeleteCycle(cycle._id)}>Eliminar</button>
                        </div>
                      </div>
                      {cycle.metrics.length > 0 && (
                        <div className="cycle-metrics-preview">
                          {cycle.metrics.map(m => <span key={m.key} className="metric-chip">{m.label}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Avaliar Equipa ── */}
      {tab === "evaluate" && (
        <div className="stack-lg">
          {availableForEval.length === 0 ? (
            <div className="empty-state">
              <strong>Nenhum ciclo disponível</strong>
              <p>Crie um ciclo de departamento ou aguarde que o administrador ative um ciclo global.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Ciclo:</label>
                <select value={evalCycleId} onChange={e => { setEvalCycleId(e.target.value); setEvalTarget(null); }}
                  style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}>
                  <option value="">Selecionar ciclo...</option>
                  {globalCycles.filter(c => c.status !== "closed").length > 0 && (
                    <optgroup label="Globais">
                      {globalCycles.filter(c => c.status !== "closed").map(c => (
                        <option key={c._id} value={c._id}>{c.name}{c.status === "draft" ? " (rascunho)" : ""}</option>
                      ))}
                    </optgroup>
                  )}
                  {deptCycles.filter(c => c.status !== "closed").length > 0 && (
                    <optgroup label={`Departamento — ${myProfile?.department || ""}`}>
                      {deptCycles.filter(c => c.status !== "closed").map(c => (
                        <option key={c._id} value={c._id}>{c.name}{c.status === "draft" ? " (rascunho)" : ""}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {!selectedCycle ? (
                <div className="empty-state"><p>Selecione um ciclo para avaliar a equipa.</p></div>
              ) : (
                <>
                  <div className="active-cycle-banner">
                    <div>
                      <span className="eyebrow">{selectedCycle.department ? `Ciclo de departamento` : "Ciclo global"}</span>
                      <strong>{selectedCycle.name}</strong>
                      <span style={{ color: "var(--text-muted)", fontSize: 13, marginLeft: 12 }}>
                        {new Date(selectedCycle.startDate).toLocaleDateString("pt-PT")} — {new Date(selectedCycle.endDate).toLocaleDateString("pt-PT")}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {evaluatedInSelectedCycle.size} / {teamEmployees.length} avaliados
                    </span>
                  </div>

                  {teamEmployees.length === 0 ? (
                    <div className="empty-state"><p>A sua equipa não tem colaboradores registados.</p></div>
                  ) : (
                    <div className="team-eval-list">
                      {teamEmployees.map(emp => {
                        const isEvaluated = evaluatedInSelectedCycle.has(emp._id);
                        const isOpen = evalTarget?._id === emp._id;
                        const existingEval = evaluations.find(e => e.employee === emp._id && e.cycle?._id === selectedCycle._id);
                        return (
                          <div key={emp._id} className={`team-eval-row ${isOpen ? "is-open" : ""}`}>
                            <div className="team-eval-row-header">
                              <div className="person-cell">
                                <span>{emp.name.slice(0, 2).toUpperCase()}</span>
                                <div>
                                  <strong>{emp.name}</strong>
                                  <small>{emp.jobTitle || emp.department}</small>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                {isEvaluated ? (
                                  <>
                                    <span className="score-pill">{existingEval?.finalScore?.toFixed(1) ?? "—"} / 5</span>
                                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Avaliado</span>
                                  </>
                                ) : (
                                  <button className="ghost-button" style={{ fontSize: 13 }}
                                    onClick={() => isOpen ? setEvalTarget(null) : openEvalForm(emp)}>
                                    {isOpen ? "Fechar" : "Avaliar"}
                                  </button>
                                )}
                              </div>
                            </div>
                            {isOpen && !isEvaluated && (
                              <form className="eval-form-panel" onSubmit={handleSubmitEval}>
                                <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>
                                  Classifique cada métrica de 1 (Insatisfatório) a 5 (Excelente).
                                </p>
                                {selectedCycle.metrics.map(metric => (
                                  <div key={metric.key} className="metric-score-row">
                                    <strong>{metric.label}</strong>
                                    <ScoreButtons value={evalScores[metric.key] || 0}
                                      onChange={n => setEvalScores(s => ({ ...s, [metric.key]: n }))} />
                                  </div>
                                ))}
                                <div className="auth-field" style={{ marginTop: 16 }}>
                                  <label>Comentário geral (opcional)</label>
                                  <textarea rows={3} value={evalComment}
                                    onChange={e => setEvalComment(e.target.value)}
                                    placeholder="Observações sobre o desempenho do colaborador..." />
                                </div>
                                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                                  <button type="submit" disabled={saving}>{saving ? "A submeter..." : "Submeter avaliação"}</button>
                                  <button type="button" className="ghost-button" onClick={() => setEvalTarget(null)}>Cancelar</button>
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Histórico da Equipa ── */}
      {tab === "history" && (
        <div className="stack-lg">
          {teamEvals.length === 0 ? (
            <div className="empty-state"><p>Ainda não há avaliações da sua equipa.</p></div>
          ) : (
            <>
              <input
                type="search"
                placeholder="Pesquisar por nome..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13, width: 240 }}
              />
            <div className="eval-table-wrapper">
              <table className="eval-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Ciclo</th>
                    <th>Nota Final</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {teamEvals.filter(ev => !historySearch || ev.employeeName?.toLowerCase().includes(historySearch.toLowerCase())).map(ev => (
                    <tr key={ev._id}>
                      <td><strong>{ev.employeeName}</strong></td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {ev.cycle?.name || "—"}
                        {ev.cycle?.department && (
                          <span className="metric-chip" style={{ marginLeft: 8, fontSize: 11 }}>Depto.</span>
                        )}
                      </td>
                      <td>{ev.finalScore != null ? <span className="score-pill">{ev.finalScore.toFixed(1)} / 5</span> : "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{new Date(ev.createdAt).toLocaleDateString("pt-PT")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {/* ── Comparativo ── */}
      {tab === "comparative" && (
        <div className="stack-lg">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Ciclo:</label>
            <select value={compCycleId} onChange={e => setCompCycleId(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}>
              {globalCycles.length > 0 && (
                <optgroup label="Globais">
                  {globalCycles.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </optgroup>
              )}
              {deptCycles.length > 0 && (
                <optgroup label={`Departamento — ${myProfile?.department || ""}`}>
                  {deptCycles.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>

          {compData.length === 0 ? (
            <div className="empty-state">
              <strong>Sem avaliações</strong>
              <p>{compCycleName ? `A equipa ainda não tem avaliações em "${compCycleName}".` : "Selecione um ciclo."}</p>
            </div>
          ) : (
            <article className="insight-panel">
              <div className="section-title">
                <div>
                  <span className="eyebrow">Comparativo da equipa</span>
                  <h3>{compCycleName}</h3>
                </div>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{compData.length} avaliados</span>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(200, compData.length * 48)} style={{ marginTop: 16 }}>
                <BarChart data={compData} layout="vertical" margin={{ left: 0, right: 60, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 13, fill: "var(--text)" }} />
                  <Tooltip content={<CompTooltip />} cursor={{ fill: "rgba(0,0,0,.04)" }} />
                  <Bar dataKey="score" name="Nota" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 12, fill: "var(--text-muted)", formatter: v => v.toFixed(1) }}>
                    {compData.map((entry, i) => (
                      <Cell key={i} fill={entry.score >= 4 ? "#22c55e" : entry.score >= 3 ? "#3b82f6" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#22c55e", display: "inline-block" }} /> ≥ 4.0</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#3b82f6", display: "inline-block" }} /> 3.0–3.9</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#f43f5e", display: "inline-block" }} /> &lt; 3.0</span>
              </div>
            </article>
          )}
        </div>
      )}

      {/* ── As minhas avaliações ── */}
      {tab === "mine" && (
        <div className="stack-lg">
          {myEvals.length === 0 ? (
            <div className="empty-state">
              <strong>Sem avaliações</strong>
              <p>Ainda não tem avaliações registadas pelo administrador.</p>
            </div>
          ) : (
            <div className="collab-eval-list">
              {myEvals.map(ev => {
                const isOpen = expanded.has(ev._id);
                const score = ev.finalScore;
                return (
                  <div key={ev._id} className="collab-eval-card">
                    <button type="button" className="collab-eval-card-header"
                      onClick={() => toggleExpand(ev._id)} aria-expanded={isOpen}>
                      <div>
                        <strong>{ev.cycle?.name || "Ciclo sem nome"}</strong>
                        <span style={{ color: "var(--text-muted)", fontSize: 13, marginLeft: 10 }}>
                          {new Date(ev.createdAt).toLocaleDateString("pt-PT")}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {score != null && (
                          <div className="eval-score-display">
                            <span className="eval-score-number" style={{ color: SCORE_COLOR(score) }}>{score.toFixed(1)}</span>
                            <span className="eval-score-max">/ 5</span>
                            <div className="eval-score-bar">
                              <div className="eval-score-fill" style={{ width: `${(score / 5) * 100}%`, background: SCORE_COLOR(score) }} />
                            </div>
                          </div>
                        )}
                        <svg style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 160ms", color: "var(--text-muted)" }}
                          width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="collab-eval-details">
                        {ev.scores.map(s => (
                          <div key={s.metricKey} className="collab-metric-row">
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 13 }}>{s.metricLabel || s.metricKey}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: SCORE_COLOR(s.score) }}>{s.score} / 5</span>
                            </div>
                            <div className="eval-score-bar">
                              <div className="eval-score-fill" style={{ width: `${(s.score / 5) * 100}%`, background: SCORE_COLOR(s.score) }} />
                            </div>
                            {s.comment && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{s.comment}</p>}
                          </div>
                        ))}
                        {ev.overallComment && (
                          <div className="collab-eval-comment">
                            <span className="eyebrow">Comentário do avaliador</span>
                            <p>{ev.overallComment}</p>
                          </div>
                        )}
                        <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Avaliado por {ev.evaluatorName}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
