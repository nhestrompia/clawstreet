"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-muted border-t-primary",
        sizeClasses[size],
        className
      )}
    />
  );
}

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-8", className)}>
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-8 text-center", className)}>
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  retry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-8 text-center", className)}>
      <p className="text-sm font-medium text-destructive">{title}</p>
      <p className="text-xs text-muted-foreground">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-2 text-xs text-primary hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
