"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import type { Conn } from "@/components/ConnectionBadge";
import QueueDashboard from "@/components/dashboard/QueueDashboard";
import type { QueueConfig } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const [queues, setQueues] = useState<QueueConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conn, setConn] = useState<Conn | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/health").then((r) => r.json())
      .then((j) => setConn({ ok: j.ok, message: j.message, source: j.source }))
      .catch(() => setConn({ ok: false, message: "erro" }));
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/queues").then((r) => r.json()).then((j) => {
      if (j.ok) {
        setQueues(j.queues);
        if (j.queues.length) {
          const hd = j.queues.find((x: QueueConfig) => x.name.includes("Help_Desk"));
          setSelectedId(hd ? hd.id : j.queues[0].id);
        }
      } else setError(j.error || "Falha ao listar filas");
    }).catch((e) => setError(String(e))).finally(() => setLoading(false));
  }, []);

  return (
    <div className="shell">
      <Sidebar queues={queues} selectedId={selectedId} onSelect={setSelectedId} loading={loading} error={error} conn={conn} />
      <main className="content">
        {loading && <div className="panel"><div className="empty"><div className="spinner" /><p>Conectando à fonte de dados e detectando filas…</p></div></div>}
        {!loading && error && (
          <div className="panel"><div className="empty"><div className="ico"><AlertTriangle color="var(--crit)" /></div>
            <h4>Não foi possível conectar</h4><p>{error}</p>
            <p style={{ color: "var(--text-mute)" }}>Verifique a VPN e as credenciais do banco em <code>.env.local</code>.</p></div></div>
        )}
        {!loading && !error && selectedId && <QueueDashboard queueId={selectedId} />}
        {!loading && !error && !selectedId && (
          <div className="panel"><div className="empty"><h4>Selecione uma fila</h4><p>Escolha uma fila no menu para gerar o painel.</p></div></div>
        )}
      </main>
    </div>
  );
}
