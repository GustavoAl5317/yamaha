"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ConnectionBadge, { Conn } from "@/components/ConnectionBadge";
import QueueDashboard from "@/components/dashboard/QueueDashboard";
import type { QueueConfig } from "@/lib/types";
import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  const [queues, setQueues] = useState<QueueConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conn, setConn] = useState<Conn | null>(null);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setConn).catch(() => setConn({ ok: false, status: 0, message: "erro" }));
  }, []);

  useEffect(() => {
    fetch("/api/queues")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setQueues(j.queues);
          if (j.queues.length) {
            const hd = j.queues.find((x: QueueConfig) => x.name.includes("Help_Desk"));
            setSelectedId(hd ? hd.id : j.queues[0].id);
          }
        } else {
          setError(j.error || "Falha ao listar filas");
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="shell">
      <Sidebar
        queues={queues}
        selectedId={selectedId}
        onSelect={setSelectedId}
        loading={loading}
        error={error}
      />
      <main className="content">
        <div className="content__head" style={{ marginBottom: 8 }}>
          <div className="content__title">
            <p style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--txt-mute)", letterSpacing: 1, textTransform: "uppercase", fontSize: ".72rem" }}>
              <LayoutDashboard size={13} /> Painel Operacional
            </p>
          </div>
          <ConnectionBadge conn={conn} />
        </div>

        {!loading && !error && selectedId && <QueueDashboard queueId={selectedId} />}

        {!loading && error && (
          <div className="card">
            <div className="state state--crit">
              <h3>Não foi possível conectar ao UCCX</h3>
              <p>{error}</p>
              <p style={{ color: "var(--txt-mute)" }}>Verifique a VPN e as credenciais em <code>.env.local</code>. Se o erro for 401, a conta pode estar bloqueada — peça o desbloqueio/reset ao administrador.</p>
            </div>
          </div>
        )}

        {loading && <div className="card"><div className="state"><div className="spinner" /><p>Conectando ao UCCX e detectando filas…</p></div></div>}

        {!loading && !error && !selectedId && (
          <div className="card"><div className="state"><h3>Selecione uma fila no menu</h3><p>O painel é gerado automaticamente para a fila escolhida.</p></div></div>
        )}
      </main>
    </div>
  );
}
