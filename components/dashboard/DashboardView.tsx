"use client";
import { useEffect, useRef, useState } from "react";
import type { QueueConfig, QueueLive, HourPoint, AgentConfig, DayPoint, AbandonedCaller } from "@/lib/types";
import { fmt, mmss, stateFor, titleCase, formatPhone, hhmmFromDb } from "@/lib/format";
import AgentsDonut from "@/components/charts/AgentsDonut";
import DailyBarChart from "@/components/charts/DailyBarChart";
import {
  PhoneIncoming, PhoneCall, PhoneMissed, Target, Clock, Timer,
  Users, Activity, AlertTriangle, BarChart3, Database,
} from "lucide-react";

const POLL_MS = 5000;
const HELP_DESK_QUEUE = "Help_Desk";

/**
 * Painel do Help Desk.
 * `homolog` liga os ajustes em validação com o cliente (rota /homologacao):
 * ordem dos meses invertida, quantidade acima das colunas, nível de serviço
 * iniciando em 100% e nomes padronizados. Produção (/dashboard) fica sem eles.
 */
export default function DashboardView({
  homolog = false,
  badge,
}: {
  homolog?: boolean;
  /** Selo exibido ao lado do título (ex.: "Homologação"). Independe das funcionalidades. */
  badge?: string;
}) {
  const [config, setConfig] = useState<QueueConfig | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [live, setLive] = useState<QueueLive | null>(null);
  const [daily, setDaily] = useState<DayPoint[]>([]);
  const [now, setNow] = useState(new Date());
  const [queueId, setQueueId] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [abandoned, setAbandoned] = useState<AbandonedCaller[] | null>(null);
  const [abdDay, setAbdDay] = useState<string | null>(null); // "YYYY-MM-DD" escolhido no gráfico; null = hoje
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const agentTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  // Detectar a fila Help_Desk automaticamente
  useEffect(() => {
    fetch("/api/queues").then((r) => r.json()).then((j) => {
      if (j.ok && j.queues.length) {
        const hd = j.queues.find((x: QueueConfig) => x.name.includes(HELP_DESK_QUEUE));
        const q = hd || j.queues[0];
        setQueueId(q.id);
        setConfig(q);
      } else {
        setCfgError(j.error || "Falha ao listar filas");
      }
    }).catch((e) => setCfgError(String(e)));
  }, []);

  // Carregar daily
  useEffect(() => {
    if (!queueId) return;
    let alive = true;
    function fetchDaily() {
      fetch(`/api/queues/${queueId}/daily`).then((r) => r.json()).then((j) => {
        if (alive) setDaily(j.daily || []);
      }).catch(() => {});
    }
    fetchDaily();
    const t = setInterval(fetchDaily, 300000); // Atualiza a cada 5 min
    return () => { alive = false; clearInterval(t); };
  }, [queueId]);

  // Números que abandonaram (homologação). Sem dia escolhido = hoje, atualizado a cada minuto;
  // dia escolhido no gráfico = consulta única, pois é histórico fechado.
  useEffect(() => {
    if (!queueId || !homolog) return;
    let alive = true;
    setAbandoned(null);
    function fetchAbandoned() {
      const q = abdDay ? `?day=${abdDay}` : "";
      fetch(`/api/queues/${queueId}/abandoned${q}`, { cache: "no-store" }).then((r) => r.json()).then((j) => {
        if (alive) setAbandoned(j.abandoned || []);
      }).catch(() => {});
    }
    fetchAbandoned();
    const t = abdDay ? null : setInterval(fetchAbandoned, 60000);
    return () => { alive = false; if (t) clearInterval(t); };
  }, [queueId, homolog, abdDay]);

  // Clique no mesmo dia de novo volta para hoje.
  const selectAbandonedDay = (day: string) => setAbdDay((cur) => (cur === day ? null : day));

  // Poll realtime
  useEffect(() => {
    if (!queueId || !config) return;
    let alive = true;
    async function poll() {
      try {
        const nameQ = config?.name ? `?name=${encodeURIComponent(config.name)}` : "";
        const r = await fetch(`/api/queues/${queueId}/realtime${nameQ}`, { cache: "no-store" });
        const j: QueueLive = await r.json();
        if (alive) setLive(j);
      } catch { /* mantém */ }
    }
    poll();
    timer.current = setInterval(poll, POLL_MS);
    return () => { alive = false; if (timer.current) clearInterval(timer.current); };
  }, [queueId, config?.name]);

  // Poll agents (Finesse Team API)
  useEffect(() => {
    let alive = true;
    async function pollAgents() {
      try {
        const r = await fetch("/api/agents", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (j.ok) { setAgents(j.agents); setAgentsError(null); }
        else setAgentsError(j.error || `Erro HTTP ${j.status}`);
      } catch (e: any) {
        if (alive) setAgentsError(String(e?.message || e));
      }
    }
    pollAgents();
    agentTimer.current = setInterval(pollAgents, POLL_MS);
    return () => { alive = false; if (agentTimer.current) clearInterval(agentTimer.current); };
  }, []);

  if (cfgError) return (
    <div className="dash-full">
      <div className="panel"><div className="empty"><div className="ico"><AlertTriangle color="var(--crit)" /></div>
        <h4>Não foi possível conectar</h4><p>{cfgError}</p>
        <p style={{ color: "var(--text-mute)" }}>Verifique a VPN e as credenciais em <code>.env.local</code>.</p></div></div>
    </div>
  );
  if (!config) return <div className="dash-full"><div className="panel"><div className="empty"><div className="spinner" /><p>Conectando à fonte de dados…</p></div></div></div>;

  const k = live?.kpis ?? null;
  const inst = live?.instant ?? null;
  const hasAgents = inst?.agentsLogged != null;
  const hasQueue = inst?.callsWaiting != null;
  const target = config.serviceLevelPct;

  const ansPct = k && k.received ? Math.round((k.answered / k.received) * 100) : null;
  const abaPct = k && k.received ? Math.round((k.abandoned / k.received) * 100) : null;
  // Homologação: dia sem chamadas começa em 100% (nenhuma fora do nível de serviço).
  const slValue = k ? (homolog && k.received === 0 ? 100 : k.slPct) : null;
  const slState = slValue != null ? (slValue >= target ? "ok" : slValue >= target - 15 ? "warn" : "crit") : undefined;

  // Saúde da operação
  const health = (() => {
    if (!k) return { s: "warn", label: "Sem dados" };
    const bad = (abaPct ?? 0) > 10 || k.slPct < target - 15 || (hasQueue && (inst?.callsWaiting ?? 0) > 5);
    const mid = (abaPct ?? 0) > 5 || k.slPct < target || (hasQueue && (inst?.callsWaiting ?? 0) > 2);
    return bad ? { s: "crit", label: "Crítico" } : mid ? { s: "warn", label: "Atenção" } : { s: "ok", label: "Operação saudável" };
  })();

  // Detalhamento POR DIA — mês atual e mês anterior (cada dia = 3 barras)
  const currentMonthNum = now.getMonth();
  const prevMonthNum = currentMonthNum === 0 ? 11 : currentMonthNum - 1;
  const currentYear = now.getFullYear();
  const prevMonthYear = currentMonthNum === 0 ? currentYear - 1 : currentYear;

  const dayBars = (monthNum: number, year: number) => daily
    .filter((d) => { const dt = new Date(d.day + "T12:00:00"); return dt.getMonth() === monthNum && dt.getFullYear() === year; })
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((d) => ({ day: d.day, label: String(Number(d.day.slice(8, 10))), received: d.received, answered: d.answered, abandoned: d.abandoned }));

  const currMonthBars = dayBars(currentMonthNum, currentYear);
  const prevMonthBars = dayBars(prevMonthNum, prevMonthYear);
  const monthName = (m: number, y: number) => new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="dash-full">
      <header className="noc-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <img src="/yamaha-logo.png" alt="Yamaha" className="noc-logo" style={{ height: "70px", objectFit: "contain", background: "white", padding: "6px 12px", borderRadius: "8px" }} />
          <h1 className="noc-title" style={{ fontSize: "2.4rem", fontWeight: "700", margin: 0, letterSpacing: "-0.02em" }}>Fila Help Desk</h1>
          {badge && (
            <span className="chip chip--wait" style={{ fontSize: ".72rem", alignSelf: "center" }}>{badge}</span>
          )}
        </div>
        <div className="noc-clock" style={{ textAlign: "right" }}>
          <div className="t" style={{ fontSize: "1.2rem", fontWeight: "600" }}>{now.toLocaleTimeString("pt-BR")}</div>
          <div className="d" style={{ fontSize: "0.85rem", color: "var(--text-mute)" }}>{now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</div>
        </div>
      </header>

      {/* KPI instruments */}
      <div className="kpis">
        <Kpi ico={<PhoneIncoming size={15} />} label="Recebidas" value={fmt(k?.received)} foot="no dia" />
        <Kpi ico={<PhoneCall size={15} />} label="Atendidas" value={fmt(k?.answered)} foot={ansPct != null ? `${ansPct}% do total` : ""} s="ok" />
        <Kpi ico={<PhoneMissed size={15} />} label="Abandonadas" value={fmt(k?.abandoned)} foot={abaPct != null ? `${abaPct}% do total` : ""} s={stateFor(abaPct ?? undefined, 5, 10)} />
        <Kpi ico={<Target size={15} />} label="Nível de Serviço" value={slValue != null ? `${slValue}%` : "—"} s={slState} />
        <Kpi ico={<Clock size={15} />} label="T. Médio Espera" value={mmss(k?.avgWaitSec)} foot="TME" s={stateFor(k?.avgWaitSec, 20, 45)} />
        <Kpi ico={<Timer size={15} />} label="T. Médio Atend." value={mmss(k?.avgHandleSec ?? undefined)} foot="TMA" />
      </div>

      <div className="grid">
        {/* Homologação: mês anterior antes do atual. Produção: atual antes do anterior. */}
        {(homolog
          ? [
              { bars: prevMonthBars, label: monthName(prevMonthNum, prevMonthYear), empty: "Sem dados no mês anterior." },
              { bars: currMonthBars, label: monthName(currentMonthNum, currentYear), empty: "Sem dados no mês atual." },
            ]
          : [
              { bars: currMonthBars, label: monthName(currentMonthNum, currentYear), empty: "Sem dados no mês atual." },
              { bars: prevMonthBars, label: monthName(prevMonthNum, prevMonthYear), empty: "Sem dados no mês anterior." },
            ]
        ).map((m) => (
          <div className="panel panel--wide" key={m.label}>
            <div className="panel__hd">
              <h3><BarChart3 size={14} /> Volume diário — {m.label}</h3>
              <div className="legend"><i className="rec">Recebidas</i><i className="ans">Atendidas</i><i className="aba">Abandonadas</i></div>
            </div>
            {m.bars.length > 0
              ? <DailyBarChart
                  data={m.bars}
                  showLabels={homolog}
                  onDayClick={homolog ? selectAbandonedDay : undefined}
                  selectedDay={homolog ? abdDay : null}
                />
              : <div className="empty"><div className="ico"><BarChart3 /></div><p>{m.empty}</p></div>}
          </div>
        ))}

        {/* Atendentes — Finesse Team API (na homologação divide a linha com as abandonadas) */}
        <div className={"panel " + (homolog ? "panel--wide" : "panel--xwide")}>
          <div className="panel__hd">
            <h3><Users size={14} /> Atendentes — Help Desk</h3>
            <span className={"chip " + (agents.length > 0 ? "chip--live" : "chip--wait")}>
              {agents.length > 0 ? `${agents.filter(a => a.state !== "Desconectado").length} online` : "carregando…"}
            </span>
          </div>
          {agents.length > 0 ? (
            <div className="agents-table-wrap" style={{ width: "100%", overflowX: "auto" }}>
              <table className="agents-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--text-dim)" }}>
                    <th style={{ padding: "10px 8px", fontWeight: "600" }}>Nome</th>
                    <th style={{ padding: "10px 8px", fontWeight: "600" }}>Ramal</th>
                    <th style={{ padding: "10px 8px", fontWeight: "600" }}>Status</th>
                    <th style={{ padding: "10px 8px", fontWeight: "600" }}>Motivo / Pausa</th>
                  </tr>
                </thead>
                <tbody>
                  {agents
                    .sort((a, b) => {
                      const order: Record<string, number> = { "Em Atendimento": 0, "Disponível": 1, "Em Trabalho": 2, "Indisponível": 3, "Conectando": 4, "Desconectado": 5 };
                      return (order[a.state ?? ""] ?? 9) - (order[b.state ?? ""] ?? 9);
                    })
                    .map((ag) => <AgentTableRow key={ag.id} agent={ag} homolog={homolog} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty"><div className="ico"><AlertTriangle color={agentsError ? "var(--crit)" : undefined} /></div>
              {agentsError
                ? <><h4>Falha ao buscar atendentes</h4><p style={{ color: "var(--crit)" }}>{agentsError}</p><p style={{ color: "var(--text-mute)", fontSize: ".76rem" }}>Verifique FINESSE_TEAM_ID, UCCX_SUP_USER e UCCX_SUP_PASS no .env.local do servidor.</p></>
                : <p>Buscando atendentes do Finesse…</p>}
            </div>
          )}
        </div>

        {/* Abandonadas hoje — número de quem ligou (homologação) */}
        {homolog && (
          <div className="panel">
            <div className="panel__hd">
              <h3>
                <PhoneMissed size={14} /> Abandonadas{" "}
                {abdDay ? `em ${abdDay.slice(8, 10)}/${abdDay.slice(5, 7)}` : "hoje"}
              </h3>
              {abdDay ? (
                <button className="chip abd-back" onClick={() => setAbdDay(null)}>voltar para hoje</button>
              ) : abandoned && abandoned.length > 0 ? (
                <span className="chip chip--wait">
                  {abandoned.filter((a) => !a.answeredLater).length} sem retorno
                </span>
              ) : null}
            </div>
            {abandoned === null ? (
              <div className="empty"><div className="spinner" /></div>
            ) : abandoned.length === 0 ? (
              <div className="empty"><div className="ico"><PhoneMissed /></div><p>{abdDay ? "Nenhuma abandonada nesse dia." : "Nenhuma abandonada hoje."}</p>
                {!abdDay && <p style={{ fontSize: ".72rem", color: "var(--text-mute)" }}>Clique num dia do gráfico para ver outro dia.</p>}</div>
            ) : (
              <ul className="abd-list">
                {abandoned.map((a, i) => (
                  <li key={(a.number ?? "sem-numero") + i} className={"abd-row" + (a.answeredLater ? " abd-row--done" : "")}>
                    <div className="abd-main">
                      <span className="abd-num num">{formatPhone(a.number)}</span>
                      {a.attempts > 1 && <span className="abd-times">{a.attempts}x</span>}
                    </div>
                    <div className="abd-meta">
                      <span>{hhmmFromDb(a.lastAt)}</span>
                      <span>esperou {mmss(a.maxWaitSec)}</span>
                      {a.answeredLater && <span className="abd-ok">atendido depois</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Agents (Donut) */}
        <div className="panel">
          <div className="panel__hd">
            <h3><Users size={14} /> Agentes agora</h3>
            <span className={"chip " + (hasAgents ? "chip--live" : "chip--wait")}>{hasAgents ? "ao vivo" : "—"}</span>
          </div>
          {hasAgents ? (
            <div>
              <AgentsDonut available={inst?.agentsReady ?? 0} talking={inst?.agentsTalking ?? 0} notReady={inst?.agentsNotReady ?? 0} />
              <div className="agset" style={{ marginTop: 16 }}>
                <AgRow c="#34d399" label="Disponíveis" v={inst?.agentsReady ?? 0} tot={inst?.agentsLogged ?? 0} />
                <AgRow c="#56b6ff" label="Atendimento" v={inst?.agentsTalking ?? 0} tot={inst?.agentsLogged ?? 0} />
                <AgRow c="#fbbf24" label="Em pausa" v={inst?.agentsNotReady ?? 0} tot={inst?.agentsLogged ?? 0} />
              </div>
            </div>
          ) : <div className="empty"><div className="ico"><Users /></div><p>{inst?.reason || "Sem dado de agentes."}</p></div>}
        </div>
      </div>
    </div>
  );
}

function Kpi({ ico, label, value, foot, s }: { ico: React.ReactNode; label: string; value: string; foot?: string; s?: string }) {
  const dim = value === "—";
  return (
    <div className="kpi" data-s={dim ? undefined : s || undefined}>
      <div className="kpi__top"><span className="kpi__label">{label}</span><span className="kpi__ico">{ico}</span></div>
      <div className={"kpi__val num" + (dim ? " dim" : "")}>{value}</div>
      {foot ? <div className="kpi__foot">{foot}</div> : <div className="kpi__foot">&nbsp;</div>}
    </div>
  );
}

function AgRow({ c, label, v, tot }: { c: string; label: string; v: number; tot: number }) {
  const pct = tot > 0 ? Math.round((v / tot) * 100) : 0;
  return (
    <div className="agrow2">
      <span className="lbl">{label}</span>
      <span className="track"><span className="fill" style={{ width: `${pct}%`, background: c }} /></span>
      <span className="val num">{v}</span>
    </div>
  );
}

function AgentTableRow({ agent, homolog = false }: { agent: AgentConfig; homolog?: boolean }) {
  const stateColor: Record<string, string> = {
    "Disponível": "var(--ok)",
    "Em Atendimento": "var(--info)",
    "Em Trabalho": "var(--violet)",
    "Indisponível": "var(--warn)",
    "Desconectado": "var(--text-mute)",
    "Conectando": "var(--info)",
  };
  const color = stateColor[agent.state ?? ""] ?? "var(--text-mute)";
  const isOffline = agent.state === "Desconectado";
  const raw = `${agent.firstName} ${agent.lastName}`.trim();
  const name = homolog ? titleCase(raw) : raw;

  return (
    <tr style={{ borderBottom: "1px solid var(--line)", opacity: isOffline ? 0.5 : 1 }}>
      <td style={{ padding: "10px 8px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, boxShadow: isOffline ? "none" : `0 0 8px ${color}` }} />
        {name}
      </td>
      <td style={{ padding: "10px 8px", color: "var(--text-mute)" }}>{agent.extension ?? "—"}</td>
      <td style={{ padding: "10px 8px", color, fontWeight: "500" }}>{agent.state ?? "—"}</td>
      <td style={{ padding: "10px 8px", color: "var(--text-mute)" }}>{agent.reason ?? "—"}</td>
    </tr>
  );
}
