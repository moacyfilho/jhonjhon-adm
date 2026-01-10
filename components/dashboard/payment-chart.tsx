"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PaymentChartProps {
  data: Array<{ method: string; count: number }>;
}

const COLORS = [
  "rgb(212, 175, 55)",
  "rgb(37, 211, 102)",
  "rgb(96, 181, 255)",
  "rgb(255, 145, 73)",
];

export function PaymentChart({ data }: PaymentChartProps) {
  const chartData = useMemo(() => data || [], [data]);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-bold text-foreground mb-6">
        Formas de Pagamento
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="method"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={(entry: any) => `${entry?.method ?? ''}: ${entry?.count ?? 0}`}
          >
            {chartData?.map?.((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            )) ?? null}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "rgb(17, 17, 17)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "rgb(255, 255, 255)",
            }}
          />
          <Legend
            verticalAlign="top"
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
