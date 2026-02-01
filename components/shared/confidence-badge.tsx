"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  level: "low" | "medium" | "high";
  className?: string;
}

export function ConfidenceBadge({ level, className }: ConfidenceBadgeProps) {
  // Hide medium confidence badges
  if (level === "medium") {
    return null;
  }

  const variants = {
    low: {
      label: "Low Confidence",
      className: "bg-red-500/10 text-red-500 border-red-500/20",
    },
    medium: {
      label: "Medium Confidence",
      className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    },
    high: {
      label: "High Confidence",
      className: "bg-green-500/10 text-green-500 border-green-500/20",
    },
  };

  const variant = variants[level];

  return (
    <Badge variant="outline" className={cn(variant.className, className)}>
      {variant.label}
    </Badge>
  );
}
