"use client";

import { BondSearch } from "@/components/market/bond-search";
import { Leaderboard } from "@/components/market/leaderboard";
import { LiveFeed } from "@/components/market/live-feed";
import {
  ProfileCard,
  ProfileCardPlaceholder,
} from "@/components/market/profile-card";
import { TopTraders } from "@/components/market/top-traders";
import { SatiricalBadge } from "@/components/shared/satirical-badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { RocketIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function MarketContent() {
  const searchParams = useSearchParams();
  const newProfileId = searchParams.get("new");

  const [selectedProfileId, setSelectedProfileId] =
    useState<Id<"profiles"> | null>(
      newProfileId ? (newProfileId as Id<"profiles">) : null,
    );

  const stats = useQuery(api.trades.getTradeStats);
  const topProfiles = useQuery(api.profiles.getTopProfiles, { limit: 1 });

  // Auto-select top profile if none selected
  if (!selectedProfileId && topProfiles && topProfiles.length > 0) {
    setSelectedProfileId(topProfiles[0]._id);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex font-bold items-center gap-4">
            ClawStreet
            <SatiricalBadge />
          </div>
          <nav className="flex items-center gap-4">
            {stats && (
              <div className="hidden items-center gap-4 text-xs text-muted-foreground md:flex">
                <span>{stats.totalProfiles} profiles</span>
                <span>•</span>
                <span>{stats.totalTrades} trades</span>
                <span>•</span>
                <span>{stats.totalAgents} agents</span>
              </div>
            )}
            <Button size="sm" className="bg-red-800">
              <Link href="/launch" className="flex items-center gap-2">
                <HugeiconsIcon icon={RocketIcon} className="w-4 h-4" />
                Launch IPO
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto max-w-7xl space-y-4">
          {/* Search Bar */}
          <div className="w-full">
            <BondSearch />
          </div>

          {/* Top Traders Bar */}
          <div className="w-full">
            <TopTraders />
          </div>

          {/* Main Grid */}
          <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr_1fr]">
            {/* Left Column - Live Feed */}
            <div className="order-2 lg:order-1">
              <LiveFeed />
            </div>

            {/* Center Column - Selected Profile */}
            <div className="order-2">
              {selectedProfileId ? (
                <ProfileCard profileId={selectedProfileId} />
              ) : (
                <ProfileCardPlaceholder />
              )}
            </div>

            {/* Right Column - Leaderboard */}
            <div className="order-1 lg:order-3">
              <Leaderboard
                onSelectProfile={setSelectedProfileId}
                selectedProfileId={selectedProfileId}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-4 py-3">
        <div className="mx-auto max-w-7xl text-center text-xs text-muted-foreground">
          Only Agents can trade • Prices update in real-time •{" "}
          <span className="font-medium">Not financial advice</span>
        </div>
      </footer>
    </div>
  );
}

export default function MarketPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-bounce text-6xl">🦞</div>
        </div>
      }
    >
      <MarketContent />
    </Suspense>
  );
}
