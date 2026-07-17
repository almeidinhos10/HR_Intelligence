import { useEffect, useState } from "react";
import { getLeaves, reviewLeave, deleteLeave, getBlockedPeriods, createBlockedPeriod, deleteBlockedPeriod } from "../api";

const TYPE_LABEL = { vacation: "Férias", sick: "Baixa médica", other: "Outro" };
const STATUS_LABEL = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado" };
const STATUS_COLOR = { pending: "var(--warning)", approved: "var(--success)", rejected: "var(--rose)" };
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAY_NAMES = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function MiniCalendar({ leaves, blockedPeriods, year, month }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  const COLORS = ["var(--primary)", "var(--success)", "var(--warning)", "#8b5cf6", "#06b6d4", "var(--rose)"];
  const nameColorMap = {};
  let colorIdx = 0;
  leaves.forEach(l => { if (!nameColorMap[l.employeeName]) nameColorMap[l.employeeName] = COLORS[colorIdx++ % COLORS.length]; });

  return (
    <div className="mini-calendar">
      <div className="mini-cal-grid mini-cal-header">
        {DAY_NAMES.map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="mini-cal-grid">
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />;
          const date = new Date(year, month, day);
          const onLeave = leaves.filter(l => new Date(l.startDate) <= date && new Date(l.endDate) >= date);
          const blocked = blockedPeriods.some(b => new Date(b.startDate) <= date && new Date(b.endDate) >= date);
          const isWeekend = date.getDay() % 6 === 0;
          return (
            <div key={day} className={`mini-cal-day ${isWeekend ? "is-weekend" : ""} ${blocked ? "is-blocked" : ""}`}>
              <span className="mini-cal-num">{day}</span>
              <div className="mini-cal-dots">
                {onLeave.map((l, idx) => (
                  <span key={idx} title={l.employeeName} style={{ background: nameColorMap[l.employeeName] }} className="mini-cal-dot" />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LeavesAdmin({ session }) {
  const [tab, setTab] = useState("requests");
  const [leaves, setLeaves] = useState([]);
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [blockForm, setBlockForm] = useState({ name: "", startDate: "", endDate: "" });
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [l, bp] = await Promise.all([getLeaves(session.token), getBlockedPeriods(session.token)]);
      setLeaves(l);
      setBlockedPeriods(bp);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

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
    if (!window.confirm("Eliminar este pedido?")) return;
    try {
      await deleteLeave(session.token, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateBlock(e) {
    e.preventDefault();
    try {
      setSavingBlock(true);
      await createBlockedPeriod(session.token, blockForm);
      setBlockForm({ name: "", startDate: "", endDate: "" });
      setShowBlockForm(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingBlock(false);
    }
  }

  async function handleDeleteBlock(id) {
    if (!window.confirm("Eliminar período bloqueado?")) return;
    try {
      await deleteBlockedPeriod(session.token, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const gestorLeaves = leaves.filter(l => l.employeeRole === "gestor");
  const pendingGestores = gestorLeaves.filter(l => l.status === "pending");
  const filtered = statusFilter ? leaves.filter(l => l.status === statusFilter) : leaves;
  const approvedLeaves = leaves.filter(l => l.status === "approved");

  if (loading) return <section className="page stack-lg"><p style={{ color: "var(--text-muted)" }}>A carregar...</p></section>;

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Férias e Ausências</span>
          <h2>Férias e Ausências</h2>
          <p>Gestão global de pedidos, aprovação de gestores e períodos bloqueados.</p>
        </div>
        <div className="hero-score">
          <span>Pendentes</span>
          <strong>{leaves.filter(l => l.status === "pending").length}</strong>
          <small>por aprovar</small>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="perf-tabs">
        <button className={`perf-tab ${tab === "requests" ? "is-active" : ""}`} onClick={() => setTab("requests")}>
          Todos os pedidos
          {leaves.filter(l => l.status === "pending").length > 0 && (
            <span className="perf-tab-count" style={{ background: "var(--warning)" }}>
              {leaves.filter(l => l.status === "pending").length}
            </span>
          )}
        </button>
        <button className={`perf-tab ${tab === "calendar" ? "is-active" : ""}`} onClick={() => setTab("calendar")}>
          Calendário global
        </button>
        <button className={`perf-tab ${tab === "blocked" ? "is-active" : ""}`} onClick={() => setTab("blocked")}>
          Períodos bloqueados
          {blockedPeriods.length > 0 && <span className="perf-tab-count">{blockedPeriods.length}</span>}
        </button>
      </div>

      {tab === "requests" && (
        <div className="stack-lg">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Filtrar:</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}>
              <option value="">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovados</option>
              <option value="rejected">Rejeitados</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state"><p>Sem pedidos{statusFilter ? ` com estado "${STATUS_LABEL[statusFilter]}"` : ""}.</p></div>
          ) : (
            <div className="leave-list">
              {filtered.map(l => {
                const isGestor = l.employeeRole === "gestor";
                const canReview = isGestor && l.status === "pending";
                return (
                  <div key={l._id} className="leave-card">
                    <div className="leave-card-header">
                      <div>
                        <strong>{l.employeeName}</strong>
                        {isGestor && <span style={{ fontSize: 11, background: "var(--primary)", color: "#fff", borderRadius: 4, padding: "1px 6px", marginLeft: 8 }}>Gestor</span>}
                        <span className="leave-type-badge" style={{ marginLeft: 8 }}>{TYPE_LABEL[l.type]}</span>
                        <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>
                          {new Date(l.startDate).toLocaleDateString("pt-PT")} — {new Date(l.endDate).toLocaleDateString("pt-PT")} · {l.workingDays} dia(s)
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLOR[l.status] }}>{STATUS_LABEL[l.status]}</span>
                        {canReview && (
                          <>
                            <button className="ghost-button" style={{ fontSize: 13, color: "var(--success)" }} onClick={() => handleReview(l._id, "approved")}>Aprovar</button>
                            {rejectId === l._id ? (
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <input type="text" placeholder="Motivo..." value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                  style={{ padding: "4px 8px", fontSize: 12, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)" }} />
                                <button className="ghost-button" style={{ fontSize: 13, color: "var(--rose)" }} onClick={() => handleReview(l._id, "rejected")}>Confirmar</button>
                                <button className="ghost-button" style={{ fontSize: 12 }} onClick={() => setRejectId(null)}>✕</button>
                              </div>
                            ) : (
                              <button className="ghost-button" style={{ fontSize: 13, color: "var(--rose)" }} onClick={() => { setRejectId(l._id); setRejectReason(""); }}>Rejeitar</button>
                            )}
                          </>
                        )}
                        <button className="ghost-button" style={{ fontSize: 12, color: "var(--rose)" }} onClick={() => handleDelete(l._id)}>Eliminar</button>
                      </div>
                    </div>
                    {l.reason && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 0" }}>{l.reason}</p>}
                    {l.status === "rejected" && l.rejectionReason && (
                      <p style={{ fontSize: 13, color: "var(--rose)", margin: "6px 0 0" }}>Motivo: {l.rejectionReason}</p>
                    )}
                    {l.status !== "pending" && l.reviewedBy && (
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                        {l.status === "approved" ? "Aprovado" : "Rejeitado"} por {l.reviewedBy} · {new Date(l.reviewedAt).toLocaleDateString("pt-PT")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "calendar" && (
        <div className="stack-lg">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="ghost-button" style={{ padding: "4px 10px" }}
              onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>‹</button>
            <strong style={{ minWidth: 160, textAlign: "center" }}>{MONTH_NAMES[calMonth]} {calYear}</strong>
            <button className="ghost-button" style={{ padding: "4px 10px" }}
              onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>›</button>
          </div>
          <MiniCalendar leaves={approvedLeaves} blockedPeriods={blockedPeriods} year={calYear} month={calMonth} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {[...new Set(approvedLeaves.map(l => l.employeeName))].map((name, i) => {
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

      {tab === "blocked" && (
        <div className="stack-lg">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setShowBlockForm(v => !v)}>
              {showBlockForm ? "Cancelar" : "+ Novo período bloqueado"}
            </button>
          </div>

          {showBlockForm && (
            <form className="cycle-form-panel" onSubmit={handleCreateBlock}>
              <h3 style={{ margin: "0 0 16px" }}>Novo período bloqueado</h3>
              <div className="cycle-form-grid">
                <div className="auth-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Nome</label>
                  <input type="text" required placeholder="Ex: Fecho de balanço anual"
                    value={blockForm.name} onChange={e => setBlockForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Data de início</label>
                  <input type="date" required value={blockForm.startDate} onChange={e => setBlockForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Data de fim</label>
                  <input type="date" required value={blockForm.endDate} min={blockForm.startDate} onChange={e => setBlockForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" disabled={savingBlock}>{savingBlock ? "A guardar..." : "Criar período"}</button>
                <button type="button" className="ghost-button" onClick={() => setShowBlockForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {blockedPeriods.length === 0 ? (
            <div className="empty-state"><p>Nenhum período bloqueado definido.</p></div>
          ) : (
            <div className="leave-list">
              {blockedPeriods.map(bp => (
                <div key={bp._id} className="leave-card">
                  <div className="leave-card-header">
                    <div>
                      <strong>{bp.name}</strong>
                      <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 10 }}>
                        {new Date(bp.startDate).toLocaleDateString("pt-PT")} — {new Date(bp.endDate).toLocaleDateString("pt-PT")}
                      </span>
                    </div>
                    <button className="ghost-button" style={{ fontSize: 12, color: "var(--rose)" }} onClick={() => handleDeleteBlock(bp._id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
