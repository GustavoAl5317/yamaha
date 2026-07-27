"use client";
import { useEffect, useRef, useState } from "react";
import type { QueueConfig, QueueRealtime } from "@/lib/types";
import { fmt, mmss, stateFor } from "@/lib/format";
import AgentsDonut from "@/components/charts/AgentsDonut";
import WaitingTrend, { TrendPoint } from "@/components/charts/WaitingTrend";
import ExportButton from "@/components/ExportButton";
import { AlertTriangle, Clock, PhoneCall, Users } from "lucide-react";

const POLL_MS = 5000;
const MAX_POINTS = 24;

export default function QueueDashboard({ queueId }: { queueId: string }) {
  const [config, setConfig] = useState<QueueConfig | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [rt, setRt] = useState<QueueRealtime | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Config da fila (uma vez por seleção)
  useEffect(() => {
    setConfig(null); setCfgError(null); setRt(null); setTrend([]);
    fetch(`/api/queues/${queueId}`)
      .then((r) => r.json())
      .then((j) => (j.ok ? setConfig(j.queue) : setCfgError(j.error || "Falha ao carregar a fila")))
      .catch((e) => setCfgError(String(e)));
  }, [queueId]);

  // Polling de tempo real
  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const nameQ = config?.name ? `?name=${encodeURIComponent(config.name)}` : "";
        const r = await fetch(`/api/queues/${queueId}/realtime${nameQ}`, { cache: "no-store" });
        const j: QueueRealtime = await r.json();
        if (!alive) return;
        setRt(j);
        if (j.available) {
          setTrend((prev) => {
            const p: TrendPoint = {
              t: new Date(j.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              waiting: j.callsWaiting ?? 0,
              talking: j.agentsTalking ?? 0,
            };
            return [...prev, p].slice(-MAX_POINTS);
          });
        }
      } catch { /* mantém último estado */ }
    }
    poll();
    timer.current = setInterval(poll, POLL_MS);
    return () => { alive = false; if (timer.current) clearInterval(timer.current); };
  }, [queueId, config?.name]);

  if (cfgError) {
    return (
      <div className="card">
        <div className="state state--crit">
          <AlertTriangle size={30} />
          <h3>Não foi possível carregar a fila #{queueId}</h3>
          <p>{cfgError}</p>
        </div>
      </div>
    );
  }
  if (!config) {
    return <div className="card"><div className="state"><div className="spinner" /><p>Carregando fila…</p></div></div>;
  }

  const live = rt?.available === true;

  return (
    <div>
      <div className="content__head">
        <div className="content__title">
          <h2>{config.name}</h2>
          <p>Fila #{config.id} · {config.queueType} · {config.algorithm} · skill {config.skill ?? "—"}</p>
        </div>
        <div className="content__actions">
          {live
            ? <span className="conn conn--ok"><span className="conn__dot" /> TEMPO REAL</span>
            : <span className="conn conn--wait"><span className="conn__dot" /> AGUARDANDO FONTE</span>}
          <ExportButton queueId={config.id} />
        </div>
      </div>

      {/* KPIs de tempo real */}
      <div className="kpis">
        <Kpi label="Em Espera" value={fmt(rt?.callsWaiting)} state={stateFor(rt?.callsWaiting, 2, 5)} />
        <Kpi label="Maior Espera" value={mmss(rt?.longestWaitSec)} state={stateFor(rt?.longestWaitSec, 60, 120)} />
        <Kpi label="Logados" value={fmt(rt?.agentsLogged)} />
        <Kpi label="Disponíveis" value={fmt(rt?.agentsReady)} state="ok" />
        <Kpi label="Em Atendimento" value={fmt(rt?.agentsTalking)} />
        <Kpi label="Em Pausa" value={fmt(rt?.agentsNotReady)} />
      </div>

      {/* Painéis */}
      <div className="panels">
        <div className="card">
          <div className="card__title"><PhoneCall size={13} style={{ verticalAlign: "-2px" }} /> Fila Agora</div>
          {live ? (
            <div className="qbig">
              <div className="qbig__box" data-state={stateFor(rt?.callsWaiting, 2, 5)}>
                <div className="qbig__num">{fmt(rt?.callsWaiting)}</div>
                <div className="qbig__cap">em espera</div>
              </div>
              <div className="qbig__box" data-state={stateFor(rt?.longestWaitSec, 60, 120)}>
                <div className="qbig__num">{mmss(rt?.longestWaitSec)}</div>
                <div className="qbig__cap">maior espera</div>
              </div>
            </div>
          ) : <NoLive reason={rt?.reason} />}
        </div>

        <div className="card">
          <div className="card__title"><Users size={13} style={{ verticalAlign: "-2px" }} /> Distribuição de Agentes</div>
          {live ? (
            <div className="center-flex">
              <AgentsDonut
                available={rt?.agentsReady ?? 0}
                talking={rt?.agentsTalking ?? 0}
                notReady={rt?.agentsNotReady ?? 0}
              />
              <div className="aglegend">
                <div className="agrow" style={{ borderLeftColor: "#22c55e" }}><div className="agrow__n">{fmt(rt?.agentsReady)}</div><div className="agrow__l">Disponíveis</div></div>
                <div className="agrow" style={{ borderLeftColor: "#38bdf8" }}><div className="agrow__n">{fmt(rt?.agentsTalking)}</div><div className="agrow__l">Atendimento</div></div>
                <div className="agrow" style={{ borderLeftColor: "#f59e0b" }}><div className="agrow__n">{fmt(rt?.agentsNotReady)}</div><div className="agrow__l">Em Pausa</div></div>
                <div className="agrow" style={{ borderLeftColor: "#5c6b82" }}><div className="agrow__n">{fmt(rt?.agentsLogged)}</div><div className="agrow__l">Logados</div></div>
              </div>
            </div>
          ) : <NoLive reason={rt?.reason} />}
        </div>

        <div className="card">
          <div className="card__title"><Clock size={13} style={{ verticalAlign: "-2px" }} /> Configuração da Fila</div>
          <table className="ctable">
            <tbody>
              <tr><td>Nível de Serviço (meta)</td><td>{config.serviceLevelPct}% em {config.serviceLevelSec}s</td></tr>
              <tr><td>Tipo</td><td>{config.queueType}</td></tr>
              <tr><td>Algoritmo</td><td>{config.algorithm}</td></tr>
              <tr><td>Skill</td><td>{config.skill ?? "—"}</td></tr>
              <tr><td>Fonte de tempo real</td><td><span className={"badge " + (live ? "badge--ok" : "badge--warn")}>{live ? "Ativa" : "Indisponível"}</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tendência ao vivo */}
      <div className="card card--full">
        <div className="card__title">Tempo Real — Chamadas em Espera × Agentes em Atendimento</div>
        {trend.length > 1 ? (
          <WaitingTrend data={trend} />
        ) : live ? (
          <div className="state"><div className="spinner" /><p>Coletando pontos ao vivo…</p></div>
        ) : <NoLive reason={rt?.reason} />}
      </div>
    </div>
  );
}

function Kpi({ label, value, state }: { label: string; value: string; state?: string }) {
  const dim = value === "—";
  return (
    <div className="kpi" data-state={dim ? undefined : state || undefined}>
      <div className="kpi__label">{label}</div>
      <div className={"kpi__value" + (dim ? " dim" : "")}>{value}</div>
    </div>
  );
}

function NoLive({ reason }: { reason?: string }) {
  return (
    <div className="state state--warn">
      <AlertTriangle size={26} />
      <h3>Sem dado em tempo real</h3>
      <p>{reason || "A fonte de tempo real ainda não está disponível."}</p>
      <p style={{ color: "var(--txt-mute)" }}>Nenhum dado é simulado — os números aparecem quando a fonte (Finesse supervisor ou banco) for liberada.</p>
    </div>
  );
}
