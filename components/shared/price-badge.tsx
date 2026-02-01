"use client";

import { cn } from "@/lib/utils";

interface PriceBadgeProps {
  price: number;
  change?: number;
  size?: "sm" | "md" | "lg";
  showChange?: boolean;
  className?: string;
}

export function PriceBadge({
  price,
  change,
  size = "md",
  showChange = true,
  className,
}: PriceBadgeProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg font-semibold",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("font-mono", sizeClasses[size])}>
        ${price.toFixed(2)}
      </span>
      {showChange && change !== undefined && change !== 0 && (
        <span
          className={cn(
            "font-mono text-xs",
            isPositive && "text-green-500",
            isNegative && "text-red-500"
          )}
        >
          {isPositive ? "+" : ""}
          {change.toFixed(2)}
        </span>
      )}
    </div>
  );
}

interface PriceChangeProps {
  change: number;
  percent?: boolean;
  className?: string;
}

export function PriceChange({ change, percent = false, className }: PriceChangeProps) {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <span
      className={cn(
        "font-mono text-xs",
        isPositive && "text-green-500",
        isNegative && "text-red-500",
        !isPositive && !isNegative && "text-muted-foreground",
        className
      )}
    >
      {isPositive ? "+" : ""}
      {change.toFixed(2)}
      {percent ? "%" : ""}
    </span>
  );
}
