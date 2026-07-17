import { useEffect, useState } from "react";
import { getUsers, createUser, updateUserRole, deleteUser } from "../api";

const ROLE_LABEL = {
  colaborador: "Colaborador",
  gestor: "Gestor",
  administrador: "Administrador"
};

const ROLE_TONE = {
  colaborador: "muted",
  gestor: "green",
  administrador: "rose"
};

const emptyForm = {
  name: "",
  email: "",
  role: "colaborador",
  department: "",
  jobTitle: ""
};

export function UsersPage({ session }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingRoleId, setEditingRoleId] = useState(null);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      const data = await getUsers(session.token);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await createUser(session.token, form);
      setSuccess(`Conta criada! Um email foi enviado para ${form.email}.`);
      setShowForm(false);
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId, role) {
    try {
      setError("");
      await updateUserRole(session.token, userId, role);
      setEditingRoleId(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(userId, userName) {
    if (!window.confirm(`Eliminar a conta de "${userName}"? Esta ação não pode ser desfeita.`)) return;
    try {
      setError("");
      await deleteUser(session.token, userId);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

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
          <span className="eyebrow">Administrador · Gestão de Acessos</span>
          <h2>Utilizadores</h2>
          <p>Crie contas, defina papéis e gerencie o acesso à plataforma.</p>
        </div>
        <div className="hero-score">
          <span>Contas</span>
          <strong>{users.length}</strong>
          <small>registadas</small>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && (
        <p style={{ color: "var(--success)", background: "color-mix(in srgb, var(--success) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 14 }}>
          {success}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => { setShowForm((v) => !v); setForm(emptyForm); setError(""); setSuccess(""); }}>
          {showForm ? "Cancelar" : "+ Nova conta"}
        </button>
      </div>

      {showForm && (
        <form className="cycle-form-panel" onSubmit={handleCreate}>
          <h3 style={{ margin: "0 0 16px" }}>Criar nova conta</h3>
          <div className="cycle-form-grid">
            <div className="auth-field">
              <label>Nome completo</label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="joao@empresa.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="auth-field">
              <label>Papel</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="colaborador">Colaborador</option>
                <option value="gestor">Gestor</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
            <div className="auth-field">
              <label>Departamento {form.role === "gestor" && <span style={{ color: "var(--rose)" }}>*</span>}</label>
              <input
                type="text"
                placeholder="Ex: Tecnologia"
                value={form.department}
                required={form.role === "gestor"}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              />
              {form.role === "gestor" && (
                <small style={{ color: "var(--text-muted)", fontSize: 12 }}>Obrigatório para gestores — fica associado ao departamento que gerem.</small>
              )}
            </div>
            <div className="auth-field" style={{ gridColumn: "1 / -1" }}>
              <label>Cargo</label>
              <input
                type="text"
                placeholder="Ex: Engenheiro de Software"
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
              />
            </div>
          </div>
          <p style={{ margin: "12px 0 16px", fontSize: 13, color: "var(--text-muted)" }}>
            Um email será enviado automaticamente com o link de ativação da conta.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={saving}>
              {saving ? "A criar..." : "Criar e enviar convite"}
            </button>
            <button type="button" className="ghost-button" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {users.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma conta registada. Crie a primeira conta acima.</p>
        </div>
      ) : (
        <div className="eval-table-wrapper">
          <table className="eval-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Papel</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{u.email}</td>
                  <td>
                    {editingRoleId === u._id ? (
                      <select
                        defaultValue={u.role}
                        autoFocus
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        onBlur={() => setEditingRoleId(null)}
                        style={{ padding: "4px 8px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}
                      >
                        <option value="colaborador">Colaborador</option>
                        <option value="gestor">Gestor</option>
                        <option value="administrador">Administrador</option>
                      </select>
                    ) : (
                      <button
                        className="ghost-button"
                        style={{ padding: "2px 8px", fontSize: 12 }}
                        onClick={() => setEditingRoleId(u._id)}
                        title="Clique para alterar o papel"
                      >
                        <span className={`cycle-status-badge tone-${ROLE_TONE[u.role]}`}>
                          {ROLE_LABEL[u.role]}
                        </span>
                      </button>
                    )}
                  </td>
                  <td>
                    {u.passwordSet ? (
                      <span style={{ fontSize: 12, color: "var(--success)" }}>Ativa</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--warning)" }}>Pendente</span>
                    )}
                  </td>
                  <td>
                    {u._id !== session.user.id && (
                      <button
                        className="ghost-button"
                        style={{ padding: "4px 10px", fontSize: 12, color: "var(--rose)" }}
                        onClick={() => handleDelete(u._id, u.name)}
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
