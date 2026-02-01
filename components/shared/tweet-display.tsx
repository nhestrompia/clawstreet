"use client";

import { getTweetIdForDisplay } from "@/lib/tweet-utils";
import * as React from "react";
import { Suspense } from "react";
import { Tweet as ReactTweet } from "react-tweet";
import { Card } from "@/components/ui/card";

interface TweetDisplayProps {
  tweetId: string; // Can be URL or ID
}

interface ContentItemProps {
  content: string; // Can be tweet URL or plain text
  creatorType?: "user" | "agent";
}

function TweetSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-full bg-muted" />
        <div className="flex-1">
          <div className="w-24 h-4 bg-muted rounded mb-1" />
          <div className="w-32 h-3 bg-muted rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="w-full h-3 bg-muted rounded" />
        <div className="w-4/5 h-3 bg-muted rounded" />
      </div>
    </div>
  );
}

function TweetContent({ tweetId }: TweetDisplayProps) {
  // Extract ID from URL if needed
  const id = getTweetIdForDisplay(tweetId);

  return (
    <div className="tweet-container [&>div]:mx-auto [&>div]:max-w-full">
      <ReactTweet id={id} />
    </div>
  );
}

export function TweetDisplay({ tweetId }: TweetDisplayProps) {
  return (
    <Suspense fallback={<TweetSkeleton />}>
      <TweetContent tweetId={tweetId} />
    </Suspense>
  );
}

// Helper to detect if content is a tweet URL
function isTweetUrl(content: string): boolean {
  return (
    content.startsWith("https://x.com/") ||
    content.startsWith("https://twitter.com/") ||
    /^\d+$/.test(content) // Also treat pure numeric IDs as tweets
  );
}

// Display either a tweet embed or plain text based on content type
export function ContentItem({ content, creatorType }: ContentItemProps) {
  const isUrl = isTweetUrl(content);

  // If it's a URL (tweet link), embed it
  // Otherwise display as plain text card
  if (isUrl) {
    return <TweetDisplay tweetId={content} />;
  }

  // Display as plain text for self-descriptions
  return (
    <Card className="p-4 text-sm leading-relaxed">
      <p className="whitespace-pre-wrap">{content}</p>
    </Card>
  );
}

interface TweetListProps {
  tweetIds: string[]; // Can be URLs or IDs
  limit?: number;
  collapsible?: boolean; // When true, shows only first tweet with expand button
}

interface ContentListProps {
  items: string[]; // Can be tweet URLs (users) or text descriptions (agents)
  creatorType?: "user" | "agent";
  limit?: number;
  collapsible?: boolean;
}

export function TweetList({
  tweetIds,
  limit,
  collapsible = false,
}: TweetListProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // If collapsible is true, show only 1 tweet unless expanded
  const effectiveLimit = collapsible && !isExpanded ? 1 : limit;
  const displayTweets = effectiveLimit
    ? tweetIds.slice(0, effectiveLimit)
    : tweetIds;
  const remaining = tweetIds.length - displayTweets.length;

  return (
    <div className="space-y-4">
      {displayTweets.map((tweetId) => (
        <TweetDisplay key={tweetId} tweetId={tweetId} />
      ))}
      {remaining > 0 && (
        <div className="text-center">
          {collapsible ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-primary hover:underline"
            >
              {isExpanded
                ? "Show less"
                : `Show ${remaining} more tweet${remaining !== 1 ? "s" : ""}`}
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              + {remaining} more tweet{remaining !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Smart content list that handles both tweets and plain text
export function ContentList({
  items,
  creatorType = "user",
  limit,
  collapsible = false,
}: ContentListProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const effectiveLimit = collapsible && !isExpanded ? 1 : limit;
  const displayItems = effectiveLimit ? items.slice(0, effectiveLimit) : items;
  const remaining = items.length - displayItems.length;

  // Determine label based on creator type
  const label = creatorType === "agent" ? "statement" : "tweet";
  const labelPlural = creatorType === "agent" ? "statements" : "tweets";

  return (
    <div className="space-y-4">
      {displayItems.map((item, index) => (
        <ContentItem key={index} content={item} creatorType={creatorType} />
      ))}
      {remaining > 0 && (
        <div className="text-center">
          {collapsible ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-primary hover:underline"
            >
              {isExpanded
                ? "Show less"
                : `Show ${remaining} more ${remaining !== 1 ? labelPlural : label}`}
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              + {remaining} more {remaining !== 1 ? labelPlural : label}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
