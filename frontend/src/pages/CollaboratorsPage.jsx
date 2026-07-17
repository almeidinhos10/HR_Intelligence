import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { canDeleteEmployees, canManageEmployees, ROLES } from "../utils/permissions";
import { approveEmployee } from "../api";

const SKILL_LEVELS = [
  { value: "beginner", label: "Iniciante" },
  { value: "intermediate", label: "Intermédio" },
  { value: "advanced", label: "Avançado" },
  { value: "expert", label: "Especialista" }
];

function SkillsEditor({ skills, onChange }) {
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("intermediate");

  function addSkill() {
    if (!newName.trim()) return;
    onChange([...skills, { name: newName.trim(), level: newLevel }]);
    setNewName("");
    setNewLevel("intermediate");
  }

  function removeSkill(index) {
    onChange(skills.filter((_, i) => i !== index));
  }

  return (
    <div className="skills-editor">
      <div className="skill-add-row">
        <input
          placeholder="Nome da competência"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
        />
        <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)}>
          {SKILL_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <button type="button" className="ghost-button" onClick={addSkill}>+</button>
      </div>
      {skills.length > 0 && (
        <ul className="skill-list">
          {skills.map((skill, i) => (
            <li key={i} className="skill-pill">
              <span>{skill.name}</span>
              <em>{SKILL_LEVELS.find((l) => l.value === skill.level)?.label ?? skill.level}</em>
              <button
                type="button"
                className="skill-remove"
                onClick={() => removeSkill(i)}
                aria-label={`Remover ${skill.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const emptyDraft = {
  name: "",
  email: "",
  phone: "",
  jobTitle: "",
  department: "",
  team: "",
  manager: "",
  contractType: "",
  contractStartDate: "",
  contractEndDate: "",
  salaryBand: "",
  professionalHistoryText: "",
  skills: [],
  certificationsText: ""
};

function fromEmployee(employee) {
  if (!employee) return emptyDraft;
  return {
    name: employee.name || "",
    email: employee.email || "",
    phone: employee.phone || "",
    jobTitle: employee.jobTitle || "",
    department: employee.department || "",
    team: employee.team || "",
    manager: employee.manager || "",
    contractType: employee.contract?.type || "",
    contractStartDate: employee.contract?.startDate?.slice(0, 10) || "",
    contractEndDate: employee.contract?.endDate?.slice(0, 10) || "",
    salaryBand: employee.contract?.salaryBand || "",
    professionalHistoryText: (employee.professionalHistory || [])
      .map((item) =>
        [item.role, item.company, item.startDate, item.endDate, item.notes]
          .filter(Boolean)
          .join(" | ")
      )
      .join("\n"),
    skills: employee.skills || [],
    certificationsText: (employee.certifications || [])
      .map((item) =>
        [item.name, item.issuer, item.issuedAt, item.expiresAt].filter(Boolean).join(" | ")
      )
      .join("\n")
  };
}

function parseLines(value, mapper) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => mapper(line.split("|").map((part) => part.trim())));
}

function toPayload(draft) {
  return {
    name: draft.name,
    email: draft.email,
    phone: draft.phone,
    jobTitle: draft.jobTitle,
    department: draft.department,
    team: draft.team,
    manager: draft.manager,
    contract: {
      type: draft.contractType,
      startDate: draft.contractStartDate || undefined,
      endDate: draft.contractEndDate || undefined,
      salaryBand: draft.salaryBand
    },
    professionalHistory: parseLines(draft.professionalHistoryText, (parts) => ({
      role: parts[0] || "",
      company: parts[1] || "",
      startDate: parts[2] || "",
      endDate: parts[3] || "",
      notes: parts[4] || ""
    })),
    skills: draft.skills,
    certifications: parseLines(draft.certificationsText, (parts) => ({
      name: parts[0] || "",
      issuer: parts[1] || "",
      issuedAt: parts[2] || "",
      expiresAt: parts[3] || ""
    }))
  };
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function CollaboratorsPage({
  session,
  employees,
  gestores = [],
  loading,
  submitting,
  error,
  onUpdate,
  onToggleStatus,
  onDelete,
  onReload
}) {
  const role = session.user.role;
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [tab, setTab] = useState("equipa");
  const [approving, setApproving] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");

  const teamEmployees = useMemo(() => {
    if (role !== ROLES.MANAGER) return employees;
    const managerName = session.user.name.toLowerCase().trim();
    return employees.filter((e) => e.manager?.toLowerCase().trim() === managerName);
  }, [employees, role, session.user.name]);

  const pendingTeam = useMemo(() =>
    teamEmployees.filter((e) => e.status === "pending"),
    [teamEmployees]
  );

  const visibleEmployees = useMemo(() => {
    if (role !== ROLES.MANAGER) return employees;
    return teamEmployees.filter((e) => e.status !== "pending");
  }, [teamEmployees, employees, role]);

  async function handleApprove(employeeId) {
    try {
      setApproving(employeeId);
      await approveEmployee(session.token, employeeId);
      await onReload();
    } catch (err) {
      // erro visível pelo error prop existente
    } finally {
      setApproving(null);
    }
  }

  const selectedEmployee = useMemo(
    () => visibleEmployees.find((e) => e._id === selectedId) || visibleEmployees[0],
    [visibleEmployees, selectedId]
  );

  useEffect(() => {
    if (!selectedId && visibleEmployees[0]?._id) {
      setSelectedId(visibleEmployees[0]._id);
    }
  }, [visibleEmployees, selectedId]);

  useEffect(() => {
    setDraft(fromEmployee(selectedEmployee));
  }, [selectedEmployee?._id]);

  if (!canManageEmployees(role)) {
    return (
      <section className="page">
        <EmptyState
          title="Acesso restrito"
          message="Apenas gestores e administradores acedem à lista de colaboradores."
        />
      </section>
    );
  }

  function handleUpdate(event) {
    event.preventDefault();
    if (!selectedEmployee) return;
    onUpdate(selectedEmployee._id, toPayload(draft));
  }

  function handleDelete() {
    if (!selectedEmployee) return;
    const confirmed = window.confirm(
      `Tem a certeza que pretende remover "${selectedEmployee.name}"? Esta ação não pode ser desfeita.`
    );
    if (confirmed) onDelete(selectedEmployee._id);
  }

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Gestão de Colaboradores</span>
          <h2>Colaboradores</h2>
          <p>Perfis, contrato, histórico profissional, equipas, competências e certificações.</p>
        </div>
        <div className="hero-score">
          <span>Colaboradores</span>
          <strong>{visibleEmployees.length}</strong>
          <small>{role === ROLES.MANAGER ? "na equipa" : "registados"}</small>
        </div>
      </div>

      {role === ROLES.MANAGER && (
        <div className="perf-tabs">
          <button
            className={`perf-tab ${tab === "equipa" ? "is-active" : ""}`}
            onClick={() => setTab("equipa")}
          >
            Equipa
            {visibleEmployees.length > 0 && (
              <span className="perf-tab-count">{visibleEmployees.length}</span>
            )}
          </button>
          <button
            className={`perf-tab ${tab === "integrar" ? "is-active" : ""}`}
            onClick={() => setTab("integrar")}
          >
            A integrar
            {pendingTeam.length > 0 && (
              <span className="perf-tab-count" style={{ background: "var(--warning)" }}>{pendingTeam.length}</span>
            )}
          </button>
        </div>
      )}

      {role === ROLES.MANAGER && tab === "integrar" && (
        <div className="stack-lg">
          {pendingTeam.length === 0 ? (
            <div className="empty-state">
              <strong>Nenhum colaborador pendente</strong>
              <p>Não há novos membros a aguardar integração na sua equipa.</p>
            </div>
          ) : (
            <div className="team-eval-list">
              {pendingTeam.map((emp) => (
                <div key={emp._id} className="team-eval-row">
                  <div className="team-eval-row-header">
                    <div className="person-cell">
                      <span>{emp.name.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong>{emp.name}</strong>
                        <small>{emp.jobTitle || emp.department}</small>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12, color: "var(--warning)" }}>Pendente</span>
                      <button
                        className="ghost-button"
                        style={{ fontSize: 13 }}
                        disabled={approving === emp._id}
                        onClick={() => handleApprove(emp._id)}
                      >
                        {approving === emp._id ? "A aprovar..." : "Aprovar integração"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(role !== ROLES.MANAGER || tab === "equipa") && loading ? (
        <div className="table-skeleton" aria-label="A carregar colaboradores">
          <span />
          <span />
          <span />
        </div>
      ) : (role !== ROLES.MANAGER || tab === "equipa") && visibleEmployees.length === 0 ? (
        <EmptyState
          title={role === ROLES.MANAGER ? "Sem colaboradores ativos na equipa" : "Ainda não existem colaboradores"}
          message={
            role === ROLES.MANAGER
              ? "Nenhum colaborador ativo tem o seu nome definido como gestor."
              : "Crie utilizadores na página 'Utilizadores' para os colaboradores aparecerem aqui."
          }
        />
      ) : (role !== ROLES.MANAGER || tab === "equipa") ? (
        editMode ? (
          <form onSubmit={handleUpdate} className="employee-detail" style={{ maxWidth: "100%" }}>
            <div className="detail-header">
              <div>
                <button
                  type="button"
                  className="ghost-button"
                  style={{ fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}
                  onClick={() => setEditMode(false)}
                >
                  ← Voltar à lista
                </button>
                <span className="eyebrow">Perfil selecionado</span>
                <h3>{selectedEmployee?.name}</h3>
                <p>{selectedEmployee?.email}</p>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onToggleStatus(selectedEmployee)}
                >
                  {selectedEmployee?.status === "active" ? "Marcar inativo" : "Marcar ativo"}
                </button>
                {canDeleteEmployees(role) && (
                  <button type="button" className="danger" onClick={handleDelete}>
                    Remover
                  </button>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h4>Perfil</h4>
              <div className="detail-grid">
                <Field label="Nome">
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Telefone">
                  <input
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  />
                </Field>
                <Field label="Cargo">
                  <input
                    value={draft.jobTitle}
                    onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <div className="detail-section">
              <h4>Contrato e organização</h4>
              <div className="detail-grid">
                <Field label="Gestor">
                  {gestores.length > 0 ? (
                    <select
                      value={draft.manager}
                      onChange={(e) => {
                        const gestor = gestores.find(g => g.name === e.target.value);
                        setDraft({
                          ...draft,
                          manager: e.target.value,
                          department: gestor?.department || draft.department
                        });
                      }}
                    >
                      <option value="">Sem gestor atribuído</option>
                      {gestores.map(g => (
                        <option key={g._id} value={g.name}>{g.name}{g.department ? ` — ${g.department}` : ""}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={draft.manager}
                      onChange={(e) => setDraft({ ...draft, manager: e.target.value })}
                      placeholder="Nome do gestor"
                    />
                  )}
                </Field>
                <Field label="Departamento">
                  {gestores.length > 0 ? (
                    <select
                      value={draft.department}
                      onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                      required
                    >
                      <option value="">Selecionar departamento...</option>
                      {[...new Set(gestores.map(g => g.department).filter(Boolean))].map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={draft.department}
                      onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                      required
                    />
                  )}
                </Field>
                <Field label="Equipa">
                  <input
                    value={draft.team}
                    onChange={(e) => setDraft({ ...draft, team: e.target.value })}
                  />
                </Field>
                <Field label="Tipo de contrato">
                  <select
                    value={draft.contractType}
                    onChange={(e) => setDraft({ ...draft, contractType: e.target.value })}
                  >
                    <option value="">Sem contrato definido</option>
                    <option value="permanent">Sem termo</option>
                    <option value="fixed-term">Termo certo</option>
                    <option value="internship">Estágio</option>
                    <option value="contractor">Prestador</option>
                  </select>
                </Field>
                <Field label="Início">
                  <input
                    type="date"
                    value={draft.contractStartDate}
                    onChange={(e) => setDraft({ ...draft, contractStartDate: e.target.value })}
                  />
                </Field>
                <Field label="Fim">
                  <input
                    type="date"
                    value={draft.contractEndDate}
                    onChange={(e) => setDraft({ ...draft, contractEndDate: e.target.value })}
                  />
                </Field>
                <Field label="Banda salarial">
                  <input
                    value={draft.salaryBand}
                    onChange={(e) => setDraft({ ...draft, salaryBand: e.target.value })}
                    placeholder="B2"
                  />
                </Field>
              </div>
            </div>

            <div className="detail-section">
              <h4>Competências</h4>
              <SkillsEditor
                skills={draft.skills}
                onChange={(skills) => setDraft({ ...draft, skills })}
              />
            </div>

            <div className="detail-section">
              <h4>Histórico profissional e certificações</h4>
              <div className="detail-grid textareas">
                <Field label="Histórico profissional">
                  <textarea
                    value={draft.professionalHistoryText}
                    onChange={(e) =>
                      setDraft({ ...draft, professionalHistoryText: e.target.value })
                    }
                    placeholder={"Cargo | Empresa | Início | Fim | Notas\nEx: Developer | Acme | 2020 | 2023 | Full-stack"}
                  />
                </Field>
                <Field label="Certificações">
                  <textarea
                    value={draft.certificationsText}
                    onChange={(e) =>
                      setDraft({ ...draft, certificationsText: e.target.value })
                    }
                    placeholder={"Nome | Emissor | Emissão | Validade\nEx: Scrum Master | Scrum.org | 2025-01-10 | 2027-01-10"}
                  />
                </Field>
              </div>
            </div>

            <button type="submit" disabled={submitting}>
              {submitting ? "A guardar..." : "Guardar alterações"}
            </button>
          </form>
        ) : (
          <div className="employee-workbench">
            <div className="employee-list" aria-label="Lista de colaboradores">
              <div className="employee-search">
                <input
                  type="search"
                  placeholder="Pesquisar por nome, cargo, departamento..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelectedId(""); }}
                />
              </div>
              {visibleEmployees.filter(e => {
                const q = search.toLowerCase();
                return !q || e.name?.toLowerCase().includes(q) || e.jobTitle?.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q);
              }).map((employee) => (
                <button
                  key={employee._id}
                  className={selectedEmployee?._id === employee._id ? "is-selected" : ""}
                  onClick={() => { setSelectedId(employee._id); setEditMode(true); }}
                >
                  <span>{employee.name.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{employee.name}</strong>
                    <small>{employee.jobTitle || employee.department}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
