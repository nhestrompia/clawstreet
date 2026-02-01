"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";

interface PriceHistoryEntry {
  _id: string;
  profileId: string;
  price: number;
  timestamp: number;
}

interface PriceChartProps {
  data: PriceHistoryEntry[];
  height?: number;
  showAxes?: boolean;
  showTooltip?: boolean;
}

export function PriceChart({
  data,
  height = 100,
  showAxes = false,
  showTooltip = true,
}: PriceChartProps) {
  // Sort by timestamp ascending and format data
  const chartData = [...data]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((entry) => ({
      timestamp: entry.timestamp,
      price: entry.price,
      formattedTime: format(entry.timestamp, "HH:mm"),
    }));

  if (chartData.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        Not enough data
      </div>
    );
  }

  // Determine if price is up or down
  const firstPrice = chartData[0]?.price ?? 0;
  const lastPrice = chartData[chartData.length - 1]?.price ?? 0;
  const isUp = lastPrice >= firstPrice;
  const strokeColor = isUp ? "#22c55e" : "#ef4444";
  const fillColor = isUp ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        {showAxes && (
          <>
            <XAxis
              dataKey="formattedTime"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
          </>
        )}
        {showTooltip && (
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="rounded border border-border bg-background px-2 py-1 text-xs shadow-lg">
                  <div className="font-mono font-medium">
                    ${data.price.toFixed(2)}
                  </div>
                  <div className="text-muted-foreground">
                    {format(data.timestamp, "MMM d, HH:mm")}
                  </div>
                </div>
              );
            }}
          />
        )}
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="price"
          stroke={strokeColor}
          strokeWidth={1.5}
          fill="url(#priceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Mini sparkline version for lists
export function PriceSparkline({
  data,
  width = 80,
  height = 24,
}: {
  data: PriceHistoryEntry[];
  width?: number;
  height?: number;
}) {
  const chartData = [...data]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-20) // Only show last 20 points
    .map((entry) => ({
      price: entry.price,
    }));

  if (chartData.length < 2) {
    return <div style={{ width, height }} />;
  }

  const firstPrice = chartData[0]?.price ?? 0;
  const lastPrice = chartData[chartData.length - 1]?.price ?? 0;
  const isUp = lastPrice >= firstPrice;
  const strokeColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sparkline-${isUp}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={1}
            fill={`url(#sparkline-${isUp})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
