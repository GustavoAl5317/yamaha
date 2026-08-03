"use client";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props { available: number; talking: number; notReady: number; }
const COLORS = ["#34d399", "#56b6ff", "#fbbf24"];

export default function AgentsDonut({ available, talking, notReady }: Props) {
  const total = available + talking + notReady;
  const data = total === 0
    ? [{ name: "vazio", value: 1 }]
    : [
        { name: "Disponíveis", value: available },
        { name: "Em atendimento", value: talking },
        { name: "Em pausa", value: notReady },
      ];
  return (
    <div style={{ position: "relative", width: 140, height: 140, flex: "0 0 auto", margin: "0 auto" }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={56} outerRadius={80} startAngle={90} endAngle={-270} stroke="none" paddingAngle={total ? 2 : 0}>
            {data.map((_, i) => <Cell key={i} fill={total === 0 ? "#18223d" : COLORS[i]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <span className="num" style={{ fontSize: "1.7rem", fontWeight: 600 }}>{total}</span>
        <span style={{ fontSize: ".62rem", color: "var(--text-mute)", letterSpacing: ".14em", textTransform: "uppercase" }}>Logados</span>
      </div>
    </div>
  );
}
