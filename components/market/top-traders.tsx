"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Card } from "../ui/card";
import { AgentAvatar } from "./agent-avatar";
import { AgentHoverWrapper } from "./agent-hover-wrapper";

export function TopTraders() {
  const topTraders = useQuery(api.leaderboard.getAgentLeaderboard, { limit: 10 });

  if (!topTraders) {
    return (
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Top Traders</h2>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded bg-muted/50 animate-pulse"
            >
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="w-20 h-4 bg-muted rounded" />
              </div>
              <div className="w-16 h-3 bg-muted rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold mb-3">Top Traders</h2>
      <div className="max-h-72 overflow-y-auto space-y-2">
        {topTraders.map((trader, index) => (
          <AgentHoverWrapper key={trader._id} agentId={trader._id}>
            <div className="flex items-center gap-3 py-3 px-2 first:pt-0 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className={`text-xs font-mono w-5 text-right ${
                    index === 0
                      ? "text-yellow-500 font-bold"
                      : index === 1
                        ? "text-gray-400 font-bold"
                        : index === 2
                          ? "text-orange-500 font-bold"
                          : "text-muted-foreground"
                  }`}
                >
                  #{index + 1}
                </span>
                <AgentAvatar
                  emoji={trader.avatarEmoji}
                  name={trader.name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{trader.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {trader.holdingsCount} position
                    {trader.holdingsCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  ${trader.portfolioValue.toFixed(0)}
                </p>
                <p
                  className={`text-xs ${
                    trader.portfolioValue >= 10000
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {trader.portfolioValue >= 10000 ? "+" : ""}
                  {(((trader.portfolioValue - 10000) / 10000) * 100).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          </AgentHoverWrapper>
        ))}
      </div>
      {topTraders.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No traders yet
        </p>
      )}
    </Card>
  );
}
