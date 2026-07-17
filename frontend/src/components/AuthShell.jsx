import React, { useState } from 'react'

const tabs = [
  "Colaboradores",
  "Avaliações", 
  "Férias",
  "Competências"
];

export function AuthShell({ children, error }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <main className="auth-screen">
      <section className="auth-visual">
        <div className="auth-brand">
          <img 
            src="/RHI.jpg" 
            alt="HR Intelligence" 
            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} 
          />
          <span>HR Intelligence</span>
        </div>

        <div className="auth-copy">
          <h2>Menos burocracia, mais pessoas</h2>
          <p>Porque o seu tempo é melhor gasto a ouvir, apoiar e desenvolver a equipa, não a preencher formulários. Nós tratamos do resto.</p>
        </div>

        <div className="auth-tabs">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              className={`auth-tab ${activeTab === i ? "auth-tab--active" : ""}`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="auth-tab-content">
          {activeTab === 0 && (
            <div className="auth-feature-card">
              <strong>Perfis completos de colaboradores</strong>
              <p>Tudo o que precisa saber sobre cada pessoa da sua equipa num só clique. Para decisões mais justas e humanas.</p>
            </div>
          )}
          {activeTab === 1 && (
            <div className="auth-feature-card">
              <strong>Ciclos de avaliação configuráveis</strong>
              <p>Defina métricas, avalie equipas e acompanhe a evolução do desempenho ao longo do tempo.</p>
            </div>
          )}
          {activeTab === 2 && (
            <div className="auth-feature-card">
              <strong>Férias sem papel e sem espera</strong>
              <p>Pedidos, aprovações, calendário de equipa e cálculo automático de saldos — tudo integrado.</p>
            </div>
          )}
          {activeTab === 3 && (
            <div className="auth-feature-card">
              <strong>Matriz de competências da equipa</strong>
              <p>Identifique lacunas, registe formações e planeie o desenvolvimento de cada colaborador.</p>
            </div>
          )}
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          {children}
          {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
        </div>
      </section>
    </main>
  );
}