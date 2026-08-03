"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fmt } from "@/lib/format";

export interface DayBar {
  label: string;      // dia do mês: "1", "2", ...
  received: number;
  answered: number;
  abandoned: number;
}

export default function DailyBarChart({ data }: { data: DayBar[] }) {
  return (
    <div className="chart" style={{ height: 205 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 8, left: -14, bottom: 0 }} barCategoryGap="22%" barGap={2}>
          <CartesianGrid stroke="#232f47" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#232f47" }} interval={0} tick={{ fontSize: 10, fill: "#5a678a" }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} tickFormatter={(v) => fmt(v)} />
          <Tooltip
            cursor={{ fill: "#232f4755" }}
            contentStyle={{ background: "#0e1421", border: "1px solid #232f47", borderRadius: 10, fontSize: 12, boxShadow: "0 10px 30px -12px rgba(0,0,0,.7)" }}
            labelFormatter={(l) => `Dia ${l}`}
          />
          <Bar dataKey="received" name="Recebidas" fill="#56b6ff" radius={[3, 3, 0, 0]} maxBarSize={16} />
          <Bar dataKey="answered" name="Atendidas" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={16} />
          <Bar dataKey="abandoned" name="Abandonadas" fill="#ff1430" radius={[3, 3, 0, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
