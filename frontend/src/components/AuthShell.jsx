export function AuthShell({ title, subtitle, children, error }) {
  return (
    <main className="auth-screen">
      <section className="auth-visual">
        <div className="brand-block">
          <div className="brand-mark">HI</div>
          <div>
            <h1>{title}</h1>
            <p>People Operations Suite</p>
          </div>
        </div>
        <div className="auth-copy">
          <span className="eyebrow">Plataforma RH</span>
          <h2>Decisoes de pessoas com dados, contexto e confianca.</h2>
          <p>{subtitle}</p>
        </div>
      </section>

      <section className="auth-card">
        {children}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}

