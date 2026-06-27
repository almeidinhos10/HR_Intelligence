import { MetricCard } from "../components/MetricCard";

const activity = [
  { label: "Novo ciclo de avaliacao preparado", meta: "Gestores", status: "Planeado" },
  { label: "Pedidos de ferias aguardam aprovacao", meta: "Operacoes", status: "Prioritario" },
  { label: "Matriz de competencias em revisao", meta: "Formacao", status: "Em curso" }
];

export function DashboardPage({ session }) {
  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Dashboard estrategico</span>
          <h2>Boa gestao comeca por visibilidade clara.</h2>
          <p>
            Visao inicial adaptada ao perfil {session.user.role}, preparada para
            acompanhar indicadores de pessoas, desempenho e ausencias.
          </p>
        </div>
        <div className="hero-score" aria-label="Indice de maturidade RH">
          <span>HRI</span>
          <strong>82</strong>
          <small>indice interno</small>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Colaboradores"
          value="4.1"
          detail="Perfis, contratos e equipas"
          tone="blue"
          progress={72}
        />
        <MetricCard
          label="Avaliacao"
          value="4.2"
          detail="Ciclos e metricas"
          tone="green"
          progress={54}
        />
        <MetricCard
          label="Competencias"
          value="4.3"
          detail="Matriz e formacao"
          tone="amber"
          progress={48}
        />
        <MetricCard
          label="Ferias"
          value="4.4"
          detail="Saldos e aprovacoes"
          tone="rose"
          progress={61}
        />
      </div>

      <div className="dashboard-grid">
        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Distribuicao</span>
              <h3>Indicadores previstos</h3>
            </div>
          </div>
          <div className="bar-list">
            <div>
              <span>Colaboradores por departamento</span>
              <strong>76%</strong>
              <em style={{ width: "76%" }} />
            </div>
            <div>
              <span>Evolucao de desempenho</span>
              <strong>64%</strong>
              <em style={{ width: "64%" }} />
            </div>
            <div>
              <span>Taxa de absentismo</span>
              <strong>31%</strong>
              <em style={{ width: "31%" }} />
            </div>
          </div>
        </article>

        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Atividade</span>
              <h3>Resumo operacional</h3>
            </div>
          </div>
          <ul className="activity-list">
            {activity.map((item) => (
              <li key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.meta}</span>
                </div>
                <small>{item.status}</small>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

