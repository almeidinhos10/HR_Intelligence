import { AuthShell } from "../components/AuthShell";

export function RegisterPage({
  form,
  mode,
  onChange,
  onSubmit,
  onModeChange,
  submitting,
  error
}) {
  return (
    <AuthShell title="HR Intelligence" subtitle="Criar conta" error={error}>
      <div className="mode-switch">
        <button onClick={() => onModeChange("login")}>Login</button>
        <button
          className={mode === "register" ? "is-selected" : ""}
          onClick={() => onModeChange("register")}
        >
          Registar
        </button>
      </div>

      <form onSubmit={onSubmit} className="form auth-form">
        <input
          type="text"
          placeholder="Nome"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => onChange({ ...form, password: e.target.value })}
          required
        />
        <select
          value={form.role}
          onChange={(e) => onChange({ ...form, role: e.target.value })}
        >
          <option value="colaborador">Colaborador</option>
          <option value="gestor">Gestor</option>
          <option value="administrador">Administrador</option>
        </select>
        <button type="submit" disabled={submitting}>
          {submitting ? "A criar..." : "Criar conta"}
        </button>
      </form>
    </AuthShell>
  );
}

