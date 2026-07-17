import { useState } from "react";
import { AuthShell } from "../components/AuthShell";
import { setupPassword } from "../api";

export function SetPasswordPage({ token, onSuccess }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError("As passwords não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A password deve ter pelo menos 6 caracteres.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const data = await setupPassword({ token, password });
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell error={error}>
      <div className="auth-card-header">
        <div className="auth-card-brand"></div>
        <h2>Ativar conta</h2>
        <p>Defina a sua password para aceder à plataforma.</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label>Nova password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            autoFocus
          />
        </div>

        <div className="auth-field">
          <label>Confirmar password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a password"
            required
          />
        </div>

        <button type="submit" disabled={submitting} style={{ marginTop: 4 }}>
          {submitting ? "A ativar..." : "Ativar conta"}
        </button>
      </form>
    </AuthShell>
  );
}
