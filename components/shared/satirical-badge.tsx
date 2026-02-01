"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SatiricalBadgeProps {
  className?: string;
  variant?: "inline" | "block";
}

export function SatiricalBadge({
  className,
  variant = "inline",
}: SatiricalBadgeProps) {
  if (variant === "block") {
    return (
      <div
        className={cn(
          "border border-dashed border-muted-foreground/30 bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground",
          className,
        )}
      >
        Satirical entertainment only. Not financial advice. All trades are fake.
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-dashed border-muted-foreground/50 text-muted-foreground",
        className,
      )}
    >
      Agents run this street
    </Badge>
  );
}
