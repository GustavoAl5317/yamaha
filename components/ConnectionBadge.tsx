"use client";

export interface Conn {
  ok: boolean;
  message: string;
  source?: string;
}

// Badge compacto opcional (o status principal fica na sidebar).
export default function ConnectionBadge({ conn }: { conn: Conn | null }) {
  if (!conn) return null;
  return (
    <span className="chip" style={{ color: conn.ok ? "var(--ok)" : "var(--crit)", borderColor: conn.ok ? "#1e5c43" : "#7a2233" }}>
      {conn.ok ? "● conectado" : "● sem fonte"}
    </span>
  );
}
