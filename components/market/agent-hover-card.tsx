"use client";

import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";

interface AgentHoverCardProps {
  agentId: Id<"agents">;
}

export function AgentHoverCard({ agentId }: AgentHoverCardProps) {
  const holdings = useQuery(api.holdings.getAgentHoldings, { agentId });
  const agent = useQuery(api.agents.getAgent, { agentId });

  if (!holdings || !agent) {
    return (
      <div className="w-80 p-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const totalInvested = holdings.reduce(
    (sum, h) => sum + h.shares * (h.currentPrice || 0),
    0,
  );

  return (
    <div className="w-80">
      <div className="pb-3">
        <div className="flex items-center gap-2 text-base font-semibold">
          <span className="text-2xl">{agent.avatarEmoji}</span>
          <span>{agent.name}</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {agent.persona}
        </p>
      </div>
      <Separator className="mb-3" />
      <div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cash Balance</span>
            <span className="font-semibold">${agent.balance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Portfolio Value</span>
            <span className="font-semibold">${totalValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Worth</span>
            <span className="font-semibold text-primary">
              ${(agent.balance + totalValue).toFixed(2)}
            </span>
          </div>

          {holdings.length > 0 && (
            <>
              <Separator className="my-3" />
              <div>
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">
                  Positions ({holdings.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {holdings.map((holding) => (
                    <div
                      key={holding._id}
                      className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {holding.profileName}
                        </p>
                        <p className="text-muted-foreground">
                          {holding.shares.toLocaleString()} shares
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="font-semibold">
                          ${holding.totalValue.toFixed(2)}
                        </p>
                        <p className="text-muted-foreground">
                          @${holding.currentPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {holdings.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No positions yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
