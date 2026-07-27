"use client";
import { useEffect, useRef, useState } from "react";
import type { QueueConfig, QueueLive } from "@/lib/types";
import { fmt, mmss, stateFor } from "@/lib/format";
import AgentsDonut from "@/components/charts/AgentsDonut";
import WaitingTrend, { TrendPoint } from "@/components/charts/WaitingTrend";
import ExportButton from "@/components/ExportButton";
import { AlertTriangle, Clock, PhoneCall, Users, Database } from "lucide-react";

const POLL_MS = 5000;
const MAX_POINTS = 24;

export default function QueueDashboard({ queueId }: { queueId: string }) {
  const [config, setConfig] = useState<QueueConfig | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [live, setLive] = useState<QueueLive | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setConfig(null); setCfgError(null); setLive(null); setTrend([]);
    fetch(`/api/queues/${queueId}`)
      .then((r) => r.json())
      .then((j) => (j.ok ? setConfig(j.queue) : setCfgError(j.error || "Falha ao carregar a fila")))
      .catch((e) => setCfgError(String(e)));
  }, [queueId]);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const nameQ = config?.name ? `?name=${encodeURIComponent(config.name)}` : "";
        const r = await fetch(`/api/queues/${queueId}/realtime${nameQ}`, { cache: "no-store" });
        const j: QueueLive = await r.json();
        if (!alive) return;
        setLive(j);
        if (j.instant?.available) {
          setTrend((prev) => {
            const p: TrendPoint = {
              t: new Date(j.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              waiting: j.instant.callsWaiting ?? 0,
              talking: j.instant.agentsTalking ?? 0,
            };
            return [...prev, p].slice(-MAX_POINTS);
          });
        }
      } catch { /* mantém estado */ }
    }
    poll();
    timer.current = setInterval(poll, POLL_MS);
    return () => { alive = false; if (timer.current) clearInterval(timer.current); };
  }, [queueId, config?.name]);

  if (cfgError) {
    return (
      <div className="card"><div className="state state--crit">
        <AlertTriangle size={30} /><h3>Não foi possível carregar a fila #{queueId}</h3><p>{cfgError}</p>
      </div></div>
    );
  }
  if (!config) {
    return <div className="card"><div className="state"><div className="spinner" /><p>Carregando fila…</p></div></div>;
  }

  const kpis = live?.kpis ?? null;
  const inst = live?.instant ?? null;
  const hasAgents = inst?.agentsLogged != null;   // agentes ao vivo (banco)
  const hasQueue = inst?.callsWaiting != null;     // fila em espera (Finesse/snapshot)
  const ansPct = kpis && kpis.received ? Math.round((kpis.answered / kpis.received) * 100) : null;
  const abaPct = kpis && kpis.received ? Math.round((kpis.abandoned / kpis.received) * 100) : null;

  return (
    <div>
      <div className="content__head">
        <div className="content__title">
          <h2>{config.name}</h2>
          <p>Fila #{config.id} · {config.queueType || "VOICE"} · meta {config.serviceLevelPct}% em {config.serviceLevelSec}s</p>
        </div>
        <div className="content__actions">
          {live?.source === "informix"
            ? <span className="conn conn--ok"><Database size={13} /> BANCO db_cra</span>
            : <span className="conn conn--wait"><span className="conn__dot" /> {live?.source === "finesse" ? "FINESSE" : "SEM FONTE"}</span>}
          <ExportButton queueId={config.id} />
        </div>
      </div>

      {/* KPIs do dia (histórico real) */}
      <div className="kpis">
        <Kpi label="Recebidas (dia)" value={fmt(kpis?.received)} />
        <Kpi label="Atendidas" value={fmt(kpis?.answered)} sub={ansPct != null ? `${ansPct}% do total` : undefined} state="ok" />
        <Kpi label="Abandonadas" value={fmt(kpis?.abandoned)} sub={abaPct != null ? `${abaPct}% do total` : undefined} state={stateFor(abaPct ?? undefined, 5, 10)} />
        <Kpi label="Nível de Serviço" value={kpis ? `${kpis.slPct}%` : "—"} sub={`meta ${config.serviceLevelPct}%`} state={kpis ? (kpis.slPct >= config.serviceLevelPct ? "ok" : kpis.slPct >= config.serviceLevelPct - 15 ? "warn" : "crit") : undefined} />
        <Kpi label="T. Médio Espera" value={mmss(kpis?.avgWaitSec)} state={stateFor(kpis?.avgWaitSec, 20, 45)} />
        <Kpi label="T. Médio Atend." value={mmss(kpis?.avgHandleSec ?? undefined)} />
      </div>

      {/* Painéis instantâneos */}
      <div className="panels">
        <div className="card">
          <div className="card__title"><PhoneCall size={13} style={{ verticalAlign: "-2px" }} /> Fila Agora</div>
          {hasQueue ? (
            <div className="qbig">
              <div className="qbig__box" data-state={stateFor(inst?.callsWaiting, 2, 5)}>
                <div className="qbig__num">{fmt(inst?.callsWaiting)}</div><div className="qbig__cap">em espera</div>
              </div>
              <div className="qbig__box" data-state={stateFor(inst?.longestWaitSec, 60, 120)}>
                <div className="qbig__num">{mmss(inst?.longestWaitSec)}</div><div className="qbig__cap">maior espera</div>
              </div>
            </div>
          ) : <NoInstant reason="Fila em espera 'agora' precisa do Finesse (supervisor) ou do Real-Time Snapshot. Os agentes ao lado e os KPIs do dia são reais." />}
        </div>

        <div className="card">
          <div className="card__title"><Users size={13} style={{ verticalAlign: "-2px" }} /> Agentes (agora)</div>
          {hasAgents ? (
            <div className="center-flex">
              <AgentsDonut available={inst?.agentsReady ?? 0} talking={inst?.agentsTalking ?? 0} notReady={inst?.agentsNotReady ?? 0} />
              <div className="aglegend">
                <div className="agrow" style={{ borderLeftColor: "#22c55e" }}><div className="agrow__n">{fmt(inst?.agentsReady)}</div><div className="agrow__l">Disponíveis</div></div>
                <div className="agrow" style={{ borderLeftColor: "#38bdf8" }}><div className="agrow__n">{fmt(inst?.agentsTalking)}</div><div className="agrow__l">Atendimento</div></div>
                <div className="agrow" style={{ borderLeftColor: "#f59e0b" }}><div className="agrow__n">{fmt(inst?.agentsNotReady)}</div><div className="agrow__l">Em Pausa</div></div>
                <div className="agrow" style={{ borderLeftColor: "#5c6b82" }}><div className="agrow__n">{fmt(inst?.agentsLogged)}</div><div className="agrow__l">Logados</div></div>
              </div>
            </div>
          ) : <NoInstant reason={inst?.reason} />}
        </div>

        <div className="card">
          <div className="card__title"><Clock size={13} style={{ verticalAlign: "-2px" }} /> Configuração</div>
          <table className="ctable"><tbody>
            <tr><td>Nível de Serviço (meta)</td><td>{config.serviceLevelPct}% em {config.serviceLevelSec}s</td></tr>
            <tr><td>Tipo</td><td>{config.queueType || "VOICE"}</td></tr>
            <tr><td>Algoritmo</td><td>{config.algorithm || "—"}</td></tr>
            <tr><td>KPIs do dia</td><td><span className={"badge " + (kpis ? "badge--ok" : "badge--warn")}>{kpis ? "Reais (banco)" : "Indisponível"}</span></td></tr>
            <tr><td>Agentes ao vivo</td><td><span className={"badge " + (hasAgents ? "badge--ok" : "badge--warn")}>{hasAgents ? "Ativo (banco)" : "Indisponível"}</span></td></tr>
            <tr><td>Fila em espera</td><td><span className={"badge " + (hasQueue ? "badge--ok" : "badge--warn")}>{hasQueue ? "Ativa" : "Via Finesse/snapshot"}</span></td></tr>
          </tbody></table>
        </div>
      </div>

      {/* Tendência ao vivo (instantâneo) */}
      <div className="card card--full">
        <div className="card__title">Tempo Real — Agentes em Atendimento × Chamadas em Espera</div>
        {trend.length > 1 ? <WaitingTrend data={trend} />
          : (hasAgents || hasQueue) ? <div className="state"><div className="spinner" /><p>Coletando pontos ao vivo…</p></div>
          : <NoInstant reason={inst?.reason} />}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, state }: { label: string; value: string; sub?: string; state?: string }) {
  const dim = value === "—";
  return (
    <div className="kpi" data-state={dim ? undefined : state || undefined}>
      <div className="kpi__label">{label}</div>
      <div className={"kpi__value" + (dim ? " dim" : "")}>{value}</div>
      {sub && <div className="kpi__foot">{sub}</div>}
    </div>
  );
}

function NoInstant({ reason }: { reason?: string }) {
  return (
    <div className="state state--warn">
      <AlertTriangle size={24} />
      <h3>Instantâneo indisponível</h3>
      <p>{reason || "Aguardando fonte de tempo real."}</p>
      <p style={{ color: "var(--txt-mute)" }}>Os KPIs do dia acima são reais. O “agora mesmo” acende quando o Real-Time Snapshot for habilitado no UCCX.</p>
    </div>
  );
}
