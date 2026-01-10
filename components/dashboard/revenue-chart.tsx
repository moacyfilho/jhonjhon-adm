"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = useMemo(() => data || [], [data]);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-bold text-foreground mb-6">
        Faturamento (Últimos 7 Dias)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            stroke="rgb(170, 170, 170)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="rgb(170, 170, 170)"
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `R$ ${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgb(17, 17, 17)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "rgb(255, 255, 255)",
            }}
            formatter={(value: any) => [`R$ ${value?.toFixed?.(2) ?? value}`, "Faturamento"]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="rgb(212, 175, 55)"
            strokeWidth={3}
            dot={{ fill: "rgb(212, 175, 55)", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
