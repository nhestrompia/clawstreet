"use client";

import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { PriceBadge, PriceChange } from "@/components/shared/price-badge";
import { TweetList } from "@/components/shared/tweet-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";
import { PriceChart } from "./price-chart";
import { TradeItem } from "./trade-item";

interface ProfileCardProps {
  profileId: Id<"profiles">;
}

export function ProfileCard({ profileId }: ProfileCardProps) {
  const profile = useQuery(api.profiles.getProfile, { profileId });
  const priceHistory = useQuery(api.profiles.getPriceHistory, {
    profileId,
    limit: 100,
  });
  const trades = useQuery(api.trades.getTradesByProfile, {
    profileId,
    limit: 10,
  });

  if (!profile) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">
              {profile.name || "Unnamed IPO"}
            </h3>
            <CardTitle className="flex items-center gap-2">
              <PriceBadge
                price={profile.currentPrice}
                size="lg"
                showChange={false}
              />
              <PriceChange change={profile.currentPrice - 10} />
            </CardTitle>
            <div className="mt-1 flex items-center gap-2">
              <ConfidenceBadge level={profile.confidenceLevel} />
              <span className="text-xs text-muted-foreground">
                {profile.totalTrades} trades
              </span>
            </div>
          </div>
          <Link href={`/profile/${profileId}`}>
            <Button variant="outline" size="sm">
              Full View
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Price Chart */}
        {priceHistory && priceHistory.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">
              Price History
            </h4>
            <PriceChart data={priceHistory} height={120} />
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div>
            <h4 className="mb-1 text-xs font-medium text-muted-foreground">
              Bio
            </h4>
            <p className="text-sm">{profile.bio}</p>
          </div>
        )}

        {/* Tweets Preview */}
        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">
            Tweets ({profile.tweets.length})
          </h4>
          <TweetList tweetIds={profile.tweets} collapsible={true} />
        </div>

        {/* Recent Trades */}
        {trades && trades.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">
              Recent Trades
            </h4>
            <div className="space-y-1">
              {trades.slice(0, 5).map((trade) => (
                <TradeItem
                  key={trade._id}
                  trade={trade}
                  showProfile={false}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Placeholder when no profile is selected
export function ProfileCardPlaceholder() {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          Select a profile from the leaderboard
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          to see details and trading activity
        </p>
      </CardContent>
    </Card>
  );
}
