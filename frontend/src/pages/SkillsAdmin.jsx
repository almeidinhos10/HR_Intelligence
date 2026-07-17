import { useEffect, useState, useMemo } from "react";
import { getEmployees, getTrainings, createTraining, updateTraining, deleteTraining } from "../api";

const LEVEL_ORDER = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
const LEVEL_LABEL = { beginner: "Iniciante", intermediate: "Intermédio", advanced: "Avançado", expert: "Especialista" };
const LEVEL_COLOR = { beginner: "var(--warning)", intermediate: "var(--primary)", advanced: "var(--success)", expert: "var(--success)" };

const TYPE_LABEL = { completed: "Realizada", planned: "Planeada" };
const TYPE_TONE = { completed: "green", planned: "muted" };

const emptyForm = {
  title: "", provider: "", category: "", type: "planned",
  date: "", duration: "", description: "", employees: []
};

export function SkillsAdmin({ session }) {
  const [tab, setTab] = useState("matrix");
  const [employees, setEmployees] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterType, setFilterType] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const [emps, trains] = await Promise.all([
        getEmployees(session.token),
        getTrainings(session.token)
      ]);
      setEmployees(emps.filter(e => e.status === "active"));
      setTrainings(trains);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Matriz: extrair todas as skills únicas
  const allSkills = useMemo(() => {
    const set = new Set();
    employees.forEach(e => (e.skills || []).forEach(s => s.name && set.add(s.name)));
    return [...set].sort();
  }, [employees]);

  function getSkillLevel(employee, skillName) {
    return employee.skills?.find(s => s.name === skillName)?.level || null;
  }

  const filteredTrainings = filterType ? trainings.filter(t => t.type === filterType) : trainings;

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      await createTraining(session.token, {
        ...form,
        date: form.date || null
      });
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
    if (!window.confirm("Eliminar esta formação?")) return;
    try {
      await deleteTraining(session.token, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleType(training) {
    const newType = training.type === "completed" ? "planned" : "completed";
    try {
      await updateTraining(session.token, training._id, { type: newType });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <section className="page stack-lg"><p style={{ color: "var(--text-muted)" }}>A carregar...</p></section>;

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Administrador · Competências e Formação</span>
          <h2>Gestão de Competências</h2>
          <p>Matriz de competências, lacunas e formações de toda a empresa.</p>
        </div>
        <div className="hero-score">
          <span>Colaboradores</span>
          <strong>{employees.length}</strong>
          <small>ativos</small>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="perf-tabs">
        <button className={`perf-tab ${tab === "matrix" ? "is-active" : ""}`} onClick={() => setTab("matrix")}>
          Matriz de Competências
        </button>
        <button className={`perf-tab ${tab === "trainings" ? "is-active" : ""}`} onClick={() => setTab("trainings")}>
          Formações
          {trainings.length > 0 && <span className="perf-tab-count">{trainings.length}</span>}
        </button>
      </div>

      {tab === "matrix" && (
        <div className="stack-lg">
          {allSkills.length === 0 || employees.length === 0 ? (
            <div className="empty-state">
              <strong>Sem dados de competências</strong>
              <p>Adicione competências aos perfis dos colaboradores para visualizar a matriz.</p>
            </div>
          ) : (
            <div className="skills-matrix-wrapper">
              <table className="skills-matrix">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", minWidth: 160 }}>Colaborador</th>
                    {allSkills.map(skill => (
                      <th key={skill} style={{ minWidth: 110, fontWeight: 500, fontSize: 12 }}>{skill}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp._id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="avatar-xs">{emp.name.slice(0, 2).toUpperCase()}</span>
                          <div>
                            <strong style={{ fontSize: 13 }}>{emp.name}</strong>
                            <small style={{ display: "block", color: "var(--text-muted)", fontSize: 11 }}>{emp.department}</small>
                          </div>
                        </div>
                      </td>
                      {allSkills.map(skill => {
                        const level = getSkillLevel(emp, skill);
                        return (
                          <td key={skill} style={{ textAlign: "center" }}>
                            {level ? (
                              <span
                                className="skill-matrix-cell"
                                style={{ background: LEVEL_COLOR[level] }}
                                title={LEVEL_LABEL[level]}
                              >
                                {LEVEL_LABEL[level].slice(0, 3)}
                              </span>
                            ) : (
                              <span className="skill-matrix-cell skill-matrix-empty" title="Sem dados">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="skills-legend">
            {Object.entries(LEVEL_LABEL).map(([key, label]) => (
              <span key={key} className="legend-item">
                <span className="legend-dot" style={{ background: LEVEL_COLOR[key] }} />
                {label}
              </span>
            ))}
            <span className="legend-item">
              <span className="legend-dot" style={{ background: "var(--surface-strong)" }} />
              Sem dados
            </span>
          </div>
        </div>
      )}

      {tab === "trainings" && (
        <div className="stack-lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Filtrar:</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}
              >
                <option value="">Todas</option>
                <option value="completed">Realizadas</option>
                <option value="planned">Planeadas</option>
              </select>
            </div>
            <button onClick={() => { setShowForm(v => !v); setForm(emptyForm); setError(""); }}>
              {showForm ? "Cancelar" : "+ Nova formação"}
            </button>
          </div>

          {showForm && (
            <form className="cycle-form-panel" onSubmit={handleCreate}>
              <h3 style={{ margin: "0 0 16px" }}>Nova formação</h3>
              <div className="cycle-form-grid">
                <div className="auth-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Título</label>
                  <input type="text" placeholder="Ex: Formação em Liderança" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="auth-field">
                  <label>Fornecedor / Instituição</label>
                  <input type="text" placeholder="Ex: Udemy, IEFP" value={form.provider}
                    onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Categoria</label>
                  <input type="text" placeholder="Ex: Soft Skills, Técnico" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="planned">Planeada</option>
                    <option value="completed">Realizada</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label>Data</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Duração</label>
                  <input type="text" placeholder="Ex: 8h, 2 dias" value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
                </div>
                <div className="auth-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Descrição</label>
                  <textarea rows={2} value={form.description} placeholder="Objetivos e conteúdo da formação..."
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="auth-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Participantes</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {employees.map(emp => {
                      const selected = form.employees.some(e => e.employeeId === emp._id);
                      return (
                        <label key={emp._id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer",
                          background: selected ? "var(--primary)" : "var(--surface-strong)",
                          color: selected ? "#fff" : "var(--text)",
                          padding: "4px 10px", borderRadius: "var(--radius)", userSelect: "none" }}>
                          <input type="checkbox" style={{ display: "none" }} checked={selected}
                            onChange={() => setForm(f => ({
                              ...f,
                              employees: selected
                                ? f.employees.filter(e => e.employeeId !== emp._id)
                                : [...f.employees, { employeeId: emp._id, employeeName: emp.name }]
                            }))} />
                          {emp.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" disabled={saving}>{saving ? "A criar..." : "Criar formação"}</button>
                <button type="button" className="ghost-button" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {filteredTrainings.length === 0 ? (
            <div className="empty-state"><p>Nenhuma formação registada{filterType ? " com este filtro" : ""}.</p></div>
          ) : (
            <div className="eval-table-wrapper">
              <table className="eval-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Categoria</th>
                    <th>Fornecedor</th>
                    <th>Data</th>
                    <th>Duração</th>
                    <th>Estado</th>
                    <th>Participantes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainings.map(t => (
                    <tr key={t._id}>
                      <td><strong>{t.title}</strong>{t.description && <small style={{ display: "block", color: "var(--text-muted)", fontSize: 11 }}>{t.description}</small>}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{t.category || "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{t.provider || "—"}</td>
                      <td style={{ fontSize: 13 }}>{t.date ? new Date(t.date).toLocaleDateString("pt-PT") : "—"}</td>
                      <td style={{ fontSize: 13 }}>{t.duration || "—"}</td>
                      <td>
                        <button className="ghost-button" style={{ padding: "2px 0" }} onClick={() => handleToggleType(t)}>
                          <span className={`cycle-status-badge tone-${TYPE_TONE[t.type]}`}>{TYPE_LABEL[t.type]}</span>
                        </button>
                      </td>
                      <td style={{ fontSize: 13 }}>{t.employees?.length || 0}</td>
                      <td>
                        <button className="ghost-button" style={{ fontSize: 12, color: "var(--rose)", padding: "4px 10px" }}
                          onClick={() => handleDelete(t._id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
