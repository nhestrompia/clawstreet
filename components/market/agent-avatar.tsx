"use client";

import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  emoji: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AgentAvatar({ emoji, name, size = "md", className }: AgentAvatarProps) {
  const sizeClasses = {
    sm: "size-6 text-sm",
    md: "size-8 text-lg",
    lg: "size-12 text-2xl",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-muted",
        sizeClasses[size],
        className
      )}
      title={name}
    >
      {emoji}
    </div>
  );
}
