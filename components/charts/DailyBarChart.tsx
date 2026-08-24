"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { fmt } from "@/lib/format";

export interface DayBar {
  label: string;      // dia do mês: "1", "2", ...
  received: number;
  answered: number;
  abandoned: number;
}

// Zero não é informação útil no topo da barra — some para não poluir.
const hideZero = (v: number) => (v > 0 ? String(v) : "");

export default function DailyBarChart({ data, showLabels = false }: { data: DayBar[]; showLabels?: boolean }) {
  return (
    <div className="chart" style={{ height: showLabels ? 215 : 205 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: showLabels ? 18 : 10, right: 8, left: -14, bottom: 0 }} barCategoryGap="22%" barGap={2}>
          <CartesianGrid stroke="#232f47" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#232f47" }} interval={0} tick={{ fontSize: 10, fill: "#5a678a" }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} tickFormatter={(v) => fmt(v)} />
          <Tooltip
            cursor={{ fill: "#232f4755" }}
            contentStyle={{ background: "#0e1421", border: "1px solid #232f47", borderRadius: 10, fontSize: 12, boxShadow: "0 10px 30px -12px rgba(0,0,0,.7)" }}
            labelFormatter={(l) => `Dia ${l}`}
          />
          {/* Quantidades acima de cada coluna, na cor da própria série */}
          <Bar dataKey="received" name="Recebidas" fill="#56b6ff" radius={[3, 3, 0, 0]} maxBarSize={16}>
            {showLabels && <LabelList dataKey="received" position="top" offset={4} fontSize={9} fill="#56b6ff" formatter={hideZero} />}
          </Bar>
          <Bar dataKey="answered" name="Atendidas" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={16}>
            {showLabels && <LabelList dataKey="answered" position="top" offset={4} fontSize={9} fill="#34d399" formatter={hideZero} />}
          </Bar>
          <Bar dataKey="abandoned" name="Abandonadas" fill="#ff1430" radius={[3, 3, 0, 0]} maxBarSize={16}>
            {showLabels && <LabelList dataKey="abandoned" position="top" offset={4} fontSize={9} fill="#ff1430" formatter={hideZero} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
