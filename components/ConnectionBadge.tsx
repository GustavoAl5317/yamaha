"use client";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

export interface Conn { ok: boolean; status: number; message: string; }

export default function ConnectionBadge({ conn }: { conn: Conn | null }) {
  if (!conn) return (
    <span className="conn conn--wait"><Loader2 size={13} className="spin" /> VERIFICANDO</span>
  );
  if (conn.ok) return (
    <span className="conn conn--ok"><span className="conn__dot" /> <Wifi size={13} /> UCCX CONECTADO</span>
  );
  return (
    <span className="conn conn--bad" title={conn.message}>
      <span className="conn__dot" /> <WifiOff size={13} /> SEM CONEXÃO ({conn.status || "—"})
    </span>
  );
}
