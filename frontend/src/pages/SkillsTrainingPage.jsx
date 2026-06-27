import { EmptyState } from "../components/EmptyState";

export function SkillsTrainingPage() {
  return (
    <section className="page">
      <EmptyState
        title="Competencias e Formacao"
        message="Este modulo vai apresentar matriz de competencias, lacunas, formacoes realizadas e planeamento futuro."
      />
    </section>
  );
}

