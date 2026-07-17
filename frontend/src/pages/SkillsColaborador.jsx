import { useEffect, useState } from "react";
import { getMyProfile, getTrainings } from "../api";

const LEVEL_LABEL = { beginner: "Iniciante", intermediate: "Intermédio", advanced: "Avançado", expert: "Especialista" };
const LEVEL_COLOR = { beginner: "var(--warning)", intermediate: "var(--primary)", advanced: "var(--success)", expert: "var(--success)" };
const LEVEL_PCT = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 };
const TYPE_LABEL = { completed: "Realizada", planned: "Planeada" };
const TYPE_TONE = { completed: "green", planned: "muted" };

export function SkillsColaborador({ session }) {
  const [profile, setProfile] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("skills");

  const firstName = session.user.name.split(" ")[0];

  useEffect(() => {
    Promise.all([
      getMyProfile(session.token),
      getTrainings(session.token)
    ])
      .then(([prof, trains]) => {
        setProfile(prof);
        setTrainings(trains);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const completed = trainings.filter(t => t.type === "completed");
  const planned = trainings.filter(t => t.type === "planned");
  const skills = profile?.skills || [];
  const certifications = profile?.certifications || [];

  if (loading) return <section className="page stack-lg"><p style={{ color: "var(--text-muted)" }}>A carregar...</p></section>;

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Colaborador · Competências e Formação</span>
          <h2>Olá, {firstName}.</h2>
          <p>As suas competências, certificações e formações.</p>
        </div>
        <div className="hero-score">
          <span>Competências</span>
          <strong>{skills.length}</strong>
          <small>registadas</small>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="perf-tabs">
        <button className={`perf-tab ${tab === "skills" ? "is-active" : ""}`} onClick={() => setTab("skills")}>
          Competências
          {skills.length > 0 && <span className="perf-tab-count">{skills.length}</span>}
        </button>
        <button className={`perf-tab ${tab === "trainings" ? "is-active" : ""}`} onClick={() => setTab("trainings")}>
          Formações
          {trainings.length > 0 && <span className="perf-tab-count">{trainings.length}</span>}
        </button>
      </div>

      {tab === "skills" && (
        <div className="stack-lg">
          {skills.length === 0 ? (
            <div className="empty-state">
              <strong>Sem competências registadas</strong>
              <p>As suas competências são adicionadas pelo gestor ou administrador no seu perfil.</p>
            </div>
          ) : (
            <div className="collab-skills-list">
              {skills.map((skill, i) => (
                <div key={i} className="collab-skill-row">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <strong style={{ fontSize: 14 }}>{skill.name}</strong>
                    <span style={{ fontSize: 13, fontWeight: 600, color: LEVEL_COLOR[skill.level] }}>
                      {LEVEL_LABEL[skill.level] || skill.level}
                    </span>
                  </div>
                  <div className="eval-score-bar">
                    <div
                      className="eval-score-fill"
                      style={{
                        width: `${LEVEL_PCT[skill.level] || 0}%`,
                        background: LEVEL_COLOR[skill.level]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {certifications.length > 0 && (
            <div className="stack-lg">
              <div className="section-title">
                <div>
                  <span className="eyebrow">Certificações</span>
                  <h3>As suas certificações</h3>
                </div>
              </div>
              <div className="eval-table-wrapper">
                <table className="eval-table">
                  <thead>
                    <tr><th>Nome</th><th>Emissor</th><th>Emissão</th><th>Validade</th></tr>
                  </thead>
                  <tbody>
                    {certifications.map((cert, i) => (
                      <tr key={i}>
                        <td><strong>{cert.name}</strong></td>
                        <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{cert.issuer || "—"}</td>
                        <td style={{ fontSize: 13 }}>{cert.issuedAt || "—"}</td>
                        <td style={{ fontSize: 13 }}>{cert.expiresAt || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "trainings" && (
        <div className="stack-lg">
          {trainings.length === 0 ? (
            <div className="empty-state">
              <strong>Sem formações registadas</strong>
              <p>As formações atribuídas pelo seu gestor aparecerão aqui.</p>
            </div>
          ) : (
            <>
              {completed.length > 0 && (
                <div>
                  <div className="section-title" style={{ marginBottom: 12 }}>
                    <span className="eyebrow">Realizadas</span>
                  </div>
                  <div className="collab-eval-list">
                    {completed.map(t => (
                      <div key={t._id} className="collab-eval-card">
                        <div className="collab-eval-card-header" style={{ cursor: "default" }}>
                          <div>
                            <strong>{t.title}</strong>
                            {t.category && <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{t.category}</span>}
                            {t.provider && <small style={{ display: "block", color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{t.provider}</small>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {t.date && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(t.date).toLocaleDateString("pt-PT")}</span>}
                            {t.duration && <span className="score-pill">{t.duration}</span>}
                            <span className={`cycle-status-badge tone-${TYPE_TONE[t.type]}`}>{TYPE_LABEL[t.type]}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {planned.length > 0 && (
                <div>
                  <div className="section-title" style={{ marginBottom: 12 }}>
                    <span className="eyebrow">Planeadas</span>
                  </div>
                  <div className="collab-eval-list">
                    {planned.map(t => (
                      <div key={t._id} className="collab-eval-card">
                        <div className="collab-eval-card-header" style={{ cursor: "default" }}>
                          <div>
                            <strong>{t.title}</strong>
                            {t.category && <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{t.category}</span>}
                            {t.provider && <small style={{ display: "block", color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{t.provider}</small>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {t.date && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(t.date).toLocaleDateString("pt-PT")}</span>}
                            {t.duration && <span className="score-pill">{t.duration}</span>}
                            <span className={`cycle-status-badge tone-${TYPE_TONE[t.type]}`}>{TYPE_LABEL[t.type]}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
