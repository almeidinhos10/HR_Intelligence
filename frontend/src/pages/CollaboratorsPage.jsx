import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { canDeleteEmployees, canManageEmployees } from "../utils/permissions";

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
  skillsText: "",
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
    skillsText: (employee.skills || [])
      .map((item) => [item.name, item.level].filter(Boolean).join(" | "))
      .join("\n"),
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
    skills: parseLines(draft.skillsText, (parts) => ({
      name: parts[0] || "",
      level: parts[1] || ""
    })),
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
  form,
  loading,
  submitting,
  error,
  onFormChange,
  onCreate,
  onUpdate,
  onToggleStatus,
  onDelete
}) {
  const role = session.user.role;
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(emptyDraft);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee._id === selectedId) || employees[0],
    [employees, selectedId]
  );

  useEffect(() => {
    if (!selectedId && employees[0]?._id) {
      setSelectedId(employees[0]._id);
    }
  }, [employees, selectedId]);

  useEffect(() => {
    setDraft(fromEmployee(selectedEmployee));
  }, [selectedEmployee?._id]);

  if (!canManageEmployees(role)) {
    return (
      <section className="page">
        <EmptyState
          title="Area de colaborador"
          message="Neste perfil vais consultar dados pessoais, avaliacoes, competencias e pedidos de ferias quando os modulos estiverem completos."
        />
      </section>
    );
  }

  function handleCreate(event) {
    event.preventDefault();
    onCreate(toPayload(form));
  }

  function handleUpdate(event) {
    event.preventDefault();
    if (!selectedEmployee) return;
    onUpdate(selectedEmployee._id, toPayload(draft));
  }

  return (
    <section className="page stack-lg">
      <div className="page-toolbar">
        <div>
          <span className="eyebrow">Modulo 4.1</span>
          <h2>Gestao de Colaboradores</h2>
          <p>Perfis, contrato, historico profissional, equipas, competencias e certificacoes.</p>
        </div>
        <div className="toolbar-stats">
          <span>{employees.length}</span>
          <small>registos</small>
        </div>
      </div>

      <form onSubmit={handleCreate} className="employee-create-grid">
        <Field label="Nome">
          <input
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            placeholder="Ana Martins"
            required
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => onFormChange({ ...form, email: e.target.value })}
            placeholder="ana@empresa.pt"
            required
          />
        </Field>
        <Field label="Cargo">
          <input
            value={form.jobTitle}
            onChange={(e) => onFormChange({ ...form, jobTitle: e.target.value })}
            placeholder="HR Specialist"
          />
        </Field>
        <Field label="Departamento">
          <input
            value={form.department}
            onChange={(e) => onFormChange({ ...form, department: e.target.value })}
            placeholder="Recursos Humanos"
            required
          />
        </Field>
        <Field label="Equipa">
          <input
            value={form.team}
            onChange={(e) => onFormChange({ ...form, team: e.target.value })}
            placeholder="People Ops"
          />
        </Field>
        <Field label="Contrato">
          <select
            value={form.contractType}
            onChange={(e) => onFormChange({ ...form, contractType: e.target.value })}
          >
            <option value="">Sem contrato definido</option>
            <option value="permanent">Sem termo</option>
            <option value="fixed-term">Termo certo</option>
            <option value="internship">Estagio</option>
            <option value="contractor">Prestador</option>
          </select>
        </Field>
        <button type="submit" disabled={submitting}>
          {submitting ? "A criar..." : "Criar colaborador"}
        </button>
      </form>

      {loading ? (
        <div className="table-skeleton" aria-label="A carregar colaboradores">
          <span />
          <span />
          <span />
        </div>
      ) : employees.length === 0 ? (
        <EmptyState
          title="Ainda nao existem colaboradores"
          message="Cria o primeiro perfil para comecar a preencher o modulo 4.1."
        />
      ) : (
        <div className="employee-workbench">
          <div className="employee-list" aria-label="Lista de colaboradores">
            {employees.map((employee) => (
              <button
                key={employee._id}
                className={selectedEmployee?._id === employee._id ? "is-selected" : ""}
                onClick={() => setSelectedId(employee._id)}
              >
                <span>{employee.name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{employee.name}</strong>
                  <small>{employee.jobTitle || employee.department}</small>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleUpdate} className="employee-detail">
            <div className="detail-header">
              <div>
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
                {canDeleteEmployees(role) ? (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => onDelete(selectedEmployee._id)}
                  >
                    Remover
                  </button>
                ) : null}
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
              <h4>Contrato e organizacao</h4>
              <div className="detail-grid">
                <Field label="Departamento">
                  <input
                    value={draft.department}
                    onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Equipa">
                  <input
                    value={draft.team}
                    onChange={(e) => setDraft({ ...draft, team: e.target.value })}
                  />
                </Field>
                <Field label="Gestor">
                  <input
                    value={draft.manager}
                    onChange={(e) => setDraft({ ...draft, manager: e.target.value })}
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
                    <option value="internship">Estagio</option>
                    <option value="contractor">Prestador</option>
                  </select>
                </Field>
                <Field label="Inicio">
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
              <h4>Historico, competencias e certificacoes</h4>
              <div className="detail-grid textareas">
                <Field label="Historico profissional">
                  <textarea
                    value={draft.professionalHistoryText}
                    onChange={(e) =>
                      setDraft({ ...draft, professionalHistoryText: e.target.value })
                    }
                    placeholder="Cargo | Empresa | Inicio | Fim | Notas"
                  />
                </Field>
                <Field label="Competencias">
                  <textarea
                    value={draft.skillsText}
                    onChange={(e) => setDraft({ ...draft, skillsText: e.target.value })}
                    placeholder="JavaScript | advanced"
                  />
                </Field>
                <Field label="Certificacoes">
                  <textarea
                    value={draft.certificationsText}
                    onChange={(e) =>
                      setDraft({ ...draft, certificationsText: e.target.value })
                    }
                    placeholder="Scrum Master | Scrum.org | 2025-01-10 | 2027-01-10"
                  />
                </Field>
              </div>
            </div>

            <button type="submit" disabled={submitting}>
              {submitting ? "A guardar..." : "Guardar alteracoes"}
            </button>
          </form>
        </div>
      )}

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

