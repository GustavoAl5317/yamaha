"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, LayoutGrid, Settings, Activity } from "lucide-react";
import type { QueueConfig } from "@/lib/types";
import type { Conn } from "./ConnectionBadge";

interface Props {
  queues: QueueConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  error: string | null;
  conn: Conn | null;
}

export default function Sidebar({ queues, selectedId, onSelect, loading, error, conn }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => queues.filter((x) => x.name.toLowerCase().includes(q.toLowerCase()) || x.id.includes(q)),
    [queues, q],
  );

  return (
    <aside className="side">
      <div className="side__brand">
        <span className="side__logo"><Activity color="#fff" strokeWidth={2.4} /></span>
        <div>
          <h1>Central de Operações</h1>
          <p>Yamaha · Help Desk</p>
        </div>
      </div>

      <div className="side__conn" data-ok={conn ? String(conn.ok) : "false"}>
        <span className="dot" />
        <span>{conn ? (conn.ok ? "Fonte conectada" : "Fonte indisponível") : "Verificando…"}</span>
        <small style={{ marginLeft: "auto" }}>{conn?.ok ? "db_cra" : ""}</small>
      </div>

      <div className="side__search">
        <Search size={15} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar fila…" />
      </div>

      <div className="side__scroll">
        <div className="side__grouphdr">
          <span>Filas de atendimento</span>
          <span>{loading ? "…" : filtered.length}</span>
        </div>

        {loading && <div className="empty"><div className="spinner" /><p>Carregando filas…</p></div>}
        {error && !loading && <div className="empty"><p style={{ color: "var(--crit)" }}>{error}</p></div>}
        {!loading && !error && filtered.length === 0 && <div className="empty"><p>Nenhuma fila encontrada.</p></div>}

        {!loading && filtered.map((qc) => (
          <button key={qc.id} className={"qitem" + (qc.id === selectedId ? " active" : "")} onClick={() => onSelect(qc.id)} title={qc.name}>
            <span className="qitem__dot" />
            <span className="qitem__name">{qc.name}</span>
            <span className="qitem__id">#{qc.id}</span>
          </button>
        ))}
      </div>

      <div className="side__foot">
        <Link href="/dashboard"><LayoutGrid size={14} /> Painel</Link>
        <Link href="/config"><Settings size={14} /> Ambiente</Link>
      </div>
    </aside>
  );
}
