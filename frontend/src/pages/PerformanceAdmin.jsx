import { Fragment, useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import {
  getCycles,
  createCycle,
  updateCycle,
  deleteCycle,
  getEvaluations,
  createEvaluation,
  deleteEvaluation,
  getEmployees
} from "../api";

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

const CYCLE_STATUS_LABEL = { draft: "Rascunho", active: "Ativo", closed: "Encerrado" };
const CYCLE_STATUS_TONE = { draft: "muted", active: "green", closed: "rose" };

const DEFAULT_METRICS = [
  "Trabalho em Equipa",
  "Comunicação",
  "Qualidade do Trabalho",
  "Iniciativa",
  "Cumprimento de Prazos"
];

function toKey(label) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function emptyCycleForm() {
  return {
    name: "",
    startDate: "",
    endDate: "",
    metrics: DEFAULT_METRICS.map((label) => ({ label }))
  };
}

export function PerformanceAdmin({ session }) {
  const [tab, setTab] = useState("cycles");
  const [cycles, setCycles] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [cycleForm, setCycleForm] = useState(emptyCycleForm());
  const [evalCycleFilter, setEvalCycleFilter] = useState("");
  const [evalNameFilter, setEvalNameFilter] = useState("");
  const [allEmployees, setAllEmployees] = useState([]);
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [evalForm, setEvalForm] = useState({ cycleId: "", employeeId: "", scores: [], overallComment: "" });
  const [savingEval, setSavingEval] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [c, e, emps] = await Promise.all([
        getCycles(session.token),
        getEvaluations(session.token),
        getEmployees(session.token, { includeGestores: true })
      ]);
      setCycles(c);
      setEvaluations(e);
      setAllEmployees(emps.filter(emp => emp.status !== "inactive"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (cycles.length > 0 && !compCycleId) {
      const active = cycles.find(c => c.status === "active");
      setCompCycleId(active?._id || cycles[0]._id);
    }
  }, [cycles]);

  async function handleCreateCycle(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const payload = {
        name: cycleForm.name,
        startDate: cycleForm.startDate,
        endDate: cycleForm.endDate,
        metrics: cycleForm.metrics
          .filter((m) => m.label.trim())
          .map((m) => ({ key: toKey(m.label), label: m.label.trim() }))
      };
      await createCycle(session.token, payload);
      setShowForm(false);
      setCycleForm(emptyCycleForm());
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
    const evalCount = evaluations.filter((e) => e.cycle?._id === cycleId).length;
    const msg =
      evalCount > 0
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

  async function handleDeleteEval(evalId) {
    if (!window.confirm("Eliminar esta avaliação?")) return;
    try {
      setError("");
      await deleteEvaluation(session.token, evalId);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function addMetric() {
    setCycleForm((f) => ({ ...f, metrics: [...f.metrics, { label: "" }] }));
  }

  function removeMetric(idx) {
    setCycleForm((f) => ({
      ...f,
      metrics: f.metrics.filter((_, i) => i !== idx)
    }));
  }

  function setMetricLabel(idx, label) {
    setCycleForm((f) => ({
      ...f,
      metrics: f.metrics.map((m, i) => (i === idx ? { ...m, label } : m))
    }));
  }

  const [expandedEval, setExpandedEval] = useState(null);
  const [compCycleId, setCompCycleId] = useState("");
  const [compDeptFilter, setCompDeptFilter] = useState("");

  const selectedCycleForEval = cycles.find(c => c._id === evalForm.cycleId);

  function initEvalForm(cycleId) {
    const cycle = cycles.find(c => c._id === cycleId);
    const scores = cycle ? cycle.metrics.map(m => ({ metricKey: m.key, metricLabel: m.label, score: 3, comment: "" })) : [];
    setEvalForm(f => ({ ...f, cycleId, scores }));
  }

  async function handleCreateEval(e) {
    e.preventDefault();
    try {
      setSavingEval(true);
      setError("");
      await createEvaluation(session.token, {
        cycleId: evalForm.cycleId,
        employeeId: evalForm.employeeId,
        scores: evalForm.scores,
        overallComment: evalForm.overallComment
      });
      setShowEvalForm(false);
      setEvalForm({ cycleId: "", employeeId: "", scores: [], overallComment: "" });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEval(false);
    }
  }

  const filteredEvals = evaluations.filter(e => {
    if (evalCycleFilter && e.cycle?._id !== evalCycleFilter) return false;
    if (evalNameFilter && !e.employeeName?.toLowerCase().includes(evalNameFilter.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <section className="page stack-lg">
        <p style={{ color: "var(--text-muted)" }}>A carregar...</p>
      </section>
    );
  }

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Administrador · Avaliação de Desempenho</span>
          <h2>Ciclos de Avaliação</h2>
          <p>Crie ciclos, defina métricas e acompanhe as avaliações de toda a empresa.</p>
        </div>
        <div className="hero-score">
          <span>Ciclos</span>
          <strong>{cycles.length}</strong>
          <small>registados</small>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="perf-tabs">
        <button
          className={`perf-tab ${tab === "cycles" ? "is-active" : ""}`}
          onClick={() => setTab("cycles")}
        >
          Ciclos de Avaliação
        </button>
        <button
          className={`perf-tab ${tab === "evaluations" ? "is-active" : ""}`}
          onClick={() => setTab("evaluations")}
        >
          Todas as Avaliações
          {evaluations.length > 0 && (
            <span className="perf-tab-count">{evaluations.length}</span>
          )}
        </button>
        <button
          className={`perf-tab ${tab === "comparative" ? "is-active" : ""}`}
          onClick={() => setTab("comparative")}
        >
          Comparativo
        </button>
      </div>

      {tab === "cycles" && (
        <div className="stack-lg">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => { setShowForm((v) => !v); setCycleForm(emptyCycleForm()); setError(""); }}
            >
              {showForm ? "Cancelar" : "+ Novo Ciclo"}
            </button>
          </div>

          {showForm && (
            <form className="cycle-form-panel" onSubmit={handleCreateCycle}>
              <h3 style={{ margin: "0 0 16px" }}>Novo ciclo de avaliação</h3>

              <div className="cycle-form-grid">
                <div className="auth-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Nome do ciclo</label>
                  <input
                    type="text"
                    placeholder="Ex: Avaliação Anual 2026"
                    value={cycleForm.name}
                    onChange={(e) => setCycleForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="auth-field">
                  <label>Data de início</label>
                  <input
                    type="date"
                    value={cycleForm.startDate}
                    onChange={(e) => setCycleForm((f) => ({ ...f, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="auth-field">
                  <label>Data de fim</label>
                  <input
                    type="date"
                    value={cycleForm.endDate}
                    onChange={(e) => setCycleForm((f) => ({ ...f, endDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="metrics-editor">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <strong style={{ fontSize: 14 }}>Métricas de avaliação</strong>
                  <button type="button" className="ghost-button" style={{ padding: "4px 12px", fontSize: 13 }} onClick={addMetric}>
                    + Adicionar
                  </button>
                </div>
                {cycleForm.metrics.map((m, idx) => (
                  <div key={idx} className="metric-edit-row">
                    <input
                      type="text"
                      placeholder={`Métrica ${idx + 1}`}
                      value={m.label}
                      onChange={(e) => setMetricLabel(idx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="ghost-button"
                      style={{ padding: "4px 10px", color: "var(--rose)" }}
                      onClick={() => removeMetric(idx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" disabled={saving}>
                  {saving ? "A criar..." : "Criar ciclo"}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => { setShowForm(false); setCycleForm(emptyCycleForm()); }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {cycles.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum ciclo criado. Crie o primeiro ciclo de avaliação.</p>
            </div>
          ) : (
            <div className="cycle-list">
              {cycles.map((cycle) => {
                const evalCount = evaluations.filter((e) => e.cycle?._id === cycle._id).length;
                return (
                  <div key={cycle._id} className="cycle-card">
                    <div className="cycle-card-main">
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={`cycle-status-badge tone-${CYCLE_STATUS_TONE[cycle.status]}`}>
                            {CYCLE_STATUS_LABEL[cycle.status]}
                          </span>
                          {cycle.department && (
                            <span className="metric-chip" style={{ fontSize: 12 }}>{cycle.department}</span>
                          )}
                        </div>
                        <h3 style={{ margin: "6px 0 4px" }}>{cycle.name}</h3>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                          {new Date(cycle.startDate).toLocaleDateString("pt-PT")} —{" "}
                          {new Date(cycle.endDate).toLocaleDateString("pt-PT")}
                          {" · "}
                          {cycle.metrics.length} métrica(s)
                          {" · "}
                          {evalCount} avaliação(ões)
                        </p>
                      </div>
                      <div className="cycle-card-actions">
                        {cycle.status === "draft" && (
                          <button
                            className="ghost-button"
                            style={{ fontSize: 13 }}
                            onClick={() => handleStatusChange(cycle._id, "active")}
                          >
                            Ativar
                          </button>
                        )}
                        {cycle.status === "active" && (
                          <button
                            className="ghost-button"
                            style={{ fontSize: 13 }}
                            onClick={() => handleStatusChange(cycle._id, "closed")}
                          >
                            Encerrar
                          </button>
                        )}
                        {cycle.status === "closed" && (
                          <button
                            className="ghost-button"
                            style={{ fontSize: 13 }}
                            onClick={() => handleStatusChange(cycle._id, "active")}
                          >
                            Reabrir
                          </button>
                        )}
                        <button
                          className="ghost-button"
                          style={{ fontSize: 13, color: "var(--rose)" }}
                          onClick={() => handleDeleteCycle(cycle._id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    {cycle.metrics.length > 0 && (
                      <div className="cycle-metrics-preview">
                        {cycle.metrics.map((m) => (
                          <span key={m.key} className="metric-chip">{m.label}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "evaluations" && (
        <div className="stack-lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <input
                type="search"
                placeholder="Pesquisar por nome..."
                value={evalNameFilter}
                onChange={e => setEvalNameFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13, width: 200 }}
              />
              <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Ciclo:</label>
              <select
                value={evalCycleFilter}
                onChange={(e) => setEvalCycleFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}
              >
              <option value="">Todos os ciclos</option>
              {cycles.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            </div>
            <button onClick={() => { setShowEvalForm(v => !v); setEvalForm({ cycleId: "", employeeId: "", scores: [], overallComment: "" }); setError(""); }}>
              {showEvalForm ? "Cancelar" : "+ Nova avaliação"}
            </button>
          </div>

          {showEvalForm && (
            <form className="cycle-form-panel" onSubmit={handleCreateEval}>
              <h3 style={{ margin: "0 0 16px" }}>Nova avaliação</h3>
              <div className="cycle-form-grid">
                <div className="auth-field">
                  <label>Ciclo</label>
                  <select required value={evalForm.cycleId}
                    onChange={e => initEvalForm(e.target.value)}>
                    <option value="">Selecionar ciclo...</option>
                    {cycles.filter(c => c.status !== "closed").map(c => (
                      <option key={c._id} value={c._id}>{c.name} {c.status === "draft" ? "(rascunho)" : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="auth-field">
                  <label>Colaborador / Gestor avaliado</label>
                  <select required value={evalForm.employeeId}
                    onChange={e => setEvalForm(f => ({ ...f, employeeId: e.target.value }))}>
                    <option value="">Selecionar pessoa...</option>
                    {allEmployees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} {emp.jobTitle ? `— ${emp.jobTitle}` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>

              {evalForm.scores.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <strong style={{ fontSize: 14 }}>Métricas de {selectedCycleForEval?.name}</strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                    {evalForm.scores.map((s, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
                        <span style={{ fontSize: 14 }}>{s.metricLabel}</span>
                        <select
                          value={s.score}
                          style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13, width: 80 }}
                          onChange={e => setEvalForm(f => ({
                            ...f,
                            scores: f.scores.map((sc, idx) => idx === i ? { ...sc, score: Number(e.target.value) } : sc)
                          }))}>
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <input type="text" placeholder="Comentário (opcional)" value={s.comment}
                          style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}
                          onChange={e => setEvalForm(f => ({
                            ...f,
                            scores: f.scores.map((sc, idx) => idx === i ? { ...sc, comment: e.target.value } : sc)
                          }))} />
                      </div>
                    ))}
                  </div>
                  <div className="auth-field" style={{ marginTop: 14 }}>
                    <label>Comentário geral</label>
                    <textarea rows={2} value={evalForm.overallComment} placeholder="Observações gerais sobre o desempenho..."
                      onChange={e => setEvalForm(f => ({ ...f, overallComment: e.target.value }))} />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" disabled={savingEval || !evalForm.cycleId || !evalForm.employeeId}>
                  {savingEval ? "A guardar..." : "Guardar avaliação"}
                </button>
                <button type="button" className="ghost-button" onClick={() => setShowEvalForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {filteredEvals.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma avaliação registada{evalCycleFilter ? " neste ciclo" : ""}.</p>
            </div>
          ) : (
            <div className="eval-table-wrapper">
              <table className="eval-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Ciclo</th>
                    <th>Avaliador</th>
                    <th>Nota Final</th>
                    <th>Data</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvals.map((ev) => {
                    const isOpen = expandedEval === ev._id;
                    return (
                      <Fragment key={ev._id}>
                        <tr key={ev._id}>
                          <td><strong>{ev.employeeName}</strong></td>
                          <td>
                            <span>{ev.cycle?.name || "—"}</span>
                            {ev.cycle?.status && (
                              <span className={`cycle-status-badge tone-${CYCLE_STATUS_TONE[ev.cycle.status]}`} style={{ marginLeft: 8 }}>
                                {CYCLE_STATUS_LABEL[ev.cycle.status]}
                              </span>
                            )}
                          </td>
                          <td style={{ color: "var(--text-muted)" }}>{ev.evaluatorName}</td>
                          <td>
                            {ev.finalScore != null ? (
                              <span className="score-pill">{ev.finalScore.toFixed(1)} / 5</span>
                            ) : "—"}
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                            {new Date(ev.createdAt).toLocaleDateString("pt-PT")}
                          </td>
                          <td style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {ev.scores?.length > 0 && (
                              <button
                                className="ghost-button"
                                style={{ padding: "4px 10px", fontSize: 12 }}
                                onClick={() => setExpandedEval(isOpen ? null : ev._id)}
                              >
                                {isOpen ? "Fechar" : "Ver detalhes"}
                              </button>
                            )}
                            <button
                              className="ghost-button"
                              style={{ padding: "4px 10px", fontSize: 12, color: "var(--rose)" }}
                              onClick={() => handleDeleteEval(ev._id)}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr key={`${ev._id}-detail`}>
                            <td colSpan={6} style={{ background: "var(--surface-strong)", padding: "12px 16px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <strong style={{ fontSize: 13, marginBottom: 4 }}>Avaliação detalhada por {ev.evaluatorName}</strong>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                                  {ev.scores.map((s, i) => (
                                    <div key={i} style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "10px 14px", border: "1px solid var(--line)" }}>
                                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{s.metricLabel || s.metricKey}</div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <strong style={{ fontSize: 20, color: "var(--primary)" }}>{s.score}</strong>
                                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>/ 5</span>
                                        <div style={{ flex: 1, height: 6, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                                          <div style={{ width: `${(s.score / 5) * 100}%`, height: "100%", background: s.score >= 4 ? "var(--success)" : s.score >= 3 ? "var(--primary)" : "var(--warning)", borderRadius: 4 }} />
                                        </div>
                                      </div>
                                      {s.comment && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0", fontStyle: "italic" }}>"{s.comment}"</p>}
                                    </div>
                                  ))}
                                </div>
                                {ev.overallComment && (
                                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0", fontStyle: "italic" }}>
                                    Comentário geral: "{ev.overallComment}"
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {tab === "comparative" && (() => {
        const depts = [...new Set(allEmployees.map(e => e.department).filter(Boolean))].sort();
        const compData = evaluations
          .filter(e => {
            if (e.cycle?._id !== compCycleId || e.finalScore == null) return false;
            if (compDeptFilter) {
              const emp = allEmployees.find(em => String(em._id) === String(e.employee));
              return emp?.department === compDeptFilter;
            }
            return true;
          })
          .sort((a, b) => b.finalScore - a.finalScore)
          .map(e => ({ name: e.employeeName, score: e.finalScore }));

        const selectedCycleName = cycles.find(c => c._id === compCycleId)?.name || "";

        return (
          <div className="stack-lg">
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Ciclo:</label>
                <select value={compCycleId} onChange={e => setCompCycleId(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}>
                  {cycles.filter(c => !c.department).length > 0 && (
                    <optgroup label="Globais">
                      {cycles.filter(c => !c.department).map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {cycles.filter(c => c.department).length > 0 && (
                    <optgroup label="Por departamento">
                      {cycles.filter(c => c.department).map(c => (
                        <option key={c._id} value={c._id}>{c.department} — {c.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              {depts.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Departamento:</label>
                  <select value={compDeptFilter} onChange={e => setCompDeptFilter(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}>
                    <option value="">Todos</option>
                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
            </div>

            {compData.length === 0 ? (
              <div className="empty-state">
                <strong>Sem avaliações</strong>
                <p>{selectedCycleName ? `Não há avaliações com nota em "${selectedCycleName}"${compDeptFilter ? ` para o departamento "${compDeptFilter}"` : ""}.` : "Selecione um ciclo."}</p>
              </div>
            ) : (
              <article className="insight-panel">
                <div className="section-title">
                  <div>
                    <span className="eyebrow">Comparativo</span>
                    <h3>{selectedCycleName}</h3>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{compData.length} avaliados</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(200, compData.length * 42)} style={{ marginTop: 16 }}>
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
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#22c55e", display: "inline-block" }} /> ≥ 4.0 — Bom / Excelente</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#3b82f6", display: "inline-block" }} /> 3.0–3.9 — Satisfatório</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#f43f5e", display: "inline-block" }} /> &lt; 3.0 — A melhorar</span>
                </div>
              </article>
            )}
          </div>
        );
      })()}
    </section>
  );
}
