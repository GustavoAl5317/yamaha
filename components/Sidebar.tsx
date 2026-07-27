"use client";
import { useMemo, useState } from "react";
import { Search, ListFilter, Settings, LayoutDashboard } from "lucide-react";
import type { QueueConfig } from "@/lib/types";
import Link from "next/link";

interface Props {
  queues: QueueConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  error: string | null;
}

export default function Sidebar({ queues, selectedId, onSelect, loading, error }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => queues.filter((x) => x.name.toLowerCase().includes(q.toLowerCase()) || x.id.includes(q)),
    [queues, q],
  );

  return (
    <aside className="side">
      <div className="side__brand">
        <span className="side__mark" />
        <div>
          <h1>Help Desk <span>Yamaha</span></h1>
          <p>Painel UCCX</p>
        </div>
      </div>

      <div className="side__search">
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: "var(--txt-mute)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar fila..."
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>

      <div className="side__section">
        <span><ListFilter size={12} style={{ verticalAlign: "-2px" }} /> Filas detectadas</span>
        <span>{loading ? "…" : filtered.length}</span>
      </div>

      <div className="side__list">
        {loading && <div className="state"><div className="spinner" /><p>Consultando filas…</p></div>}
        {error && !loading && <div className="state state--crit"><p>{error}</p></div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="state"><p>Nenhuma fila encontrada.</p></div>
        )}
        {!loading && filtered.map((qc) => (
          <button
            key={qc.id}
            className={"qitem" + (qc.id === selectedId ? " active" : "")}
            onClick={() => onSelect(qc.id)}
            title={qc.name}
          >
            <span className="qitem__dot" />
            <span className="qitem__name">{qc.name}</span>
            <span className="qitem__id">#{qc.id}</span>
          </button>
        ))}
      </div>

      <div className="side__foot">
        <div className="side__nav">
          <Link href="/dashboard"><LayoutDashboard size={13} style={{ verticalAlign: "-2px" }} /> Painel</Link>
          <Link href="/config"><Settings size={13} style={{ verticalAlign: "-2px" }} /> Config</Link>
        </div>
      </div>
    </aside>
  );
}
