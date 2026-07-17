import { useEffect, useState } from "react";
import { getLeaves, createLeave, deleteLeave, getLeaveBalance } from "../api";

const TYPE_LABEL = { vacation: "Férias", sick: "Baixa médica", other: "Outro" };
const STATUS_LABEL = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado" };
const STATUS_COLOR = { pending: "var(--warning)", approved: "var(--success)", rejected: "var(--rose)" };

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

export function LeavesColaborador({ session }) {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState([]);
  const [historyYear, setHistoryYear] = useState(String(new Date().getFullYear()));

  const firstName = session.user.name.split(" ")[0];
  const year = new Date().getFullYear();
  const previewDays = countWorkingDays(form.startDate, form.endDate);

  async function loadData() {
    try {
      setLoading(true);
      const [l, b] = await Promise.all([
        getLeaves(session.token),
        getLeaveBalance(session.token, year)
      ]);
      setLeaves(l);
      setBalance(b);
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

  async function handleDelete(id) {
    if (!window.confirm("Cancelar este pedido?")) return;
    try {
      await deleteLeave(session.token, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeLeaves = leaves.filter(l =>
    l.status === "pending" || (l.status === "approved" && new Date(l.endDate) >= today)
  );
  const allHistoryLeaves = leaves.filter(l =>
    l.status === "rejected" || (l.status === "approved" && new Date(l.endDate) < today)
  );
  const historyYears = [...new Set(allHistoryLeaves.map(l => String(new Date(l.startDate).getFullYear())))].sort((a, b) => b - a);
  const historyLeaves = historyYear
    ? allHistoryLeaves.filter(l => String(new Date(l.startDate).getFullYear()) === historyYear)
    : allHistoryLeaves;

  if (loading) return <section className="page stack-lg"><p style={{ color: "var(--text-muted)" }}>A carregar...</p></section>;

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Colaborador · Férias e Ausências</span>
          <h2>Olá, {firstName}.</h2>
          <p>Consulte o seu saldo de férias e submeta pedidos de ausência.</p>
        </div>
        {balance && (
          <div className="hero-score">
            <span>Saldo {year}</span>
            <strong style={{ color: balance.remainingDays > 5 ? "var(--success)" : "var(--warning)" }}>
              {balance.remainingDays}
            </strong>
            <small>de {balance.totalDays} dias disponíveis</small>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {conflicts.length > 0 && (
        <div className="alert-warning">
          <strong>Pedido submetido com conflitos de equipa:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {conflicts.map((c, i) => (
              <li key={i} style={{ fontSize: 13 }}>
                {c.employeeName} — {new Date(c.startDate).toLocaleDateString("pt-PT")} a {new Date(c.endDate).toLocaleDateString("pt-PT")} ({c.status === "approved" ? "aprovado" : "pendente"})
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
            <div style={{
              height: "100%",
              width: `${Math.min((balance.usedDays / balance.totalDays) * 100, 100)}%`,
              background: balance.remainingDays > 5 ? "var(--success)" : "var(--warning)",
              borderRadius: 4,
              transition: "width 0.3s"
            }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => { setShowForm(v => !v); setForm(emptyForm); setError(""); setConflicts([]); }}>
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
              <input type="date" required value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="auth-field">
              <label>Data de fim</label>
              <input type="date" required value={form.endDate}
                min={form.startDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="auth-field" style={{ gridColumn: "1 / -1" }}>
              <label>Motivo (opcional)</label>
              <input type="text" value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Descrição breve..." />
            </div>
          </div>

          {previewDays > 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0" }}>
              {previewDays} dia(s) útil(eis) selecionado(s)
              {balance && form.type === "vacation" && (
                <span style={{ color: previewDays > balance.remainingDays ? "var(--rose)" : "var(--success)", marginLeft: 8 }}>
                  {previewDays > balance.remainingDays ? `(excede o saldo disponível de ${balance.remainingDays} dias)` : `(saldo restante: ${balance.remainingDays - previewDays} dias)`}
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

      {leaves.length === 0 ? (
        <div className="empty-state">
          <strong>Sem pedidos</strong>
          <p>Ainda não submeteu nenhum pedido de ausência.</p>
        </div>
      ) : (
        <div className="stack-lg">
          {activeLeaves.length > 0 && (
            <>
              <span className="eyebrow">Pedidos ativos</span>
              <div className="leave-list">
                {activeLeaves.map(l => (
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
                        <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLOR[l.status] }}>
                          {STATUS_LABEL[l.status]}
                        </span>
                        {l.status === "pending" && (
                          <button className="ghost-button" style={{ fontSize: 12, color: "var(--rose)" }}
                            onClick={() => handleDelete(l._id)}>
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                    {l.reason && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 0" }}>{l.reason}</p>}
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

          {allHistoryLeaves.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: activeLeaves.length > 0 ? 8 : 0 }}>
                <span className="eyebrow">Histórico</span>
                {historyYears.length > 1 && (
                  <select value={historyYear} onChange={e => setHistoryYear(e.target.value)}
                    style={{ padding: "4px 10px", fontSize: 13, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)" }}>
                    {historyYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                )}
              </div>
              {historyLeaves.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sem registos em {historyYear}.</p>
              ) : (
                <div className="leave-list">
                  {historyLeaves.map(l => (
                    <div key={l._id} className="leave-card" style={{ opacity: 0.8 }}>
                      <div className="leave-card-header">
                        <div>
                          <span className="leave-type-badge">{TYPE_LABEL[l.type]}</span>
                          <strong style={{ marginLeft: 10 }}>
                            {new Date(l.startDate).toLocaleDateString("pt-PT")} — {new Date(l.endDate).toLocaleDateString("pt-PT")}
                          </strong>
                          <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>{l.workingDays} dia(s)</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLOR[l.status] }}>
                          {STATUS_LABEL[l.status]}
                        </span>
                      </div>
                      {l.status === "rejected" && l.rejectionReason && (
                        <p style={{ fontSize: 13, color: "var(--rose)", margin: "6px 0 0" }}>
                          Motivo de rejeição: {l.rejectionReason}
                        </p>
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
    </section>
  );
}
