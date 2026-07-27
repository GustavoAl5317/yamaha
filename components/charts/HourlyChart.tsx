"use client";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { HourPoint } from "@/lib/types";

export default function HourlyChart({ data }: { data: HourPoint[] }) {
  const rows = data.map((d) => ({ ...d, label: `${d.hour}h` }));
  return (
    <div className="chart">
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#56b6ff" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#56b6ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#232f47" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#232f47" }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} />
          <Tooltip
            contentStyle={{ background: "#0e1421", border: "1px solid #232f47", borderRadius: 10, fontSize: 12, boxShadow: "0 10px 30px -12px rgba(0,0,0,.7)" }}
            labelStyle={{ color: "#8896ae", fontWeight: 600 }}
            itemStyle={{ padding: 0 }}
          />
          <Area type="monotone" dataKey="received" name="Recebidas" stroke="#56b6ff" strokeWidth={2} fill="url(#gRec)" />
          <Line type="monotone" dataKey="answered" name="Atendidas" stroke="#34d399" strokeWidth={2.4} dot={false} />
          <Line type="monotone" dataKey="abandoned" name="Abandonadas" stroke="#ff1430" strokeWidth={2.4} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
