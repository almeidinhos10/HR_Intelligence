import { useEffect, useState } from "react";
import { getEvaluations } from "../api";

const SCORE_COLOR = (score) => {
  if (score >= 4.5) return "var(--success)";
  if (score >= 3.5) return "var(--primary)";
  if (score >= 2.5) return "var(--warning)";
  return "var(--rose)";
};

const SCORE_LABEL = (score) => {
  if (score >= 4.5) return "Excelente";
  if (score >= 3.5) return "Bom";
  if (score >= 2.5) return "Satisfatório";
  if (score >= 1.5) return "A Melhorar";
  return "Insatisfatório";
};

export function PerformanceColaborador({ session }) {
  const [evaluations, setEvaluations] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const firstName = session.user.name.split(" ")[0];

  useEffect(() => {
    getEvaluations(session.token)
      .then(setEvaluations)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const latestScore = evaluations[0]?.finalScore ?? null;

  if (loading) {
    return (
      <section className="page stack-lg">
        <p style={{ color: "var(--text-muted)" }}>A carregar...</p>
      </section>
    );
  }

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Colaborador · Avaliação de Desempenho</span>
          <h2>Olá, {firstName}.</h2>
          <p>Consulte as suas avaliações de desempenho e acompanhe a sua evolução.</p>
        </div>
        {latestScore != null && (
          <div className="hero-score" aria-label="Última nota">
            <span>Última nota</span>
            <strong style={{ color: SCORE_COLOR(latestScore) }}>{latestScore.toFixed(1)}</strong>
            <small>{SCORE_LABEL(latestScore)}</small>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {evaluations.length === 0 ? (
        <div className="empty-state">
          <strong>Sem avaliações</strong>
          <p>Ainda não tem avaliações de desempenho registadas. O seu gestor avaliará o seu desempenho quando o próximo ciclo for ativado.</p>
        </div>
      ) : (
        <div className="stack-lg">
          <div className="section-title">
            <div>
              <span className="eyebrow">Histórico</span>
              <h3>As suas avaliações</h3>
            </div>
          </div>

          <div className="collab-eval-list">
            {evaluations.map((ev) => {
              const isOpen = expanded.has(ev._id);
              const score = ev.finalScore;

              return (
                <div key={ev._id} className="collab-eval-card">
                  <button
                    type="button"
                    className="collab-eval-card-header"
                    onClick={() => toggleExpand(ev._id)}
                    aria-expanded={isOpen}
                  >
                    <div>
                      <strong>{ev.cycle?.name || "Ciclo sem nome"}</strong>
                      <span style={{ color: "var(--text-muted)", fontSize: 13, marginLeft: 10 }}>
                        {new Date(ev.createdAt).toLocaleDateString("pt-PT")}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {score != null && (
                        <div className="eval-score-display">
                          <span
                            className="eval-score-number"
                            style={{ color: SCORE_COLOR(score) }}
                          >
                            {score.toFixed(1)}
                          </span>
                          <span className="eval-score-max">/ 5</span>
                          <div className="eval-score-bar">
                            <div
                              className="eval-score-fill"
                              style={{
                                width: `${(score / 5) * 100}%`,
                                background: SCORE_COLOR(score)
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <svg
                        style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 160ms", color: "var(--text-muted)" }}
                        width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                      >
                        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="collab-eval-details">
                      {ev.scores.map((s) => (
                        <div key={s.metricKey} className="collab-metric-row">
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13 }}>{s.metricLabel || s.metricKey}</span>
                            <span
                              style={{ fontSize: 13, fontWeight: 700, color: SCORE_COLOR(s.score) }}
                            >
                              {s.score} / 5
                            </span>
                          </div>
                          <div className="eval-score-bar">
                            <div
                              className="eval-score-fill"
                              style={{
                                width: `${(s.score / 5) * 100}%`,
                                background: SCORE_COLOR(s.score)
                              }}
                            />
                          </div>
                          {s.comment && (
                            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                              {s.comment}
                            </p>
                          )}
                        </div>
                      ))}

                      {ev.overallComment && (
                        <div className="collab-eval-comment">
                          <span className="eyebrow">Comentário do avaliador</span>
                          <p>{ev.overallComment}</p>
                        </div>
                      )}

                      <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                        Avaliado por {ev.evaluatorName}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
