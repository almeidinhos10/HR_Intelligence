import { AuthShell } from "../components/AuthShell";

export function LoginPage({ form, onChange, onSubmit, submitting, error }) {
  return (
    <AuthShell error={error}>
      <div className="auth-card-header">
        <div className="auth-card-brand">
        </div>
        <h2>Olá novamente!</h2>
        <p>Preencha os dados abaixo e vamos a isso.</p>
      </div>

      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="nome@empresa.pt"
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            required
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => onChange({ ...form, password: e.target.value })}
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" disabled={submitting} style={{ marginTop: 4 }}>
          {submitting ? "A entrar..." : "Entrar na plataforma"}
        </button>
      </form>

      <p className="auth-switch" style={{ color: "var(--text-muted)", fontSize: 13 }}>
        O acesso é concedido pelo administrador da plataforma.
      </p>
    </AuthShell>
  );
}
