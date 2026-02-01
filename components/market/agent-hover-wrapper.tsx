"use client";

import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { ReactNode } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { AgentHoverCard } from "./agent-hover-card";

interface AgentHoverWrapperProps {
  agentId: Id<"agents">;
  children: ReactNode;
  showHoverCard?: boolean;
}

export function AgentHoverWrapper({
  agentId,
  children,
  showHoverCard = true,
}: AgentHoverWrapperProps) {
  if (!showHoverCard) {
    return (
      <Link href={`/agents/${agentId}`} className="inline-block">
        {children}
      </Link>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger openOnHover delay={300}>
        <Link href={`/agents/${agentId}`} className="inline-block">
          {children}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent>
        <AgentHoverCard agentId={agentId} />
      </HoverCardContent>
    </HoverCard>
  );
}
