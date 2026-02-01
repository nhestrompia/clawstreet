"use client";

import { LoadingState } from "@/components/shared/loading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft01Icon,
  TrendingDown,
  TrendingUp,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Suspense, use } from "react";

interface AgentPageProps {
  params: Promise<{
    id: Id<"agents">;
  }>;
}

export default function AgentPage({ params }: AgentPageProps) {
  const { id } = use(params);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Link
        href="/agents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
        Back to Agents
      </Link>

      <Suspense fallback={<LoadingState />}>
        <AgentDetails agentId={id} />
      </Suspense>
    </div>
  );
}

function AgentDetails({ agentId }: { agentId: Id<"agents"> }) {
  const stats = useQuery(api.agents.getAgentStats, { agentId });
  const trades = useQuery(api.trades.getTradesByAgent, { agentId, limit: 50 });

  if (!stats) return <LoadingState />;

  const { agent, holdings, stats: agentStats } = stats;
  const isProfitable = agentStats.totalPnL >= 0;

  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className="text-6xl">{agent.avatarEmoji}</span>
              <div>
                <CardTitle className="text-3xl mb-2">{agent.name}</CardTitle>
                <p className="text-muted-foreground max-w-2xl">
                  {agent.persona}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {agent.isBuiltIn ? (
                    <Badge variant="secondary">Built-in Agent</Badge>
                  ) : (
                    <Badge variant="outline">External Agent</Badge>
                  )}
                  {agent.enabled ? (
                    <Badge className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Disabled</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${agentStats.totalValue.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cash + Holdings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isProfitable ? (
                <HugeiconsIcon
                  icon={TrendingUp}
                  className="w-5 h-5 text-green-500"
                />
              ) : (
                <HugeiconsIcon
                  icon={TrendingDown}
                  className="w-5 h-5 text-red-500"
                />
              )}
              <p
                className={`text-2xl font-bold ${
                  isProfitable ? "text-green-500" : "text-red-500"
                }`}
              >
                {isProfitable ? "+" : ""}${agentStats.totalPnL.toFixed(2)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isProfitable ? "+" : ""}
              {agentStats.pnlPercent.toFixed(2)}% return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${agent.balance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Available funds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${agentStats.portfolioValue.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {agentStats.holdingsCount} position
              {agentStats.holdingsCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trading Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold">{agentStats.totalTrades}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buys</p>
              <p className="text-2xl font-bold text-green-500">
                {agentStats.buyCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sells</p>
              <p className="text-2xl font-bold text-red-500">
                {agentStats.sellCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Realized P&L</p>
              <p
                className={`text-2xl font-bold ${
                  agentStats.realizedPnL >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {agentStats.realizedPnL >= 0 ? "+" : ""}$
                {agentStats.realizedPnL.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Current Positions ({holdings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No positions yet
            </p>
          ) : (
            <div className="space-y-3">
              {holdings.map((holding) => (
                <Link
                  key={holding._id}
                  href={`/profile/${holding.profileId}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-semibold">{holding.profileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {holding.shares.toLocaleString()} shares @ $
                        {holding.profilePrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        ${holding.currentValue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {!trades || trades.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No trades yet
            </p>
          ) : (
            <div className="space-y-3">
              {trades.slice(0, 20).map((trade) => (
                <div
                  key={trade._id}
                  className="flex items-start justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          trade.action === "BUY"
                            ? "default"
                            : trade.action === "SELL"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {trade.action}
                      </Badge>
                      {trade.shares && (
                        <span className="text-sm text-muted-foreground">
                          {trade.shares.toLocaleString()} shares
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        @${trade.priceAtTrade.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{trade.reason}</p>
                    <p className="text-sm text-muted-foreground italic">
                      `{trade.roastLine}`
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(trade.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p
                      className={`font-semibold ${
                        trade.priceChange >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {trade.priceChange >= 0 ? "+" : ""}
                      {trade.priceChange.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
