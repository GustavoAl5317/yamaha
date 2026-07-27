"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { QueueConfig } from "@/lib/types";
import { ArrowLeft, Database } from "lucide-react";

export default function ConfigPage() {
  const [queues, setQueues] = useState<QueueConfig[]>([]);
  const [conn, setConn] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((j) => { setConn(j); setInfo(j.info); });
    fetch("/api/queues").then((r) => r.json())
      .then((j) => (j.ok ? setQueues(j.queues) : setError(j.error)))
      .catch((e) => setError(String(e))).finally(() => setLoading(false));
  }, []);

  return (
    <main className="content" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div className="topbar">
        <div className="topbar__title">
          <h2><Database size={20} /> Ambiente & Fontes</h2>
          <div className="topbar__meta"><span>Conexão com o UCCX e filas detectadas</span></div>
        </div>
        <Link className="btn" href="/dashboard"><ArrowLeft size={15} /> Voltar ao painel</Link>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel__hd"><h3>Fonte de dados</h3>
          <span className="chip" style={{ color: conn?.ok ? "var(--ok)" : "var(--crit)", borderColor: conn?.ok ? "#1e5c43" : "#7a2233" }}>
            {conn?.ok ? "conectado" : "sem fonte"}
          </span>
        </div>
        <div className="deflist">
          <div><dt>Status</dt><dd>{conn?.message ?? "—"}</dd></div>
          <div><dt>Host UCCX</dt><dd>{info?.host ?? "—"}</dd></div>
          <div><dt>Banco</dt><dd>Informix db_cra · porta {info?.finessePort ? "1504" : "1504"}</dd></div>
          <div><dt>Supervisor Finesse</dt><dd><span className={"badge " + (info?.hasSupervisor ? "badge--ok" : "badge--wait")}>{info?.hasSupervisor ? "configurado" : "não configurado"}</span></dd></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__hd"><h3>Filas detectadas</h3><span className="chip">{queues.length}</span></div>
        {loading && <div className="empty"><div className="spinner" /><p>Carregando…</p></div>}
        {error && <div className="empty"><p style={{ color: "var(--crit)" }}>{error}</p></div>}
        {!loading && !error && (
          <div className="deflist">
            {queues.map((q) => (
              <div key={q.id}>
                <dt><Link href="/dashboard" style={{ color: "var(--text)" }}>#{q.id} · {q.name}</Link></dt>
                <dd style={{ color: "var(--text-dim)", fontWeight: 500 }}>{q.serviceLevelPct}% em {q.serviceLevelSec}s</dd>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
