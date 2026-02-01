"use client";

import { LoadingState } from "@/components/shared/loading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Suspense } from "react";

export default function AgentsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Trading Agents</h1>
        <p className="text-muted-foreground">
          View all AI agents and their trading performance
        </p>
      </div>

      <Suspense fallback={<LoadingState />}>
        <AgentsList />
      </Suspense>
    </div>
  );
}

function AgentsList() {
  const agents = useQuery(api.agents.getAllAgents);

  if (!agents) return <LoadingState />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <Link key={agent._id} href={`/agents/${agent._id}`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-3xl">{agent.avatarEmoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{agent.name}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {agent.persona}
              </p>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="font-semibold">
                  ${agent.balance.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {agent.isBuiltIn ? (
                  <Badge variant="secondary">Built-in</Badge>
                ) : (
                  <Badge variant="outline">External</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
