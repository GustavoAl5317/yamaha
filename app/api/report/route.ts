import { NextResponse } from "next/server";
import { getQueue, getQueueRealtime } from "@/lib/uccx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/report?queueId=93&format=csv|json
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("queueId");
  const format = (searchParams.get("format") || "csv").toLowerCase();
  if (!id) return NextResponse.json({ error: "queueId obrigatório" }, { status: 400 });

  const [cfg, rt] = await Promise.all([getQueue(id), getQueueRealtime(id)]);
  if (!cfg) return NextResponse.json({ error: "Fila não encontrada" }, { status: 404 });

  const generatedAt = new Date().toISOString();
  const rows: [string, string | number][] = [
    ["Relatório", "Fila UCCX — Yamaha Help Desk"],
    ["Gerado em", generatedAt],
    ["Fila (ID)", cfg.id],
    ["Fila (nome)", cfg.name],
    ["Tipo", cfg.queueType],
    ["Algoritmo", cfg.algorithm],
    ["Meta Nível de Serviço (s)", cfg.serviceLevelSec],
    ["Meta Nível de Serviço (%)", cfg.serviceLevelPct],
    ["Skill", cfg.skill ?? "-"],
    ["Tempo real disponível", rt.available ? "Sim" : `Não (${rt.reason ?? ""})`],
    ["Chamadas em espera", rt.callsWaiting ?? "-"],
    ["Maior tempo de espera (s)", rt.longestWaitSec ?? "-"],
    ["Agentes logados", rt.agentsLogged ?? "-"],
    ["Agentes disponíveis", rt.agentsReady ?? "-"],
    ["Agentes em atendimento", rt.agentsTalking ?? "-"],
    ["Agentes em pausa", rt.agentsNotReady ?? "-"],
  ];

  if (format === "json") {
    return NextResponse.json({ generatedAt, config: cfg, realtime: rt });
  }

  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = rows.map(([k, v]) => `${esc(k)},${esc(v)}`).join("\r\n");
  const fname = `relatorio_${cfg.name}_${generatedAt.slice(0, 10)}.csv`;
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
