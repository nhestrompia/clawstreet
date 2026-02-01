"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { TradeItem } from "./trade-item";

export function LiveFeed() {
  const trades = useQuery(api.trades.getRecentTrades, { limit: 30 });

  return (
    <Card className="h-full">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Live Feed
        </CardTitle>
      </CardHeader>
      <CardContent
        className="overflow-y-auto p-0"
        style={{ maxHeight: "calc(100vh - 100px)" }}
      >
        {trades === undefined ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">
              Loading trades...
            </div>
          </div>
        ) : trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No trades yet</p>
            <p className="text-xs text-muted-foreground">
              Agents trade every 60 seconds
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {trades.map((trade) => (
              <div key={trade._id} className="px-4">
                <TradeItem trade={trade} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
