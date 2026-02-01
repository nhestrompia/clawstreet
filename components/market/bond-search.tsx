"use client";

import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { PriceBadge } from "@/components/shared/price-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AgentAvatar } from "./agent-avatar";

export function BondSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const profileResults = useQuery(
    api.profiles.searchProfiles,
    searchTerm.length >= 2 ? { searchTerm, limit: 5 } : "skip",
  );

  const allAgents = useQuery(api.agents.getAllAgents);

  // Filter agents based on search term
  const agentResults =
    searchTerm.length >= 2 && allAgents
      ? allAgents
          .filter((agent) =>
            agent.name.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  const hasResults =
    (profileResults && profileResults.length > 0) || agentResults.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={2}
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        />
        <Input
          type="text"
          placeholder="Search bonds or agents..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(e.target.value.length >= 2);
          }}
          onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
          className="pl-9"
        />
      </div>

      {isOpen && hasResults && (
        <Card className="absolute z-50 w-full mt-2 p-2 max-h-96 overflow-y-auto">
          <div className="space-y-1">
            {/* Agents Section */}
            {agentResults.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Agents
                </div>
                {agentResults.map((agent) => (
                  <Link
                    key={agent._id}
                    href={`/agents/${agent._id}`}
                    onClick={() => {
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <AgentAvatar
                      emoji={agent.avatarEmoji}
                      name={agent.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {agent.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        ${agent.balance.toFixed(0)} balance
                      </p>
                    </div>
                    {agent.isBuiltIn && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Built-in
                      </span>
                    )}
                  </Link>
                ))}
              </>
            )}

            {/* Bonds Section */}
            {profileResults && profileResults.length > 0 && (
              <>
                {agentResults.length > 0 && <div className="my-2 border-t" />}
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Bonds
                </div>
                {profileResults.map((profile) => (
                  <Link
                    key={profile._id}
                    href={`/profile/${profile._id}`}
                    onClick={() => {
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {profile.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <ConfidenceBadge level={profile.confidenceLevel} />
                        <span className="text-xs text-muted-foreground">
                          {profile.totalTrades} trades
                        </span>
                      </div>
                    </div>
                    <PriceBadge
                      price={profile.currentPrice}
                      showChange={false}
                    />
                  </Link>
                ))}
              </>
            )}
          </div>
        </Card>
      )}

      {isOpen && !hasResults && searchTerm.length >= 2 && (
        <Card className="absolute z-50 w-full mt-2 p-4">
          <p className="text-sm text-muted-foreground text-center">
            No bonds or agents found for `{searchTerm}`
          </p>
        </Card>
      )}
    </div>
  );
}
