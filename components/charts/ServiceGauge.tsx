"use client";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

export default function ServiceGauge({ value, target }: { value: number | null; target: number }) {
  const v = value ?? 0;
  const color = value == null ? "#5a678a" : v >= target ? "#34d399" : v >= target - 15 ? "#fbbf24" : "#fb5773";
  const data = [{ name: "sl", value: v, fill: color }];
  return (
    <div className="gauge-wrap">
      <div style={{ width: "100%", height: 190 }}>
        <ResponsiveContainer>
          <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={220} endAngle={-40}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background={{ fill: "#18223d" }} dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="gauge-meta">
        <div className="g-val num" style={{ color }}>{value == null ? "—" : `${v}%`}</div>
        <div className="g-sub">meta {target}%</div>
      </div>
    </div>
  );
}
