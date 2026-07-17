import { useEffect, useState } from "react";
import { MetricCard } from "../components/MetricCard";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from "recharts";
import { getEmployees, getTrainings, getEvaluations, getMyProfile, getLeaves } from "../api";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13,
      boxShadow: "0 4px 16px rgba(0,0,0,.15)"
    }}>
      {label && <p style={{ fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

const TYPE_LABEL = { vacation: "Férias", sick: "Baixa médica", other: "Ausência" };

export function DashboardGestor({ session }) {
  const firstName = session.user.name.split(" ")[0];
  const [myProfile, setMyProfile] = useState(null);
  const [team, setTeam] = useState([]);
  const [pending, setPending] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getMyProfile(session.token),
      getEmployees(session.token),
      getTrainings(session.token),
      getEvaluations(session.token),
      getLeaves(session.token)
    ]).then(([profile, emps, trains, evals, lvs]) => {
      const myName = session.user.name.toLowerCase();
      if (profile.status === "fulfilled") setMyProfile(profile.value);
      if (emps.status === "fulfilled") {
        const all = emps.value;
        setTeam(all.filter(e => e.manager?.toLowerCase() === myName && e.status === "active"));
        setPending(all.filter(e => e.manager?.toLowerCase() === myName && e.status === "pending"));
      }
      if (trains.status === "fulfilled") setTrainings(trains.value);
      if (evals.status === "fulfilled") setEvaluations(evals.value);
      if (lvs.status === "fulfilled") setLeaves(lvs.value);
    }).finally(() => setLoading(false));
  }, [session.token]);

  const planned = trainings.filter(t => t.type === "planned");
  const teamEvals = evaluations.filter(e => e.employeeName !== session.user.name);
  const avgScore = teamEvals.length > 0
    ? (teamEvals.reduce((s, e) => s + (e.finalScore || 0), 0) / teamEvals.length).toFixed(1)
    : null;

  const department = myProfile?.department || null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const teamLeaves = leaves.filter(l => l.employeeRole === "colaborador");
  const pendingTeamLeaves = teamLeaves.filter(l => l.status === "pending");
  const absentToday = teamLeaves.filter(l =>
    l.status === "approved" &&
    new Date(l.startDate) <= today &&
    new Date(l.endDate) >= today
  );
  const absentSoon = teamLeaves.filter(l =>
    l.status === "approved" &&
    new Date(l.startDate) > today &&
    new Date(l.startDate) <= weekEnd
  );

  // Radar chart: team evaluation scores by metric
  const radarData = (() => {
    if (teamEvals.length === 0) return [];
    const metricMap = {};
    teamEvals.forEach(ev => {
      (ev.scores || []).forEach(s => {
        if (!metricMap[s.metricLabel || s.metricKey]) {
          metricMap[s.metricLabel || s.metricKey] = { total: 0, count: 0 };
        }
        metricMap[s.metricLabel || s.metricKey].total += s.score;
        metricMap[s.metricLabel || s.metricKey].count++;
      });
    });
    return Object.entries(metricMap).map(([metric, d]) => ({
      metric,
      "Média equipa": parseFloat((d.total / d.count).toFixed(2))
    }));
  })();

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">
            {department ? `Gestor de ${department}` : `Gestor · ${session.user.name}`}
          </span>
          <h2>Olá, {firstName}.</h2>
          <p>Visão consolidada da sua equipa - integrações, desempenho e ausências.</p>
        </div>
        <div className="hero-score">
          <span>A integrar</span>
          <strong style={{ color: pending.length > 0 ? "var(--warning)" : undefined }}>
            {loading ? "…" : pending.length}
          </strong>
          <small>pendentes</small>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Equipa ativa"
          value={loading ? "…" : team.length}
          detail={`${pending.length} a aguardar integração`}
          tone="blue"
          progress={Math.min(team.length * 10, 100)}
        />
        <MetricCard
          label="Desempenho médio"
          value={loading ? "…" : avgScore ? `${avgScore} / 5` : "—"}
          detail={teamEvals.length > 0 ? `${teamEvals.length} avaliações da equipa` : "Sem avaliações registadas"}
          tone="green"
          progress={avgScore ? Math.round((avgScore / 5) * 100) : 0}
        />
        <MetricCard
          label="Ausentes hoje"
          value={loading ? "…" : absentToday.length}
          detail={absentToday.length > 0
            ? absentToday.map(l => l.employeeName).join(", ")
            : "Toda a equipa presente"}
          tone="amber"
          progress={team.length > 0 ? Math.round((absentToday.length / team.length) * 100) : 0}
        />
        <MetricCard
          label="Formações planeadas"
          value={loading ? "…" : planned.length}
          detail={`${trainings.length} formações no total`}
          tone="rose"
          progress={trainings.length ? Math.round((planned.length / trainings.length) * 100) : 0}
        />
      </div>

      <div className="dashboard-grid">
        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Ausências da equipa</span>
              <h3>Estado atual</h3>
            </div>
            {pendingTeamLeaves.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--warning)" }}>
                {pendingTeamLeaves.length} por aprovar
              </span>
            )}
          </div>
          {loading ? (
            <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>A carregar...</p>
          ) : absentToday.length === 0 && absentSoon.length === 0 ? (
            <ul className="activity-list" style={{ marginTop: 14 }}>
              <li>
                <div>
                  <strong>Toda a equipa presente</strong>
                  <span>Não há ausências aprovadas para hoje ou esta semana</span>
                </div>
                <small>—</small>
              </li>
            </ul>
          ) : (
            <ul className="activity-list" style={{ marginTop: 14 }}>
              {absentToday.map(l => (
                <li key={l._id}>
                  <div>
                    <strong>{l.employeeName}</strong>
                    <span>{TYPE_LABEL[l.type] || "Ausência"}</span>
                  </div>
                  <small style={{ color: "var(--rose)", fontWeight: 600 }}>Hoje</small>
                </li>
              ))}
              {absentSoon.map(l => (
                <li key={l._id}>
                  <div>
                    <strong>{l.employeeName}</strong>
                    <span>{TYPE_LABEL[l.type]} a partir de {new Date(l.startDate).toLocaleDateString("pt-PT")}</span>
                  </div>
                  <small style={{ color: "var(--warning)" }}>Esta semana</small>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Integrações</span>
              <h3>Colaboradores por aprovar</h3>
            </div>
          </div>
          {loading ? (
            <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>A carregar...</p>
          ) : pending.length === 0 ? (
            <ul className="activity-list" style={{ marginTop: 14 }}>
              <li>
                <div>
                  <strong>Nenhuma integração pendente</strong>
                  <span>Os novos colaboradores da sua equipa aparecerão aqui</span>
                </div>
                <small>—</small>
              </li>
            </ul>
          ) : (
            <ul className="activity-list" style={{ marginTop: 14 }}>
              {pending.map(e => (
                <li key={e._id}>
                  <div>
                    <strong>{e.name}</strong>
                    <span>{e.jobTitle || e.department || "Novo colaborador"}</span>
                  </div>
                  <small style={{ color: "var(--warning)" }}>Pendente</small>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      {radarData.length >= 3 && (
        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Desempenho da equipa</span>
              <h3>Médias por critério de avaliação</h3>
            </div>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {teamEvals.length} avaliações
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260} style={{ marginTop: 8 }}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="var(--line)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <Radar name="Média equipa" dataKey="Média equipa"
                stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </article>
      )}

      <article className="insight-panel">
        <div className="section-title">
          <div>
            <span className="eyebrow">Formações da equipa</span>
            <h3>Próximas formações</h3>
          </div>
        </div>
        {loading ? (
          <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>A carregar...</p>
        ) : planned.length === 0 ? (
          <ul className="activity-list" style={{ marginTop: 14 }}>
            <li>
              <div>
                <strong>Nenhuma formação planeada</strong>
                <span>As formações futuras da equipa aparecerão aqui</span>
              </div>
              <small>—</small>
            </li>
          </ul>
        ) : (
          <ul className="activity-list" style={{ marginTop: 14 }}>
            {planned.slice(0, 5).map(t => (
              <li key={t._id}>
                <div>
                  <strong>{t.title}</strong>
                  <span>{t.provider || t.category || "Formação planeada"}</span>
                </div>
                <small>{t.date ? new Date(t.date).toLocaleDateString("pt-PT") : "—"}</small>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
