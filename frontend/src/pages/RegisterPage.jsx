import { AuthShell } from "../components/AuthShell";

const roleOptions = [
  { value: "colaborador", label: "Colaborador", desc: "Acesso aos seus dados pessoais" },
  { value: "gestor", label: "Gestor", desc: "Gestão da sua equipa e aprovações" },
  { value: "administrador", label: "Administrador", desc: "Acesso total à plataforma" }
];

export function RegisterPage({ form, onChange, onSubmit, onModeChange, submitting, error }) {
  return (
    <AuthShell error={error}>
      <div className="auth-card-header">
        <div className="auth-card-brand">
          <div className="brand-mark">HI</div>
        </div>
        <h2>Criar conta</h2>
        <p>Preencha os dados abaixo para aceder à plataforma.</p>
      </div>

      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="reg-name">Nome completo</label>
          <input
            id="reg-name"
            type="text"
            placeholder="Ana Martins"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            required
            autoComplete="name"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            placeholder="nome@empresa.pt"
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            required
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={form.password}
            onChange={(e) => onChange({ ...form, password: e.target.value })}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div className="auth-field">
          <label>Perfil de acesso</label>
          <div className="role-selector">
            {roleOptions.map((opt) => (
              <label
                key={opt.value}
                className={`role-option ${form.role === opt.value ? "is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={form.role === opt.value}
                  onChange={() => onChange({ ...form, role: opt.value })}
                />
                <div>
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={submitting} style={{ marginTop: 4 }}>
          {submitting ? "A criar conta..." : "Criar conta"}
        </button>
      </form>

      <p className="auth-switch">
        Já tem conta?{" "}
        <button type="button" className="auth-link" onClick={() => onModeChange("login")}>
          Entrar
        </button>
      </p>
    </AuthShell>
  );
}
