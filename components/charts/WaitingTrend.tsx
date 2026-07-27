"use client";
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export interface TrendPoint { t: string; waiting: number; talking: number; }

export default function WaitingTrend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="chartwrap">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="gWait" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#263042" strokeOpacity={0.5} vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "#5c6b82", fontSize: 11 }} stroke="#263042" />
          <YAxis allowDecimals={false} tick={{ fill: "#5c6b82", fontSize: 11 }} stroke="#263042" />
          <Tooltip contentStyle={{ background: "#161c28", border: "1px solid #263042", borderRadius: 10, color: "#e8edf5" }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#8a97ad" }} />
          <Area type="monotone" dataKey="waiting" name="Em espera" stroke="#38bdf8" strokeWidth={2.5} fill="url(#gWait)" />
          <Line type="monotone" dataKey="talking" name="Em atendimento" stroke="#22c55e" strokeWidth={2.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
