import { useEffect, useState, useMemo } from "react";
import { getEmployees, getTrainings, createTraining, updateTraining } from "../api";

const LEVEL_LABEL = { beginner: "Iniciante", intermediate: "Intermédio", advanced: "Avançado", expert: "Especialista" };
const LEVEL_COLOR = { beginner: "var(--warning)", intermediate: "var(--primary)", advanced: "var(--success)", expert: "var(--success)" };
const TYPE_LABEL = { completed: "Realizada", planned: "Planeada" };
const TYPE_TONE = { completed: "green", planned: "muted" };

const emptyForm = { title: "", provider: "", category: "", type: "planned", date: "", duration: "", description: "", employees: [] };

export function SkillsGestor({ session }) {
  const [tab, setTab] = useState("matrix");
  const [employees, setEmployees] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const firstName = session.user.name.split(" ")[0];

  async function loadData() {
    try {
      setLoading(true);
      const [allEmps, trains] = await Promise.all([
        getEmployees(session.token),
        getTrainings(session.token)
      ]);
      const team = allEmps.filter(e =>
        e.manager?.toLowerCase() === session.user.name.toLowerCase() && e.status === "active"
      );
      setEmployees(team);
      setTrainings(trains);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const allSkills = useMemo(() => {
    const set = new Set();
    employees.forEach(e => (e.skills || []).forEach(s => s.name && set.add(s.name)));
    return [...set].sort();
  }, [employees]);

  const gaps = useMemo(() => {
    const result = [];
    employees.forEach(emp => {
      (emp.skills || []).forEach(s => {
        if (s.level === "beginner") {
          result.push({ employee: emp, skill: s });
        }
      });
      // skills que outros têm mas este não
      allSkills.forEach(skillName => {
        const has = emp.skills?.find(s => s.name === skillName);
        if (!has) {
          result.push({ employee: emp, skill: { name: skillName, level: null } });
        }
      });
    });
    return result;
  }, [employees, allSkills]);

  function getSkillLevel(employee, skillName) {
    return employee.skills?.find(s => s.name === skillName)?.level || null;
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      await createTraining(session.token, { ...form, date: form.date || null });
      setShowForm(false);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
          <span className="eyebrow">Gestor · Competências e Formação</span>
          <h2>Olá, {firstName}.</h2>
          <p>Competências e formações da sua equipa.</p>
        </div>
        <div className="hero-score">
          <span>Lacunas</span>
          <strong style={{ color: gaps.length > 0 ? "var(--warning)" : "var(--success)" }}>{gaps.length}</strong>
          <small>identificadas</small>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="perf-tabs">
        <button className={`perf-tab ${tab === "matrix" ? "is-active" : ""}`} onClick={() => setTab("matrix")}>
          Matriz da Equipa
        </button>
        <button className={`perf-tab ${tab === "gaps" ? "is-active" : ""}`} onClick={() => setTab("gaps")}>
          Lacunas
          {gaps.length > 0 && <span className="perf-tab-count" style={{ background: "var(--warning)" }}>{gaps.length}</span>}
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
              <p>A sua equipa ainda não tem competências registadas nos perfis.</p>
            </div>
          ) : (
            <>
              <div className="skills-matrix-wrapper">
                <table className="skills-matrix">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", minWidth: 140 }}>Colaborador</th>
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
                            <strong style={{ fontSize: 13 }}>{emp.name}</strong>
                          </div>
                        </td>
                        {allSkills.map(skill => {
                          const level = getSkillLevel(emp, skill);
                          const isGap = level === "beginner" || !level;
                          return (
                            <td key={skill} style={{ textAlign: "center" }}>
                              {level ? (
                                <span
                                  className={`skill-matrix-cell ${isGap ? "skill-matrix-gap" : ""}`}
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
            </>
          )}
        </div>
      )}

      {tab === "gaps" && (
        <div className="stack-lg">
          {gaps.length === 0 ? (
            <div className="empty-state">
              <strong>Sem lacunas identificadas</strong>
              <p>Todos os membros da equipa têm competências acima do nível iniciante.</p>
            </div>
          ) : (
            <div className="eval-table-wrapper">
              <table className="eval-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Competência</th>
                    <th>Nível atual</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((g, i) => (
                    <tr key={i}>
                      <td><strong>{g.employee.name}</strong></td>
                      <td>{g.skill.name}</td>
                      <td>
                        {g.skill.level ? (
                          <span style={{ color: LEVEL_COLOR[g.skill.level], fontSize: 13, fontWeight: 600 }}>
                            {LEVEL_LABEL[g.skill.level]}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Não registado</span>
                        )}
                      </td>
                      <td>
                        <span className={`cycle-status-badge tone-${g.skill.level ? "muted" : "rose"}`}>
                          {g.skill.level ? "Necessita desenvolvimento" : "Ausente na equipa"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "trainings" && (
        <div className="stack-lg">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
                  <input type="text" placeholder="Ex: Workshop de Comunicação" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="auth-field">
                  <label>Fornecedor</label>
                  <input type="text" placeholder="Ex: Udemy" value={form.provider}
                    onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Categoria</label>
                  <input type="text" placeholder="Ex: Soft Skills" value={form.category}
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
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Duração</label>
                  <input type="text" placeholder="Ex: 8h" value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
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

          {trainings.length === 0 ? (
            <div className="empty-state"><p>Nenhuma formação registada para a sua equipa.</p></div>
          ) : (
            <div className="eval-table-wrapper">
              <table className="eval-table">
                <thead>
                  <tr><th>Título</th><th>Categoria</th><th>Data</th><th>Duração</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {trainings.map(t => (
                    <tr key={t._id}>
                      <td><strong>{t.title}</strong></td>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{t.category || "—"}</td>
                      <td style={{ fontSize: 13 }}>{t.date ? new Date(t.date).toLocaleDateString("pt-PT") : "—"}</td>
                      <td style={{ fontSize: 13 }}>{t.duration || "—"}</td>
                      <td>
                        <button className="ghost-button" style={{ padding: "2px 0" }} onClick={() => handleToggleType(t)}>
                          <span className={`cycle-status-badge tone-${TYPE_TONE[t.type]}`}>{TYPE_LABEL[t.type]}</span>
                        </button>
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
