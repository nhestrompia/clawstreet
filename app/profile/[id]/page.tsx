"use client";

import { AgentAvatar } from "@/components/market/agent-avatar";
import { PriceChart } from "@/components/market/price-chart";
import { TradeItem } from "@/components/market/trade-item";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { PriceBadge, PriceChange } from "@/components/shared/price-badge";
import { SatiricalBadge } from "@/components/shared/satirical-badge";
import { ContentList } from "@/components/shared/tweet-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import Link from "next/link";
import { use } from "react";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { id } = use(params);
  const profileId = id as Id<"profiles">;

  const profile = useQuery(api.profiles.getProfile, { profileId });
  const priceHistory = useQuery(api.profiles.getPriceHistory, {
    profileId,
    limit: 100,
  });
  const trades = useQuery(api.trades.getTradesByProfile, {
    profileId,
    limit: 50,
  });

  if (profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Profile not found</p>
        <Link href="/market">
          <Button variant="outline">Back to Market</Button>
        </Link>
      </div>
    );
  }

  // Calculate stats
  const buyTrades = trades?.filter((t) => t.action === "BUY") ?? [];
  const sellTrades = trades?.filter((t) => t.action === "SELL") ?? [];
  const priceChangeFromStart = profile.currentPrice - 10;
  const priceChangePercent = ((profile.currentPrice - 10) / 10) * 100;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/market" className="text-lg font-bold tracking-tight">
              ClawStreet
            </Link>
            <SatiricalBadge />
          </div>
          <Link href="/market">
            <Button variant="outline" size="sm">
              Back to Market
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Share Card - Screenshot-friendly */}
          <Card className="overflow-hidden">
            <div className="bg-linear-to-r from-primary/10 to-primary/5 px-6 py-8">
              <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-3">
                    {profile.name || "Unnamed IPO"}
                  </h1>
                  <div className="flex items-center justify-center gap-3 md:justify-start">
                    <PriceBadge
                      price={profile.currentPrice}
                      size="lg"
                      showChange={false}
                    />
                    <PriceChange change={priceChangeFromStart} />
                    <span className="text-xs text-muted-foreground">
                      ({priceChangePercent >= 0 ? "+" : ""}
                      {priceChangePercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    <ConfidenceBadge level={profile.confidenceLevel} />
                    <span className="text-xs text-muted-foreground">
                      IPO: {format(profile.createdAt, "MMM d, yyyy")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {profile.totalTrades} trades
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Price Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Price History</CardTitle>
                </CardHeader>
                <CardContent>
                  {priceHistory && priceHistory.length > 0 ? (
                    <PriceChart data={priceHistory} height={250} showAxes />
                  ) : (
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                      No price history yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tweets */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {profile.creatorType === "agent" ? "About" : "Tweets"} ({profile.tweets.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ContentList
                    items={profile.tweets}
                    creatorType={profile.creatorType}
                    collapsible={profile.tweets.length > 1}
                  />
                </CardContent>
              </Card>

              {/* Trade History */}
              <Card>
                <CardHeader>
                  <CardTitle>Trade History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {trades && trades.length > 0 ? (
                    <div className="divide-y divide-border max-h-96 overflow-y-auto">
                      {trades.map((trade) => (
                        <div key={trade._id} className="px-4">
                          <TradeItem trade={trade} showProfile={false} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No trades yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Bio */}
              {profile.bio && (
                <Card>
                  <CardHeader>
                    <CardTitle>Bio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{profile.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      IPO Price
                    </span>
                    <span className="font-mono text-sm">$10.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Current Price
                    </span>
                    <span className="font-mono text-sm">
                      ${profile.currentPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Price Change
                    </span>
                    <PriceChange change={priceChangeFromStart} />
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Trades
                    </span>
                    <span className="font-mono text-sm">
                      {profile.totalTrades}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Buys</span>
                    <span className="font-mono text-sm text-green-500">
                      {buyTrades.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sells</span>
                    <span className="font-mono text-sm text-red-500">
                      {sellTrades.length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Top Traders */}
              {trades && trades.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Trading Agents</CardTitle>
                  </CardHeader>
                  <CardContent className="">
                    {/* Get unique agents */}
                    {Array.from(
                      new Map<string, { name: string; emoji: string }>(
                        trades.map(
                          (t: {
                            agentId: string;
                            agentName: string;
                            agentEmoji: string;
                          }) => [
                            t.agentId,
                            { name: t.agentName, emoji: t.agentEmoji },
                          ],
                        ),
                      ),
                    )
                      .slice(0, 5)
                      .map(
                        ([agentId, agent]: [
                          string,
                          { name: string; emoji: string },
                        ]) => {
                          const agentTrades = trades.filter(
                            (t: { agentId: string }) => t.agentId === agentId,
                          );
                          const buys = agentTrades.filter(
                            (t: { action: string }) => t.action === "BUY",
                          );
                          const sells = agentTrades.filter(
                            (t: { action: string }) => t.action === "SELL",
                          );

                          return (
                            <div
                              key={agentId}
                              className="flex items-center gap-3"
                            >
                              <AgentAvatar
                                emoji={agent.emoji}
                                name={agent.name}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {agent.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {buys.length} buys • {sells.length} sells
                                </p>
                              </div>
                            </div>
                          );
                        },
                      )}
                  </CardContent>
                </Card>
              )}

              {/* Disclaimer */}
              <SatiricalBadge variant="block" />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-4 py-4">
        <div className="mx-auto max-w-5xl text-center text-xs text-muted-foreground">
          Prices update in real-time • Entertainment purposes only
        </div>
      </footer>
    </div>
  );
}
