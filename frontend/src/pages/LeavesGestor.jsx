import { useEffect, useState } from "react";
import { getLeaves, createLeave, deleteLeave, reviewLeave, getLeaveBalance, getBlockedPeriods } from "../api";

const TYPE_LABEL = { vacation: "Férias", sick: "Baixa médica", other: "Outro" };
const STATUS_LABEL = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado" };
const STATUS_COLOR = { pending: "var(--warning)", approved: "var(--success)", rejected: "var(--rose)" };
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAY_NAMES = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const emptyForm = { type: "vacation", startDate: "", endDate: "", reason: "" };

function countWorkingDays(start, end) {
  if (!start || !end) return 0;
  let count = 0;
  const cur = new Date(start);
  const last = new Date(end);
  if (last < cur) return 0;
  while (cur <= last) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function MiniCalendar({ leaves, blockedPeriods, year, month }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  function getEventsForDay(day) {
    const date = new Date(year, month, day);
    const onLeave = leaves.filter(l => l.status === "approved" && new Date(l.startDate) <= date && new Date(l.endDate) >= date);
    const blocked = blockedPeriods.some(b => new Date(b.startDate) <= date && new Date(b.endDate) >= date);
    return { onLeave, blocked };
  }

  const COLORS = ["var(--primary)", "var(--success)", "var(--warning)", "#8b5cf6", "#06b6d4", "var(--rose)"];
  const nameColorMap = {};
  let colorIdx = 0;
  leaves.filter(l => l.status === "approved").forEach(l => {
    if (!nameColorMap[l.employeeName]) nameColorMap[l.employeeName] = COLORS[colorIdx++ % COLORS.length];
  });

  return (
    <div className="mini-calendar">
      <div className="mini-cal-grid mini-cal-header">
        {DAY_NAMES.map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="mini-cal-grid">
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />;
          const { onLeave, blocked } = getEventsForDay(day);
          const isWeekend = new Date(year, month, day).getDay() % 6 === 0;
          return (
            <div key={day} className={`mini-cal-day ${isWeekend ? "is-weekend" : ""} ${blocked ? "is-blocked" : ""}`}>
              <span className="mini-cal-num">{day}</span>
              <div className="mini-cal-dots">
                {onLeave.map((l, idx) => (
                  <span key={idx} title={l.employeeName}
                    style={{ background: nameColorMap[l.employeeName] || "var(--primary)" }}
                    className="mini-cal-dot" />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LeavesGestor({ session }) {
  const [tab, setTab] = useState("mine");
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState([]);
  const [historyYear, setHistoryYear] = useState(String(new Date().getFullYear()));
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const year = new Date().getFullYear();
  const previewDays = countWorkingDays(form.startDate, form.endDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const myLeaves = leaves.filter(l => l.employeeRole === "gestor");
  const myActiveLeaves = myLeaves.filter(l =>
    l.status === "pending" || (l.status === "approved" && new Date(l.endDate) >= today)
  );
  const allMyHistoryLeaves = myLeaves.filter(l =>
    l.status === "rejected" || (l.status === "approved" && new Date(l.endDate) < today)
  );
  const myHistoryYears = [...new Set(allMyHistoryLeaves.map(l => String(new Date(l.startDate).getFullYear())))].sort((a, b) => b - a);
  const myHistoryLeaves = historyYear
    ? allMyHistoryLeaves.filter(l => String(new Date(l.startDate).getFullYear()) === historyYear)
    : allMyHistoryLeaves;
  const teamLeaves = leaves.filter(l => l.employeeRole === "colaborador");
  const pendingTeam = teamLeaves.filter(l => l.status === "pending");

  async function loadData() {
    try {
      setLoading(true);
      const [l, b, bp] = await Promise.all([
        getLeaves(session.token),
        getLeaveBalance(session.token, year),
        getBlockedPeriods(session.token)
      ]);
      setLeaves(l);
      setBalance(b);
      setBlockedPeriods(bp);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setConflicts([]);
      const result = await createLeave(session.token, form);
      if (result.conflicts?.length > 0) setConflicts(result.conflicts);
      setShowForm(false);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(id, status) {
    try {
      setError("");
      await reviewLeave(session.token, id, { status, rejectionReason: status === "rejected" ? rejectReason : "" });
      setRejectId(null);
      setRejectReason("");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Cancelar este pedido?")) return;
    try {
      await deleteLeave(session.token, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <section className="page stack-lg"><p style={{ color: "var(--text-muted)" }}>A carregar...</p></section>;

  const approvedTeamLeaves = teamLeaves.filter(l => l.status === "approved");

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Gestor · Férias e Ausências</span>
          <h2>Férias e Ausências</h2>
          <p>Gira os pedidos da sua equipa e acompanhe o seu próprio saldo.</p>
        </div>
        {balance && (
          <div className="hero-score">
            <span>O meu saldo {year}</span>
            <strong style={{ color: balance.remainingDays > 5 ? "var(--success)" : "var(--warning)" }}>
              {balance.remainingDays}
            </strong>
            <small>de {balance.totalDays} dias disponíveis</small>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="perf-tabs">
        <button className={`perf-tab ${tab === "mine" ? "is-active" : ""}`} onClick={() => setTab("mine")}>
          Os meus pedidos
          {myLeaves.filter(l => l.status === "pending").length > 0 && (
            <span className="perf-tab-count" style={{ background: "var(--warning)" }}>
              {myLeaves.filter(l => l.status === "pending").length}
            </span>
          )}
        </button>
        <button className={`perf-tab ${tab === "team" ? "is-active" : ""}`} onClick={() => setTab("team")}>
          Equipa
          {pendingTeam.length > 0 && (
            <span className="perf-tab-count" style={{ background: "var(--warning)" }}>{pendingTeam.length}</span>
          )}
        </button>
        <button className={`perf-tab ${tab === "calendar" ? "is-active" : ""}`} onClick={() => setTab("calendar")}>
          Calendário
        </button>
      </div>

      {tab === "mine" && (
        <div className="stack-lg">
          {conflicts.length > 0 && (
            <div className="alert-warning">
              <strong>Pedido submetido com conflitos de equipa:</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {conflicts.map((c, i) => (
                  <li key={i} style={{ fontSize: 13 }}>
                    {c.employeeName} — {new Date(c.startDate).toLocaleDateString("pt-PT")} a {new Date(c.endDate).toLocaleDateString("pt-PT")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {balance && balance.totalDays > 0 && (
            <div className="leave-balance-bar">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: "var(--text-muted)" }}>Dias utilizados: <strong>{balance.usedDays}</strong></span>
                <span style={{ color: "var(--text-muted)" }}>Disponíveis: <strong>{balance.remainingDays}</strong></span>
              </div>
              <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min((balance.usedDays / balance.totalDays) * 100, 100)}%`, background: balance.remainingDays > 5 ? "var(--success)" : "var(--warning)", borderRadius: 4 }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => { setShowForm(v => !v); setForm(emptyForm); setError(""); }}>
              {showForm ? "Cancelar" : "+ Novo pedido"}
            </button>
          </div>

          {showForm && (
            <form className="cycle-form-panel" onSubmit={handleSubmit}>
              <h3 style={{ margin: "0 0 16px" }}>Novo pedido de ausência</h3>
              <div className="cycle-form-grid">
                <div className="auth-field">
                  <label>Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="vacation">Férias</option>
                    <option value="sick">Baixa médica</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label>Data de início</label>
                  <input type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Data de fim</label>
                  <input type="date" required value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div className="auth-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Motivo (opcional)</label>
                  <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Descrição breve..." />
                </div>
              </div>
              {previewDays > 0 && (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0" }}>
                  {previewDays} dia(s) útil(eis)
                  {balance && form.type === "vacation" && (
                    <span style={{ color: previewDays > balance.remainingDays ? "var(--rose)" : "var(--success)", marginLeft: 8 }}>
                      {previewDays > balance.remainingDays ? `(excede o saldo de ${balance.remainingDays} dias)` : `(saldo restante: ${balance.remainingDays - previewDays} dias)`}
                    </span>
                  )}
                </p>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" disabled={saving}>{saving ? "A submeter..." : "Submeter pedido"}</button>
                <button type="button" className="ghost-button" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {myLeaves.length === 0 ? (
            <div className="empty-state"><p>Ainda não submeteu nenhum pedido.</p></div>
          ) : (
            <div className="stack-lg">
              {myActiveLeaves.length > 0 && (
                <>
                  <span className="eyebrow">Pedidos ativos</span>
                  <div className="leave-list">
                    {myActiveLeaves.map(l => (
                      <div key={l._id} className="leave-card">
                        <div className="leave-card-header">
                          <div>
                            <span className="leave-type-badge">{TYPE_LABEL[l.type]}</span>
                            <strong style={{ marginLeft: 10 }}>
                              {new Date(l.startDate).toLocaleDateString("pt-PT")} — {new Date(l.endDate).toLocaleDateString("pt-PT")}
                            </strong>
                            <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>{l.workingDays} dia(s)</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLOR[l.status] }}>{STATUS_LABEL[l.status]}</span>
                            {l.status === "pending" && (
                              <button className="ghost-button" style={{ fontSize: 12, color: "var(--rose)" }} onClick={() => handleDelete(l._id)}>Cancelar</button>
                            )}
                          </div>
                        </div>
                        {l.status !== "pending" && l.reviewedBy && (
                          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                            Aprovado por {l.reviewedBy} · {new Date(l.reviewedAt).toLocaleDateString("pt-PT")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {allMyHistoryLeaves.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: myActiveLeaves.length > 0 ? 8 : 0 }}>
                    <span className="eyebrow">Histórico</span>
                    {myHistoryYears.length > 1 && (
                      <select value={historyYear} onChange={e => setHistoryYear(e.target.value)}
                        style={{ padding: "4px 10px", fontSize: 13, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)" }}>
                        {myHistoryYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    )}
                  </div>
                  {myHistoryLeaves.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sem registos em {historyYear}.</p>
                  ) : (
                    <div className="leave-list">
                      {myHistoryLeaves.map(l => (
                        <div key={l._id} className="leave-card" style={{ opacity: 0.8 }}>
                          <div className="leave-card-header">
                            <div>
                              <span className="leave-type-badge">{TYPE_LABEL[l.type]}</span>
                              <strong style={{ marginLeft: 10 }}>
                                {new Date(l.startDate).toLocaleDateString("pt-PT")} — {new Date(l.endDate).toLocaleDateString("pt-PT")}
                              </strong>
                              <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>{l.workingDays} dia(s)</span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLOR[l.status] }}>{STATUS_LABEL[l.status]}</span>
                          </div>
                          {l.status === "rejected" && l.rejectionReason && (
                            <p style={{ fontSize: 13, color: "var(--rose)", margin: "6px 0 0" }}>Motivo: {l.rejectionReason}</p>
                          )}
                          {l.reviewedBy && (
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                              {l.status === "approved" ? "Aprovado" : "Rejeitado"} por {l.reviewedBy} · {new Date(l.reviewedAt).toLocaleDateString("pt-PT")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "team" && (
        <div className="stack-lg">
          {pendingTeam.length === 0 && teamLeaves.filter(l => l.status !== "pending").length === 0 ? (
            <div className="empty-state"><p>A sua equipa ainda não submeteu pedidos.</p></div>
          ) : (
            <>
              {pendingTeam.length > 0 && (
                <>
                  <span className="eyebrow">Pedidos pendentes</span>
                  <div className="leave-list">
                    {pendingTeam.map(l => (
                      <div key={l._id} className="leave-card">
                        <div className="leave-card-header">
                          <div>
                            <strong>{l.employeeName}</strong>
                            <span className="leave-type-badge" style={{ marginLeft: 10 }}>{TYPE_LABEL[l.type]}</span>
                            <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>
                              {new Date(l.startDate).toLocaleDateString("pt-PT")} — {new Date(l.endDate).toLocaleDateString("pt-PT")} · {l.workingDays} dia(s)
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="ghost-button" style={{ fontSize: 13, color: "var(--success)" }}
                              onClick={() => handleReview(l._id, "approved")}>
                              Aprovar
                            </button>
                            {rejectId === l._id ? (
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <input type="text" placeholder="Motivo..." value={rejectReason}
                                  onChange={e => setRejectReason(e.target.value)}
                                  style={{ padding: "4px 8px", fontSize: 12, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)" }} />
                                <button className="ghost-button" style={{ fontSize: 13, color: "var(--rose)" }}
                                  onClick={() => handleReview(l._id, "rejected")}>
                                  Confirmar
                                </button>
                                <button className="ghost-button" style={{ fontSize: 12 }} onClick={() => setRejectId(null)}>✕</button>
                              </div>
                            ) : (
                              <button className="ghost-button" style={{ fontSize: 13, color: "var(--rose)" }}
                                onClick={() => { setRejectId(l._id); setRejectReason(""); }}>
                                Rejeitar
                              </button>
                            )}
                          </div>
                        </div>
                        {l.reason && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 0" }}>{l.reason}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {teamLeaves.filter(l => l.status !== "pending").length > 0 && (
                <>
                  <span className="eyebrow" style={{ marginTop: 8 }}>Histórico da equipa</span>
                  <div className="leave-list">
                    {teamLeaves.filter(l => l.status !== "pending").map(l => (
                      <div key={l._id} className="leave-card">
                        <div className="leave-card-header">
                          <div>
                            <strong>{l.employeeName}</strong>
                            <span className="leave-type-badge" style={{ marginLeft: 10 }}>{TYPE_LABEL[l.type]}</span>
                            <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>
                              {new Date(l.startDate).toLocaleDateString("pt-PT")} — {new Date(l.endDate).toLocaleDateString("pt-PT")} · {l.workingDays} dia(s)
                            </span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLOR[l.status] }}>{STATUS_LABEL[l.status]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {tab === "calendar" && (
        <div className="stack-lg">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="ghost-button" style={{ padding: "4px 10px" }}
              onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>
              ‹
            </button>
            <strong style={{ minWidth: 160, textAlign: "center" }}>{MONTH_NAMES[calMonth]} {calYear}</strong>
            <button className="ghost-button" style={{ padding: "4px 10px" }}
              onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>
              ›
            </button>
          </div>
          <MiniCalendar leaves={[...approvedTeamLeaves, ...myLeaves.filter(l => l.status === "approved")]} blockedPeriods={blockedPeriods} year={calYear} month={calMonth} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {Object.entries(
              [...approvedTeamLeaves, ...myLeaves.filter(l => l.status === "approved")].reduce((acc, l) => {
                if (!acc[l.employeeName]) acc[l.employeeName] = true;
                return acc;
              }, {})
            ).map(([name], i) => {
              const COLORS = ["var(--primary)", "var(--success)", "var(--warning)", "#8b5cf6", "#06b6d4", "var(--rose)"];
              return (
                <span key={name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length], display: "inline-block" }} />
                  {name}
                </span>
              );
            })}
            {blockedPeriods.length > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--rose)", opacity: 0.4, display: "inline-block" }} />
                Período bloqueado
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
