"use client";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props { available: number; talking: number; notReady: number; }

const COLORS = ["#22c55e", "#38bdf8", "#f59e0b"];

export default function AgentsDonut({ available, talking, notReady }: Props) {
  const data = [
    { name: "Disponíveis", value: available },
    { name: "Em Atendimento", value: talking },
    { name: "Em Pausa", value: notReady },
  ];
  const total = available + talking + notReady;

  return (
    <div style={{ width: 190, height: 190, position: "relative", flex: "0 0 auto" }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={58} outerRadius={88} startAngle={90} endAngle={-270} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <span style={{ fontSize: "1.8rem", fontWeight: 800 }}>{total}</span>
        <span style={{ fontSize: ".68rem", color: "var(--txt-dim)", letterSpacing: 1 }}>LOGADOS</span>
      </div>
    </div>
  );
}
