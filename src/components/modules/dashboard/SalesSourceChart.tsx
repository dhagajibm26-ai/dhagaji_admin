"use client";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardData } from "@/hooks/useDashboard";

interface SalesSourceChartProps {
  salesBySource: DashboardData["salesBySource"];
}

const PALETTE: Record<string, string> = {
  Shop:       "#D32F2F",
  Instagram:  "#E57373",
  WhatsApp:   "#B71C1C",
  Exhibition: "#EF9A9A",
};

function formatRupee(v: number) {
  return `Rs.${v.toLocaleString("en-IN")}`;
}

export function SalesSourceChart({ salesBySource }: SalesSourceChartProps) {
  const data = [
    { source: "Shop",       amount: salesBySource.Offline },
    { source: "Instagram",  amount: salesBySource.Instagram },
    { source: "WhatsApp",   amount: salesBySource.WhatsApp },
    { source: "Exhibition", amount: salesBySource.Exhibition },
  ];

  const hasData = data.some((d) => d.amount > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-base font-semibold text-[#1A1A1A] mb-4">
        Today&apos;s Sales by Channel
      </h2>
      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          No sales recorded today
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="source" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => `Rs.${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={52} />
            <Tooltip formatter={(v) => [formatRupee(Number(v)), "Revenue"]} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.source} fill={PALETTE[entry.source] ?? "#D32F2F"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
