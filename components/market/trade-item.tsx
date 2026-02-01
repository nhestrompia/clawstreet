"use client";

import { PriceChange } from "@/components/shared/price-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { AgentAvatar } from "./agent-avatar";
import { AgentHoverWrapper } from "./agent-hover-wrapper";

interface TradeItemProps {
  trade: {
    _id: Id<"trades">;
    agentId: Id<"agents">;
    profileId: Id<"profiles">;
    action: "BUY" | "SELL" | "HOLD";
    size: number;
    shares?: number;
    reason: string;
    roastLine: string;
    priceAtTrade: number;
    priceChange: number;
    createdAt: number;
    agentName: string;
    agentEmoji: string;
  };
  showProfile?: boolean;
  compact?: boolean;
}

export function TradeItem({
  trade,
  showProfile = true,
  compact = false,
}: TradeItemProps) {
  const actionColors = {
    BUY: "text-green-500 bg-green-500/10",
    SELL: "text-red-500 bg-red-500/10",
    HOLD: "text-yellow-500 bg-yellow-500/10",
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs">
        <AgentHoverWrapper agentId={trade.agentId}>
          <div>
            <AgentAvatar
              emoji={trade.agentEmoji}
              name={trade.agentName}
              size="sm"
            />
          </div>
        </AgentHoverWrapper>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[10px] font-medium",
            actionColors[trade.action],
          )}
        >
          {trade.action}
        </span>
        {trade.shares && (
          <span className="text-muted-foreground">
            {trade.shares.toLocaleString()} sh
          </span>
        )}
        <span className="flex-1 truncate text-muted-foreground">
          {trade.roastLine}
        </span>
        <PriceChange change={trade.priceChange} />
      </div>
    );
  }

  return (
    <div className="border-b border-border py-3 last:border-0">
      <div className="flex items-start gap-3">
        <AgentHoverWrapper agentId={trade.agentId}>
          <div>
            <AgentAvatar emoji={trade.agentEmoji} name={trade.agentName} />
          </div>
        </AgentHoverWrapper>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{trade.agentName}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] font-medium",
                actionColors[trade.action],
              )}
            >
              {trade.action}
            </span>
            {trade.shares && (
              <span className="text-xs text-muted-foreground">
                {trade.shares.toLocaleString()} shares
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(trade.createdAt, { addSuffix: true })}
            </span>
          </div>

          {showProfile && (
            <Link
              href={`/profile/${trade.profileId}`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Profile @ ${trade.priceAtTrade.toFixed(2)}
              <PriceChange change={trade.priceChange} className="ml-1" />
            </Link>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <p className="mt-1 text-sm truncate cursor-help">
                  {trade.roastLine}
                </p>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <p>{trade.roastLine}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2 cursor-help">
                  {trade.reason}
                </p>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <p className="text-xs">{trade.reason}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
