"use client";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { fmt } from "@/lib/format";

export interface DayBar {
  day: string;        // data completa "YYYY-MM-DD" (mesma do banco)
  label: string;      // dia do mês: "1", "2", ...
  received: number;
  answered: number;
  abandoned: number;
}

// Zero não é informação útil no topo da barra — some para não poluir.
const hideZero = (v: number) => (v > 0 ? String(v) : "");

// A partir deste número de dias os valores deitados não cabem lado a lado.
const ROTATE_FROM = 11;

/**
 * Valor em pé acima da barra. Com muitos dias no mês, o número deitado
 * invade a coluna vizinha; em pé ele ocupa só a largura da própria barra.
 */
const uprightLabel = (color: string) =>
  function UprightLabel(props: any) {
    const { x, y, width, value } = props;
    if (!value) return null;
    const cx = Number(x) + Number(width) / 2;
    const cy = Number(y) - 4;
    return (
      <text
        x={cx} y={cy} fill={color} fontSize={9} textAnchor="start" dominantBaseline="central"
        transform={`rotate(-90, ${cx}, ${cy})`}
      >
        {value}
      </text>
    );
  };

const SERIES = [
  { key: "received", name: "Recebidas", color: "#56b6ff" },
  { key: "answered", name: "Atendidas", color: "#34d399" },
  { key: "abandoned", name: "Abandonadas", color: "#ff1430" },
] as const;

interface Props {
  data: DayBar[];
  showLabels?: boolean;
  /** Clique em qualquer ponto da coluna de um dia. */
  onDayClick?: (day: string) => void;
  /** Dia em destaque; os demais ficam esmaecidos. */
  selectedDay?: string | null;
}

export default function DailyBarChart({ data, showLabels = false, onDayClick, selectedDay }: Props) {
  const hasSelection = Boolean(selectedDay && data.some((d) => d.day === selectedDay));
  const upright = showLabels && data.length >= ROTATE_FROM;
  return (
    <div className="chart" style={{ height: showLabels ? 215 : 205, cursor: onDayClick ? "pointer" : undefined }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: upright ? 30 : showLabels ? 18 : 10, right: 8, left: -6, bottom: 0 }}
          barCategoryGap="22%"
          barGap={2}
          onClick={(state: any) => {
            const day = state?.activePayload?.[0]?.payload?.day;
            if (onDayClick && day) onDayClick(day);
          }}
        >
          <CartesianGrid stroke="#232f47" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#232f47" }} interval={0} tick={{ fontSize: 10, fill: "#5a678a" }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} tick={{ fontSize: 10, fill: "#5a678a" }} tickFormatter={(v) => fmt(v)} />
          <Tooltip
            cursor={{ fill: "#232f4755" }}
            contentStyle={{ background: "#0e1421", border: "1px solid #232f47", borderRadius: 10, fontSize: 12, boxShadow: "0 10px 30px -12px rgba(0,0,0,.7)" }}
            labelFormatter={(l) => (onDayClick ? `Dia ${l} — clique para ver as abandonadas` : `Dia ${l}`)}
          />
          {/* Quantidades acima de cada coluna, na cor da própria série */}
          {SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={16}>
              {data.map((d) => (
                <Cell key={d.day} fillOpacity={hasSelection && d.day !== selectedDay ? 0.28 : 1} />
              ))}
              {showLabels && (upright
                ? <LabelList dataKey={s.key} content={uprightLabel(s.color)} />
                : <LabelList dataKey={s.key} position="top" offset={4} fontSize={9} fill={s.color} formatter={hideZero} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
