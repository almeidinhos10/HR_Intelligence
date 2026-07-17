import { useEffect, useState } from "react";
import { MetricCard } from "../components/MetricCard";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { getTrainings, getEvaluations, getLeaves, getLeaveBalance } from "../api";

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
        <p key={i} style={{ color: p.fill || p.color, margin: "2px 0" }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export function DashboardColaborador({ session }) {
  const firstName = session.user.name.split(" ")[0];
  const [trainings, setTrainings] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  const year = new Date().getFullYear();

  useEffect(() => {
    Promise.allSettled([
      getTrainings(session.token),
      getEvaluations(session.token),
      getLeaves(session.token),
      getLeaveBalance(session.token, year)
    ]).then(([trains, evals, lvs, bal]) => {
      if (trains.status === "fulfilled") setTrainings(trains.value);
      if (evals.status === "fulfilled") setEvaluations(evals.value);
      if (lvs.status === "fulfilled") setLeaves(lvs.value);
      if (bal.status === "fulfilled") setBalance(bal.value);
    }).finally(() => setLoading(false));
  }, [session.token]);

  const planned = trainings.filter(t => t.type === "planned");
  const completed = trainings.filter(t => t.type === "completed");
  const pendingLeaves = leaves.filter(l => l.status === "pending").length;

  const lastEval = evaluations.length > 0
    ? evaluations.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
    : null;
  const lastScore = lastEval?.finalScore ?? null;

  // Radar chart: scores of the most recent evaluation by metric
  const radarData = (() => {
    if (!lastEval?.scores?.length) return [];
    return lastEval.scores.map(s => ({
      metric: s.metricLabel || s.metricKey,
      "Pontuação": s.score
    }));
  })();

  // Evaluation history bar chart
  const evalHistory = [...evaluations]
    .filter(e => e.finalScore != null)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(e => ({
      name: e.cycle?.name || "Ciclo",
      "Nota": e.finalScore
    }));

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Colaborador · {session.user.name}</span>
          <h2>Olá, {firstName}.</h2>
          <p>O seu resumo pessoal - avaliações, formações e saldo de férias.</p>
        </div>
        <div className="hero-score">
          <span>Saldo {year}</span>
          <strong style={{ color: balance && balance.remainingDays > 5 ? "var(--success)" : "var(--warning)" }}>
            {loading ? "…" : balance ? balance.remainingDays : "—"}
          </strong>
          <small>dias disponíveis</small>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Formações planeadas"
          value={loading ? "…" : planned.length}
          detail={`${completed.length} já realizadas`}
          tone="blue"
          progress={trainings.length ? Math.round((completed.length / trainings.length) * 100) : 0}
        />
        <MetricCard
          label="Última avaliação"
          value={loading ? "…" : lastScore != null ? `${lastScore.toFixed(1)} / 5` : "—"}
          detail={lastEval ? lastEval.cycle?.name || "Ciclo de avaliação" : "Sem avaliações registadas"}
          tone="green"
          progress={lastScore != null ? Math.round((lastScore / 5) * 100) : 0}
        />
        <MetricCard
          label="Saldo de férias"
          value={loading ? "…" : balance ? `${balance.remainingDays}d` : "—"}
          detail={balance
            ? `de ${balance.totalDays} dias · ${balance.usedDays} utilizados`
            : "Sem dados de contrato"}
          tone="amber"
          progress={balance?.totalDays > 0
            ? Math.round(((balance.totalDays - balance.remainingDays) / balance.totalDays) * 100)
            : 0}
        />
        <MetricCard
          label="Pedidos pendentes"
          value={loading ? "…" : pendingLeaves}
          detail={pendingLeaves > 0 ? "A aguardar aprovação do gestor" : "Nenhum pedido em aprovação"}
          tone="rose"
          progress={pendingLeaves > 0 ? 50 : 0}
        />
      </div>

      <div className="dashboard-grid">
        {evalHistory.length >= 2 ? (
          <article className="insight-panel">
            <div className="section-title">
              <div>
                <span className="eyebrow">Desempenho</span>
                <h3>Evolução das avaliações</h3>
              </div>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{evaluations.length} avaliações</span>
            </div>
            <ResponsiveContainer width="100%" height={200} style={{ marginTop: 16 }}>
              <BarChart data={evalHistory} margin={{ left: 0, right: 16, top: 4, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  angle={-15} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} domain={[0, 5]} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,.04)" }} />
                <Bar dataKey="Nota" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </article>
        ) : (
          <article className="insight-panel">
            <div className="section-title">
              <div>
                <span className="eyebrow">Avaliações</span>
                <h3>Histórico de avaliações</h3>
              </div>
            </div>
            {loading ? (
              <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>A carregar...</p>
            ) : evaluations.length === 0 ? (
              <ul className="activity-list" style={{ marginTop: 14 }}>
                <li>
                  <div>
                    <strong>Sem avaliações registadas</strong>
                    <span>As suas avaliações de desempenho aparecerão aqui</span>
                  </div>
                  <small>—</small>
                </li>
              </ul>
            ) : (
              <ul className="activity-list" style={{ marginTop: 14 }}>
                {evaluations.slice(0, 5).map(ev => (
                  <li key={ev._id}>
                    <div>
                      <strong>{ev.cycle?.name || "Ciclo de avaliação"}</strong>
                      <span>Avaliado por {ev.evaluatorName}</span>
                    </div>
                    <small style={{
                      color: ev.finalScore >= 4 ? "var(--success)" : ev.finalScore >= 3 ? "var(--primary)" : "var(--warning)",
                      fontWeight: 600
                    }}>
                      {ev.finalScore != null ? `${ev.finalScore.toFixed(1)} / 5` : "—"}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        )}

        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Formações</span>
              <h3>Próximas formações planeadas</h3>
            </div>
          </div>
          {loading ? (
            <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>A carregar...</p>
          ) : planned.length === 0 ? (
            <ul className="activity-list" style={{ marginTop: 14 }}>
              <li>
                <div>
                  <strong>Nenhuma formação planeada</strong>
                  <span>As suas formações futuras aparecerão aqui</span>
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
      </div>

      {radarData.length >= 3 && (
        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Última avaliação</span>
              <h3>Pontuação por critério — {lastEval?.cycle?.name}</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260} style={{ marginTop: 8 }}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="var(--line)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <Radar name="Pontuação" dataKey="Pontuação"
                stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </article>
      )}
    </section>
  );
}
