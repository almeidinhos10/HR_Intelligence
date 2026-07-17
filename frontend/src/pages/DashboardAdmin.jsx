import { useEffect, useState } from "react";
import { MetricCard } from "../components/MetricCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { getEmployees, getTrainings, getEvaluations, getCycles, getLeaves } from "../api";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];
const LEVEL_LABEL = { beginner: "Iniciante", intermediate: "Intermédio", advanced: "Avançado", expert: "Especialista" };

function countWorkingDaysSinceYearStart() {
  const start = new Date(new Date().getFullYear(), 0, 1);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

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
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

function PieLabel({ cx, cy, midAngle, outerRadius, name, percent }) {
  if (percent < 0.06) return null;
  const RAD = Math.PI / 180;
  const r = outerRadius + 28;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text x={x} y={y} fill="var(--text-muted)" textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central" fontSize={11}>
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function DashboardAdmin({ session }) {
  const [employees, setEmployees] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getEmployees(session.token),
      getTrainings(session.token),
      getEvaluations(session.token),
      getCycles(session.token),
      getLeaves(session.token)
    ]).then(([emps, trains, evals, cycs, lvs]) => {
      if (emps.status === "fulfilled") setEmployees(emps.value);
      if (trains.status === "fulfilled") setTrainings(trains.value);
      if (evals.status === "fulfilled") setEvaluations(evals.value);
      if (cycs.status === "fulfilled") setCycles(cycs.value);
      if (lvs.status === "fulfilled") setLeaves(lvs.value);
    }).finally(() => setLoading(false));
  }, [session.token]);

  const total = employees.length;
  const active = employees.filter(e => e.status === "active").length;
  const pending = employees.filter(e => e.status === "pending").length;
  const completedTrainings = trainings.filter(t => t.type === "completed").length;

  // Department distribution
  const deptData = Object.entries(
    employees.reduce((acc, e) => {
      if (e.department) acc[e.department] = (acc[e.department] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  // Evaluation evolution per cycle
  const cycleEvalMap = {};
  evaluations.forEach(e => {
    const cName = e.cycle?.name || "Sem ciclo";
    if (!cycleEvalMap[cName]) cycleEvalMap[cName] = { scores: [], total: 0 };
    cycleEvalMap[cName].total++;
    if (e.finalScore != null) cycleEvalMap[cName].scores.push(e.finalScore);
  });
  const cycleData = Object.entries(cycleEvalMap).map(([name, d]) => ({
    name,
    "Média": d.scores.length > 0
      ? parseFloat((d.scores.reduce((s, v) => s + v, 0) / d.scores.length).toFixed(2))
      : 0,
    "Avaliações": d.total
  }));

  // Skills by level
  const skillLevelMap = employees.flatMap(e => e.skills || []).reduce((acc, s) => {
    if (s.level) acc[s.level] = (acc[s.level] || 0) + 1;
    return acc;
  }, {});
  const skillLevelData = ["beginner", "intermediate", "advanced", "expert"]
    .filter(l => skillLevelMap[l])
    .map(l => ({ name: LEVEL_LABEL[l], value: skillLevelMap[l] }));

  // Top skills by name
  const skillNameMap = employees.flatMap(e => e.skills || []).reduce((acc, s) => {
    if (s.name) acc[s.name] = (acc[s.name] || 0) + 1;
    return acc;
  }, {});
  const topSkills = Object.entries(skillNameMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, "Colaboradores": value }));

  // Leaves & absentism
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const approvedLeaves = leaves.filter(l =>
    l.status === "approved" &&
    new Date(l.startDate) <= yearEnd &&
    new Date(l.endDate) >= yearStart
  );
  const vacationDays = approvedLeaves.filter(l => l.type === "vacation").reduce((s, l) => s + l.workingDays, 0);
  const sickDays = approvedLeaves.filter(l => l.type === "sick").reduce((s, l) => s + l.workingDays, 0);
  const otherDays = approvedLeaves.filter(l => l.type === "other").reduce((s, l) => s + l.workingDays, 0);
  const absenceData = [
    { name: "Férias", value: vacationDays, color: "#3b82f6" },
    { name: "Baixa médica", value: sickDays, color: "#f43f5e" },
    { name: "Outro", value: otherDays, color: "#f59e0b" }
  ].filter(d => d.value > 0);

  const workdaysSoFar = countWorkingDaysSinceYearStart();
  const totalPossibleDays = active * workdaysSoFar;
  const absentismPct = totalPossibleDays > 0
    ? ((sickDays / totalPossibleDays) * 100).toFixed(1)
    : "0.0";

  // Strategic alerts
  const alerts = [];
  if (pending > 0) {
    alerts.push({ type: "warning", text: pending === 1
      ? "Há 1 colaborador à espera de ser integrado."
      : `Há ${pending} colaboradores à espera de integração.`
    });
  }
  const pendingGestorLeaves = leaves.filter(l => l.status === "pending" && l.employeeRole === "gestor");
  if (pendingGestorLeaves.length > 0) {
    alerts.push({ type: "warning", text: pendingGestorLeaves.length === 1
      ? "1 pedido de férias de gestor está por aprovar."
      : `${pendingGestorLeaves.length} pedidos de férias de gestores estão por aprovar.`
    });
  }
  const activeCycle = cycles.find(c => c.status === "active");
  if (activeCycle) {
    const evaluatedIds = new Set(
      evaluations
        .filter(e => e.cycle?.name === activeCycle.name)
        .map(e => String(e.employee))
    );
    const unevaluatedCount = employees.filter(
      e => e.status === "active" && !evaluatedIds.has(String(e._id))
    ).length;
    if (unevaluatedCount > 0) {
      alerts.push({ type: "info", text: unevaluatedCount === 1
        ? `1 colaborador ainda não foi avaliado no ciclo "${activeCycle.name}".`
        : `${unevaluatedCount} colaboradores ainda não foram avaliados no ciclo "${activeCycle.name}".`
      });
    }
  }
  if (!loading && trainings.filter(t => t.type === "planned").length === 0) {
    alerts.push({ type: "info", text: "Não há formações planeadas registadas." });
  }

  return (
    <section className="page stack-lg">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Dashboard estratégico</span>
          <h2>Visão global da empresa.</h2>
          <p>Indicadores consolidados de todos os departamentos e colaboradores.</p>
        </div>
        <div className="hero-score">
          <span>Total</span>
          <strong>{loading ? "…" : total}</strong>
          <small>colaboradores</small>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Colaboradores ativos"
          value={loading ? "…" : active}
          detail={`${pending} a integrar · ${total - active - pending} inativos`}
          tone="blue"
          progress={total ? Math.round((active / total) * 100) : 0}
        />
        <MetricCard
          label="Departamentos"
          value={loading ? "…" : deptData.length}
          detail="Com colaboradores registados"
          tone="green"
          progress={Math.min(deptData.length * 16, 100)}
        />
        <MetricCard
          label="Taxa de absentismo"
          value={loading ? "…" : `${absentismPct}%`}
          detail={`${sickDays} dia(s) de baixa médica em ${year}`}
          tone="amber"
          progress={Math.min(parseFloat(absentismPct) * 10, 100)}
        />
        <MetricCard
          label="Formações concluídas"
          value={loading ? "…" : completedTrainings}
          detail={`de ${trainings.length} formações registadas`}
          tone="rose"
          progress={trainings.length ? Math.round((completedTrainings / trainings.length) * 100) : 0}
        />
      </div>

      {!loading && alerts.length > 0 && (
        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Atenção</span>
              <h3>Alertas estratégicos</h3>
            </div>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{alerts.length} alerta(s)</span>
          </div>
          <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a, i) => (
              <li key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                background: a.type === "warning" ? "rgba(245,158,11,.08)" : "rgba(59,130,246,.06)",
                border: `1px solid ${a.type === "warning" ? "rgba(245,158,11,.25)" : "rgba(59,130,246,.2)"}`,
                borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4,
                  background: a.type === "warning" ? "#f59e0b" : "#3b82f6",
                  display: "inline-block"
                }} />
                <span style={{ color: "var(--text)", lineHeight: 1.5 }}>{a.text}</span>
              </li>
            ))}
          </ul>
        </article>
      )}

      <div className="dashboard-grid">
        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Distribuição</span>
              <h3>Colaboradores por departamento</h3>
            </div>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{total} total</span>
          </div>
          {loading ? (
            <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>A carregar...</p>
          ) : deptData.length === 0 ? (
            <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>Sem dados de departamentos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230} style={{ marginTop: 16 }}>
              <BarChart data={deptData} layout="vertical"
                margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "var(--text-muted)" }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120}
                  tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,.04)" }} />
                <Bar dataKey="value" name="Colaboradores" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </article>

        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Desempenho</span>
              <h3>Avaliações por ciclo</h3>
            </div>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{evaluations.length} avaliações</span>
          </div>
          {loading ? (
            <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>A carregar...</p>
          ) : cycleData.length === 0 ? (
            <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>Sem avaliações registadas.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230} style={{ marginTop: 16 }}>
              <BarChart data={cycleData} margin={{ left: 0, right: 16, top: 4, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} domain={[0, 5]} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,.04)" }} />
                <Bar dataKey="Média" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Avaliações" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Competências</span>
              <h3>Distribuição por nível</h3>
            </div>
          </div>
          {loading ? (
            <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>A carregar...</p>
          ) : skillLevelData.length === 0 ? (
            <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>Sem competências registadas nos perfis.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230} style={{ marginTop: 16 }}>
              <PieChart>
                <Pie data={skillLevelData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} labelLine
                  label={<PieLabel />}>
                  {skillLevelData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </article>

        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Férias e ausências</span>
              <h3>Dias aprovados em {year}</h3>
            </div>
          </div>
          {loading ? (
            <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>A carregar...</p>
          ) : absenceData.length === 0 ? (
            <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: 13 }}>
              Sem ausências aprovadas registadas em {year}.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={230} style={{ marginTop: 16 }}>
              <PieChart>
                <Pie data={absenceData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} labelLine
                  label={<PieLabel />}>
                  {absenceData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </article>
      </div>

      {topSkills.length > 0 && (
        <article className="insight-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Competências</span>
              <h3>Top competências da organização</h3>
            </div>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {Object.keys(skillNameMap).length} competências distintas
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200} style={{ marginTop: 16 }}>
            <BarChart data={topSkills} margin={{ left: 0, right: 16, top: 4, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                angle={-20} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,.04)" }} />
              <Bar dataKey="Colaboradores" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
      )}
    </section>
  );
}
