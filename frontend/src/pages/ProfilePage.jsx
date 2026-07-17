import { useEffect, useState } from "react";
import { getMyProfile } from "../api";
import { EmptyState } from "../components/EmptyState";

const SKILL_LEVELS = {
  beginner: "Iniciante",
  intermediate: "Intermédio",
  advanced: "Avançado",
  expert: "Especialista"
};

const CONTRACT_TYPES = {
  permanent: "Sem termo",
  "fixed-term": "Termo certo",
  internship: "Estágio",
  contractor: "Prestador de serviços"
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="profile-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ProfilePage({ session }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProfile(session.token)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [session.token]);

  if (loading) {
    return (
      <section className="page">
        <div className="table-skeleton">
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="page">
        <EmptyState
          title="Perfil não configurado"
          message="O seu perfil de colaborador ainda não foi criado pelo administrador. O email da sua conta tem de coincidir com o email do perfil de colaborador."
        />
      </section>
    );
  }

  const initials = profile.name.slice(0, 2).toUpperCase();
  const contractType = CONTRACT_TYPES[profile.contract?.type] || null;
  const startDate = profile.contract?.startDate
    ? new Date(profile.contract.startDate).toLocaleDateString("pt-PT")
    : null;
  const endDate = profile.contract?.endDate
    ? new Date(profile.contract.endDate).toLocaleDateString("pt-PT")
    : null;

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div className="profile-avatar">{initials}</div>
          <div>
            <span className="eyebrow">O meu perfil</span>
            <h2 style={{ margin: "6px 0 4px" }}>{profile.name}</h2>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              {[profile.jobTitle, profile.department].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="detail-section" style={{ display: "grid", gap: 16 }}>
          <article className="insight-panel">
            <div className="section-title">
              <div>
                <span className="eyebrow">Dados pessoais</span>
                <h3>Informação de contacto</h3>
              </div>
            </div>
            <div className="profile-info-grid">
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Telefone" value={profile.phone} />
              <InfoRow label="Cargo" value={profile.jobTitle} />
            </div>
          </article>

          <article className="insight-panel">
            <div className="section-title">
              <div>
                <span className="eyebrow">Organização</span>
                <h3>Equipa e contrato</h3>
              </div>
            </div>
            <div className="profile-info-grid">
              <InfoRow label="Departamento" value={profile.department} />
              <InfoRow label="Equipa" value={profile.team} />
              <InfoRow label="Gestor" value={profile.manager} />
              <InfoRow label="Tipo de contrato" value={contractType} />
              <InfoRow label="Início" value={startDate} />
              <InfoRow label="Fim" value={endDate} />
              <InfoRow label="Banda salarial" value={profile.contract?.salaryBand} />
            </div>
          </article>
        </div>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <article className="insight-panel">
            <div className="section-title">
              <div>
                <span className="eyebrow">Competências</span>
                <h3>As minhas skills</h3>
              </div>
            </div>
            {profile.skills?.length > 0 ? (
              <ul className="skill-list" style={{ marginTop: 14 }}>
                {profile.skills.map((skill, i) => (
                  <li key={i} className="skill-pill">
                    <span>{skill.name}</span>
                    <em>{SKILL_LEVELS[skill.level] ?? skill.level}</em>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--text-muted)", marginTop: 12 }}>
                Sem competências registadas.
              </p>
            )}
          </article>

          <article className="insight-panel">
            <div className="section-title">
              <div>
                <span className="eyebrow">Certificações</span>
                <h3>Credenciais</h3>
              </div>
            </div>
            {profile.certifications?.length > 0 ? (
              <ul className="activity-list" style={{ marginTop: 14 }}>
                {profile.certifications.map((cert, i) => (
                  <li key={i}>
                    <div>
                      <strong>{cert.name}</strong>
                      <span>{cert.issuer}</span>
                    </div>
                    <small>{cert.expiresAt ? `Válido até ${cert.expiresAt}` : cert.issuedAt}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--text-muted)", marginTop: 12 }}>
                Sem certificações registadas.
              </p>
            )}
          </article>
        </div>
      </div>

      {profile.professionalHistory?.length > 0 && (
        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Histórico</span>
              <h3>Experiência profissional</h3>
            </div>
          </div>
          <ul className="activity-list" style={{ marginTop: 14 }}>
            {profile.professionalHistory.map((item, i) => (
              <li key={i}>
                <div>
                  <strong>{[item.role, item.company].filter(Boolean).join(" — ")}</strong>
                  <span>{item.notes}</span>
                </div>
                <small>
                  {[item.startDate, item.endDate].filter(Boolean).join(" → ")}
                </small>
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
}
