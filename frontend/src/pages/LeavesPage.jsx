import { EmptyState } from "../components/EmptyState";

export function LeavesPage() {
  return (
    <section className="page">
      <EmptyState
        title="Ferias e Ausencias"
        message="Aqui entram pedidos de ferias, aprovacoes, saldos anuais, conflitos, periodos bloqueados e calendario."
      />
    </section>
  );
}

