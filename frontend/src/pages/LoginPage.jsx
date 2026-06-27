import { AuthShell } from "../components/AuthShell";

export function LoginPage({
  form,
  mode,
  onChange,
  onSubmit,
  onModeChange,
  submitting,
  error
}) {
  return (
    <AuthShell title="HR Intelligence" subtitle="Entrar no sistema" error={error}>
      <div className="mode-switch">
        <button
          className={mode === "login" ? "is-selected" : ""}
          onClick={() => onModeChange("login")}
        >
          Login
        </button>
        <button onClick={() => onModeChange("register")}>Registar</button>
      </div>

      <form onSubmit={onSubmit} className="form auth-form">
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
        <button type="submit" disabled={submitting}>
          {submitting ? "A entrar..." : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}

