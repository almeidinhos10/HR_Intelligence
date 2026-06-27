import { getAvailableModules } from "../utils/permissions";

const moduleMeta = {
  dashboard: { code: "DB", description: "Visao executiva" },
  collaborators: { code: "CO", description: "Perfis e equipas" },
  performance: { code: "AV", description: "Desempenho" },
  skills: { code: "CP", description: "Competencias" },
  leaves: { code: "FE", description: "Ausencias" }
};

export function AppLayout({
  session,
  activePage,
  theme,
  onThemeToggle,
  onNavigate,
  onLogout,
  children
}) {
  const modules = getAvailableModules(session.user.role);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <div className="brand-block">
          <div className="brand-mark">HI</div>
          <div>
            <h1>HR Intelligence</h1>
            <p>People Operations Suite</p>
          </div>
        </div>

        <nav className="nav-list">
          {modules.map((module) => {
            const meta = moduleMeta[module.id];
            return (
              <button
                key={module.id}
                className={activePage === module.id ? "is-active" : ""}
                onClick={() => onNavigate(module.id)}
                aria-current={activePage === module.id ? "page" : undefined}
              >
                <span className="nav-code">{meta?.code}</span>
                <span>
                  <strong>{module.label}</strong>
                  <small>{meta?.description}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <span>Perfil ativo</span>
          <strong>{session.user.role}</strong>
          <p>Permissoes aplicadas automaticamente.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="search-shell" aria-label="Pesquisa">
            <span aria-hidden="true">S</span>
            <input type="search" placeholder="Pesquisar colaboradores, equipas..." />
          </div>

          <div className="topbar-actions">
            <button className="ghost-button" onClick={onThemeToggle}>
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <div className="user-chip">
              <span>{session.user.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{session.user.name}</strong>
                <p>{session.user.email}</p>
              </div>
            </div>
            <button onClick={onLogout}>Sair</button>
          </div>
        </header>

        <div className="content-frame">{children}</div>
      </section>
    </main>
  );
}
