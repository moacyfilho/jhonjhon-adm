"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BarbersChartProps {
  data: Array<{ name: string; count: number }>;
}

export function BarbersChart({ data }: BarbersChartProps) {
  const chartData = useMemo(() => data || [], [data]);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-bold text-foreground mb-6">
        Atendimentos por Barbeiro
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis
            dataKey="name"
            stroke="rgb(170, 170, 170)"
            fontSize={12}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="rgb(170, 170, 170)"
            fontSize={12}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgb(17, 17, 17)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "rgb(255, 255, 255)",
            }}
            formatter={(value: any) => [value, "Atendimentos"]}
          />
          <Bar dataKey="count" fill="rgb(212, 175, 55)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
