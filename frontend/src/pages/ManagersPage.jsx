import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";

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
            if (e.key === "Enter") { e.preventDefault(); addSkill(); }
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
              >×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const emptyDraft = {
  name: "", email: "", phone: "", jobTitle: "",
  department: "", team: "", manager: "",
  contractType: "", contractStartDate: "", contractEndDate: "", salaryBand: "",
  professionalHistoryText: "", skills: [], certificationsText: ""
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
      .map((item) => [item.role, item.company, item.startDate, item.endDate, item.notes].filter(Boolean).join(" | "))
      .join("\n"),
    skills: employee.skills || [],
    certificationsText: (employee.certifications || [])
      .map((item) => [item.name, item.issuer, item.issuedAt, item.expiresAt].filter(Boolean).join(" | "))
      .join("\n")
  };
}

function parseLines(value, mapper) {
  return value.split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => mapper(l.split("|").map((p) => p.trim())));
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
      role: parts[0] || "", company: parts[1] || "",
      startDate: parts[2] || "", endDate: parts[3] || "", notes: parts[4] || ""
    })),
    skills: draft.skills,
    certifications: parseLines(draft.certificationsText, (parts) => ({
      name: parts[0] || "", issuer: parts[1] || "",
      issuedAt: parts[2] || "", expiresAt: parts[3] || ""
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

export function ManagersPage({
  managers,
  loading,
  submitting,
  error,
  onUpdate,
  onToggleStatus,
  onDelete,
}) {
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");

  const selectedManager = useMemo(
    () => managers.find((m) => m._id === selectedId) || managers[0],
    [managers, selectedId]
  );

  useEffect(() => {
    if (!selectedId && managers[0]?._id) setSelectedId(managers[0]._id);
  }, [managers, selectedId]);

  useEffect(() => {
    setDraft(fromEmployee(selectedManager));
  }, [selectedManager?._id]);

  function handleUpdate(event) {
    event.preventDefault();
    if (!selectedManager) return;
    onUpdate(selectedManager._id, toPayload(draft));
  }

  function handleDelete() {
    if (!selectedManager) return;
    const confirmed = window.confirm(
      `Tem a certeza que pretende remover "${selectedManager.name}"? Esta ação não pode ser desfeita.`
    );
    if (confirmed) onDelete(selectedManager._id);
  }

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Gestão de Gestores</span>
          <h2>Gestores</h2>
          <p>Perfis, contrato, histórico profissional, competências e certificações dos gestores.</p>
        </div>
        <div className="hero-score">
          <span>Gestores</span>
          <strong>{managers.length}</strong>
          <small>registados</small>
        </div>
      </div>

      {loading ? (
        <div className="table-skeleton" aria-label="A carregar gestores">
          <span /><span /><span />
        </div>
      ) : managers.length === 0 ? (
        <EmptyState
          title="Sem gestores registados"
          message="Crie gestores na página 'Utilizadores' para aparecerem aqui."
        />
      ) : editMode ? (
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
              <h3>{selectedManager?.name}</h3>
              <p>{selectedManager?.email}</p>
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => onToggleStatus(selectedManager)}
              >
                {selectedManager?.status === "active" ? "Marcar inativo" : "Marcar ativo"}
              </button>
              <button type="button" className="danger" onClick={handleDelete}>
                Remover
              </button>
            </div>
          </div>

          <div className="detail-section">
            <h4>Perfil</h4>
            <div className="detail-grid">
              <Field label="Nome">
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
              </Field>
              <Field label="Email">
                <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} required />
              </Field>
              <Field label="Telefone">
                <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </Field>
              <Field label="Cargo">
                <input value={draft.jobTitle} onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="detail-section">
            <h4>Contrato e organização</h4>
            <div className="detail-grid">
              <Field label="Departamento">
                <input value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} required />
              </Field>
              <Field label="Equipa">
                <input value={draft.team} onChange={(e) => setDraft({ ...draft, team: e.target.value })} />
              </Field>
              <Field label="Tipo de contrato">
                <select value={draft.contractType} onChange={(e) => setDraft({ ...draft, contractType: e.target.value })}>
                  <option value="">Sem contrato definido</option>
                  <option value="permanent">Sem termo</option>
                  <option value="fixed-term">Termo certo</option>
                  <option value="internship">Estágio</option>
                  <option value="contractor">Prestador</option>
                </select>
              </Field>
              <Field label="Início">
                <input type="date" value={draft.contractStartDate} onChange={(e) => setDraft({ ...draft, contractStartDate: e.target.value })} />
              </Field>
              <Field label="Fim">
                <input type="date" value={draft.contractEndDate} onChange={(e) => setDraft({ ...draft, contractEndDate: e.target.value })} />
              </Field>
              <Field label="Banda salarial">
                <input value={draft.salaryBand} onChange={(e) => setDraft({ ...draft, salaryBand: e.target.value })} placeholder="B2" />
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
                  onChange={(e) => setDraft({ ...draft, professionalHistoryText: e.target.value })}
                  placeholder={"Cargo | Empresa | Início | Fim | Notas\nEx: Developer | Acme | 2020 | 2023 | Full-stack"}
                />
              </Field>
              <Field label="Certificações">
                <textarea
                  value={draft.certificationsText}
                  onChange={(e) => setDraft({ ...draft, certificationsText: e.target.value })}
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
          <div className="employee-list" aria-label="Lista de gestores">
            <div className="employee-search">
              <input
                type="search"
                placeholder="Pesquisar por nome, cargo, departamento..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedId(""); }}
              />
            </div>
            {managers.filter(m => {
              const q = search.toLowerCase();
              return !q || m.name?.toLowerCase().includes(q) || m.jobTitle?.toLowerCase().includes(q) || m.department?.toLowerCase().includes(q);
            }).map((manager) => (
              <button
                key={manager._id}
                className={selectedManager?._id === manager._id ? "is-selected" : ""}
                onClick={() => { setSelectedId(manager._id); setEditMode(true); }}
              >
                <span>{manager.name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{manager.name}</strong>
                  <small>{manager.jobTitle || manager.department}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
