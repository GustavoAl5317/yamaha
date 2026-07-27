import { NextResponse } from "next/server";
import { listQueues, getLive, informixConfigured } from "@/lib/informix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/report?queueId=93&format=csv|json
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("queueId");
  const format = (searchParams.get("format") || "csv").toLowerCase();
  if (!id) return NextResponse.json({ error: "queueId obrigatório" }, { status: 400 });
  if (!informixConfigured()) return NextResponse.json({ error: "Fonte de dados não configurada" }, { status: 503 });

  const queues = await listQueues();
  const cfg = queues.find((q) => q.id === String(id));
  if (!cfg) return NextResponse.json({ error: "Fila não encontrada" }, { status: 404 });

  const live = await getLive(cfg.id, cfg.name);
  const k = live.kpis;
  const i = live.instant;
  const generatedAt = new Date().toISOString();

  if (format === "json") {
    return NextResponse.json({ generatedAt, queue: cfg, kpis: k, instant: i });
  }

  const rows: [string, string | number][] = [
    ["Relatório", "Fila UCCX — Yamaha"],
    ["Gerado em", generatedAt],
    ["Fila", `${cfg.name} (#${cfg.id})`],
    ["Meta Nível de Serviço", `${cfg.serviceLevelPct}% em ${cfg.serviceLevelSec}s`],
    ["— KPIs do dia —", ""],
    ["Recebidas", k?.received ?? "-"],
    ["Atendidas", k?.answered ?? "-"],
    ["Abandonadas", k?.abandoned ?? "-"],
    ["Nível de Serviço (%)", k?.slPct ?? "-"],
    ["Tempo médio de espera (s)", k?.avgWaitSec ?? "-"],
    ["Tempo médio de atendimento (s)", k?.avgHandleSec ?? "-"],
    ["— Instantâneo —", i.available ? "" : `indisponível (${i.reason ?? ""})`],
    ["Chamadas em espera", i.callsWaiting ?? "-"],
    ["Maior tempo de espera (s)", i.longestWaitSec ?? "-"],
    ["Agentes logados", i.agentsLogged ?? "-"],
    ["Agentes disponíveis", i.agentsReady ?? "-"],
    ["Agentes em atendimento", i.agentsTalking ?? "-"],
  ];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = rows.map(([a, b]) => `${esc(a)},${esc(b)}`).join("\r\n");
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio_${cfg.name}_${generatedAt.slice(0, 10)}.csv"`,
    },
  });
}
