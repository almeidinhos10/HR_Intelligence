import { EmptyState } from "../components/EmptyState";

export function PerformancePage() {
  return (
    <section className="page">
      <EmptyState
        title="Avaliacao de Desempenho"
        message="Aqui vamos criar ciclos de avaliacao, metricas configuraveis, avaliacoes por gestores e historico comparativo."
      />
    </section>
  );
}

