"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { fmt } from "@/lib/format";

export default function SummaryBarChart({ title, received, answered, abandoned }: { title: string, received: number, answered: number, abandoned: number }) {
  const data = [
    { name: "Abandonadas", value: abandoned, color: "#ff1430" },
    { name: "Atendidas", value: answered, color: "#34d399" },
    { name: "Recebidas", value: received, color: "#56b6ff" }
  ];

  return (
    <div className="panel">
      <div className="panel__hd"><h3>{title}</h3></div>
      <div className="chart" style={{ height: "200px" }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 16, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="#232f47" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#232f47" }} tick={{ fill: "#8896ae" }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} tickFormatter={(val) => fmt(val)} />
            <Tooltip
              cursor={{ fill: "#232f47", opacity: 0.4 }}
              contentStyle={{ background: "#0e1421", border: "1px solid #232f47", borderRadius: 10, fontSize: 12, boxShadow: "0 10px 30px -12px rgba(0,0,0,.7)" }}
              labelStyle={{ display: "none" }}
              itemStyle={{ padding: 0 }}
              formatter={(val: number, name: string) => [fmt(val), "Volume"]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
