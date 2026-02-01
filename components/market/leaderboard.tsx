"use client";

import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { PriceBadge, PriceChange } from "@/components/shared/price-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";

interface LeaderboardProps {
  onSelectProfile?: (profileId: Id<"profiles">) => void;
  selectedProfileId?: Id<"profiles"> | null;
}

export function Leaderboard({
  onSelectProfile,
  selectedProfileId,
}: LeaderboardProps) {
  const profiles = useQuery(api.profiles.getTopProfiles, { limit: 15 });

  return (
    <Card className="h-full">
      <CardHeader className="border-b">
        <CardTitle>Top Movers</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {profiles === undefined ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No profiles yet</p>
            <Link
              href="/"
              className="mt-2 text-xs text-primary hover:underline"
            >
              Launch the first IPO
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {profiles.map((profile, index) => (
              <button
                key={profile._id}
                onClick={() => onSelectProfile?.(profile._id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                  selectedProfileId === profile._id ? "bg-muted" : ""
                }`}
              >
                <span className="w-6 text-center font-mono text-sm text-muted-foreground">
                  #{index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {profile.name || "Unnamed IPO"}
                    </span>
                    <ConfidenceBadge level={profile.confidenceLevel} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{profile.totalTrades} trades</span>
                    <span>•</span>
                    <span>{profile.tweets.length} tweets</span>
                  </div>
                </div>
                <div className="text-right">
                  <PriceBadge price={profile.currentPrice} showChange={false} />
                  <PriceChange
                    change={profile.currentPrice - 10}
                    className="text-[10px]"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
