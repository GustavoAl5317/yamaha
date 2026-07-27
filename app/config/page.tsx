"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ConnectionBadge, { Conn } from "@/components/ConnectionBadge";
import type { QueueConfig } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

export default function ConfigPage() {
  const [queues, setQueues] = useState<QueueConfig[]>([]);
  const [conn, setConn] = useState<Conn | null>(null);
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((j) => { setConn(j); setInfo(j.info); });
    fetch("/api/queues")
      .then((r) => r.json())
      .then((j) => (j.ok ? setQueues(j.queues) : setError(j.error)))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="content" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="content__head">
        <div className="content__title">
          <h2>Configuração & Ambiente</h2>
          <p>Conexão com o UCCX e filas detectadas</p>
        </div>
        <div className="content__actions">
          <ConnectionBadge conn={conn} />
          <Link className="btn" href="/dashboard"><ArrowLeft size={15} /> Voltar ao painel</Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__title">Ambiente</div>
        <table className="ctable">
          <tbody>
            <tr><td>Host UCCX</td><td>{info?.host ?? "—"}</td></tr>
            <tr><td>Porta adminapi</td><td>{info?.adminPort ?? "—"}</td></tr>
            <tr><td>Porta Finesse</td><td>{info?.finessePort ?? "—"}</td></tr>
            <tr><td>Usuário supervisor (tempo real)</td><td><span className={"badge " + (info?.hasSupervisor ? "badge--ok" : "badge--warn")}>{info?.hasSupervisor ? "Configurado" : "Não configurado"}</span></td></tr>
            <tr><td>Status da conexão</td><td>{conn?.message ?? "—"}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card__title">Filas detectadas ({queues.length})</div>
        {loading && <div className="state"><div className="spinner" /><p>Carregando…</p></div>}
        {error && <div className="state state--crit"><p>{error}</p></div>}
        {!loading && !error && (
          <table className="ctable">
            <tbody>
              <tr style={{ color: "var(--txt-dim)" }}>
                <td>Fila</td><td>Meta SL / Skill</td>
              </tr>
              {queues.map((q) => (
                <tr key={q.id}>
                  <td><Link href={`/dashboard`} style={{ color: "var(--txt)" }}>#{q.id} · {q.name}</Link></td>
                  <td>{q.serviceLevelPct}% em {q.serviceLevelSec}s · {q.skill ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
