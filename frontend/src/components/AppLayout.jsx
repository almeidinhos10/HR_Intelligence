import { Fragment, useState } from "react";
import { getAvailableModules } from "../utils/permissions";
import {
  LayoutDashboard, Users, User, TrendingUp,
  GraduationCap, CalendarDays, ShieldCheck, UserCog
} from "lucide-react";

const moduleMeta = {
  dashboard:     { icon: LayoutDashboard, description: "Visão executiva" },
  collaborators: { icon: Users,           description: "Perfis e equipas" },
  managers:      { icon: UserCog,         description: "Gestão de gestores" },
  users:         { icon: ShieldCheck,     description: "Gestão de acessos" },
  profile:       { icon: User,            description: "Os meus dados" },
  performance:   { icon: TrendingUp,      description: "Desempenho" },
  skills:        { icon: GraduationCap,   description: "Formações" },
  leaves:        { icon: CalendarDays,    description: "Ausências" }
};

const roleLabel = {
  administrador: "Administrador",
  gestor: "Gestor",
  colaborador: "Colaborador"
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
  const [menuOpen, setMenuOpen] = useState(false);
  const modules = getAvailableModules(session.user.role);
  const initials = session.user.name.slice(0, 2).toUpperCase();

  function handleLogout() {
    setMenuOpen(false);
    onLogout();
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand-block">
          <img 
            src="/RHI.jpg" 
            alt="HR Intelligence" 
            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} 
          />
          <div>
            <h1>HR Intelligence</h1>
            <p>Plataforma de RH</p>
          </div>
        </div>

        <nav className="nav-list">
          {modules.map((module) => {
            const meta = moduleMeta[module.id];
            const Icon = meta?.icon;
            return (
              <Fragment key={module.id}>
                {module.section && (
                  <div className="nav-section">{module.section}</div>
                )}
                <button
                  className={activePage === module.id ? "is-active" : ""}
                  onClick={() => onNavigate(module.id)}
                  aria-current={activePage === module.id ? "page" : undefined}
                >
                  <span className="nav-code">
                    {Icon ? <Icon size={18} strokeWidth={1.8} /> : null}
                  </span>
                  <span>
                    <strong>{module.label}</strong>
                    <small>{meta?.description}</small>
                  </span>
                </button>
              </Fragment>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-actions">
            <button className="ghost-button" onClick={onThemeToggle}>
              {theme === "dark" ? "Light" : "Dark"}
            </button>

            <div className="user-chip-wrapper">
              <button
                className="user-chip"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-label="Menu do utilizador"
              >
                <span>{initials}</span>
                <div>
                  <strong>{session.user.name}</strong>
                  <p>{session.user.email}</p>
                </div>
                <svg
                  className={`chip-chevron ${menuOpen ? "is-open" : ""}`}
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="user-menu-overlay" onClick={() => setMenuOpen(false)} />
                  <div className="user-menu" role="menu">
                    <div className="user-menu-header">
                      <div className="user-menu-avatar">{initials}</div>
                      <div>
                        <strong>{session.user.name}</strong>
                        <p>{session.user.email}</p>
                        <span className="role-badge">{roleLabel[session.user.role]}</span>
                      </div>
                    </div>
                    <hr className="user-menu-divider" />
                    <div className="user-menu-actions">
                      <button onClick={handleLogout}>
                        Sair da conta
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="content-frame">{children}</div>
      </section>
    </main>
  );
}
