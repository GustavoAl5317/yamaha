"use client";
import { useEffect, useRef, useState } from "react";
import type { QueueConfig, QueueLive, HourPoint, AgentConfig } from "@/lib/types";
import { fmt, mmss, stateFor } from "@/lib/format";
import HourlyChart from "@/components/charts/HourlyChart";
import ServiceGauge from "@/components/charts/ServiceGauge";
import AgentsDonut from "@/components/charts/AgentsDonut";
import ExportButton from "@/components/ExportButton";
import {
  PhoneIncoming, PhoneCall, PhoneMissed, Target, Clock, Timer,
  Users, Activity, AlertTriangle, BarChart3, Database,
} from "lucide-react";

const POLL_MS = 5000;
const HELP_DESK_QUEUE = "Help_Desk";

export default function DashboardPage() {
  const [config, setConfig] = useState<QueueConfig | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [live, setLive] = useState<QueueLive | null>(null);
  const [hourly, setHourly] = useState<HourPoint[]>([]);
  const [now, setNow] = useState(new Date());
  const [queueId, setQueueId] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
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

  // Carregar hourly
  useEffect(() => {
    if (!queueId) return;
    fetch(`/api/queues/${queueId}/hourly`).then((r) => r.json()).then((j) => setHourly(j.hourly || [])).catch(() => {});
  }, [queueId]);

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
        if (alive && j.ok) setAgents(j.agents);
      } catch { /* mantém */ }
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
  const slState = k ? (k.slPct >= target ? "ok" : k.slPct >= target - 15 ? "warn" : "crit") : undefined;

  // Saúde da operação
  const health = (() => {
    if (!k) return { s: "warn", label: "Sem dados" };
    const bad = (abaPct ?? 0) > 10 || k.slPct < target - 15 || (hasQueue && (inst?.callsWaiting ?? 0) > 5);
    const mid = (abaPct ?? 0) > 5 || k.slPct < target || (hasQueue && (inst?.callsWaiting ?? 0) > 2);
    return bad ? { s: "crit", label: "Crítico" } : mid ? { s: "warn", label: "Atenção" } : { s: "ok", label: "Operação saudável" };
  })();

  return (
    <div className="dash-full">
      <div className="topbar">
        <div className="topbar__title">
          <h2>
            <span className="topbar__logo"><Activity color="#fff" strokeWidth={2.4} size={18} /></span>
            Help Desk — Yamaha
            {live?.source === "informix" && <span className="chip chip--live" style={{ fontSize: ".62rem" }}><Database size={11} style={{ verticalAlign: "-1px" }} /> db_cra</span>}
          </h2>
          <div className="topbar__meta">
            <span>Fila <b>#{config.id}</b></span>
            <span>{config.queueType || "VOICE"} · {config.algorithm || "FIFO"}</span>
            <span>Meta <b>{target}%</b> em <b>{config.serviceLevelSec}s</b></span>
          </div>
        </div>
        <div className="topbar__right">
          <div className="health" data-s={health.s}>
            <span className="health__ring"><span /></span>
            {health.label}
          </div>
          <div className="clock">
            <div className="t">{now.toLocaleTimeString("pt-BR")}</div>
            <div className="d">{now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</div>
          </div>
          <ExportButton queueId={config.id} />
        </div>
      </div>

      {/* KPI instruments */}
      <div className="kpis">
        <Kpi ico={<PhoneIncoming size={15} />} label="Recebidas" value={fmt(k?.received)} foot="no dia" />
        <Kpi ico={<PhoneCall size={15} />} label="Atendidas" value={fmt(k?.answered)} foot={ansPct != null ? `${ansPct}% do total` : ""} s="ok" />
        <Kpi ico={<PhoneMissed size={15} />} label="Abandonadas" value={fmt(k?.abandoned)} foot={abaPct != null ? `${abaPct}% do total` : ""} s={stateFor(abaPct ?? undefined, 5, 10)} />
        <Kpi ico={<Target size={15} />} label="Nível de Serviço" value={k ? `${k.slPct}%` : "—"} foot={`meta ${target}%`} s={slState} />
        <Kpi ico={<Clock size={15} />} label="T. Médio Espera" value={mmss(k?.avgWaitSec)} foot="TME" s={stateFor(k?.avgWaitSec, 20, 45)} />
        <Kpi ico={<Timer size={15} />} label="T. Médio Atend." value={mmss(k?.avgHandleSec ?? undefined)} foot="TMA" />
      </div>

      <div className="grid">
        {/* Hourly hero */}
        <div className="panel panel--wide">
          <div className="panel__hd">
            <h3><BarChart3 size={14} /> Volume por hora — hoje</h3>
            <div className="legend"><i className="rec">Recebidas</i><i className="ans">Atendidas</i><i className="aba">Abandonadas</i></div>
          </div>
          {hourly.length > 0 ? <HourlyChart data={hourly} />
            : <div className="empty"><div className="ico"><BarChart3 /></div><p>Sem chamadas registradas hoje ainda.</p></div>}
        </div>

        {/* Service level gauge */}
        <div className="panel">
          <div className="panel__hd"><h3><Target size={14} /> Nível de Serviço</h3></div>
          <ServiceGauge value={k ? k.slPct : null} target={target} />
        </div>

        {/* Agents */}
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

        {/* Atendentes — Finesse Team API */}
        <div className="panel panel--full">
          <div className="panel__hd">
            <h3><Users size={14} /> Atendentes — Help Desk</h3>
            <span className={"chip " + (agents.length > 0 ? "chip--live" : "chip--wait")}>
              {agents.length > 0 ? `${agents.filter(a => a.state !== "Offline").length} online` : "carregando…"}
            </span>
          </div>
          {agents.length > 0 ? (
            <div className="agents-grid">
              {agents
                .sort((a, b) => {
                  const order: Record<string, number> = { "Em Atendimento": 0, "Disponível": 1, "Em Trabalho": 2, "Indisponível": 3, "Conectando": 4, "Offline": 5 };
                  return (order[a.state ?? ""] ?? 9) - (order[b.state ?? ""] ?? 9);
                })
                .map((ag) => <AgentCard key={ag.id} agent={ag} />)}
            </div>
          ) : (
            <div className="empty"><div className="ico"><Users /></div><p>Buscando atendentes do Finesse…</p></div>
          )}
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

function AgentCard({ agent }: { agent: AgentConfig }) {
  const stateColor: Record<string, string> = {
    "Disponível": "var(--ok)",
    "Em Atendimento": "var(--info)",
    "Em Trabalho": "var(--violet)",
    "Indisponível": "var(--warn)",
    "Offline": "var(--text-mute)",
    "Conectando": "var(--info)",
  };
  const color = stateColor[agent.state ?? ""] ?? "var(--text-mute)";
  const isOffline = agent.state === "Offline";
  const name = `${agent.firstName} ${agent.lastName}`.trim();

  return (
    <div className={"agent-card" + (isOffline ? " agent-card--off" : "")} >
      <div className="agent-card__dot" style={{ background: color, boxShadow: isOffline ? "none" : `0 0 8px ${color}` }} />
      <div className="agent-card__info">
        <span className="agent-card__name">{name}</span>
        {agent.extension && <span className="agent-card__ext">ramal {agent.extension}</span>}
      </div>
      <span className="agent-card__state" style={{ color }}>{agent.state ?? "—"}</span>
    </div>
  );
}
