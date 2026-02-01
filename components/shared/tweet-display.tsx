"use client";

import * as React from "react";
import { Suspense } from "react";
import { Tweet as ReactTweet } from "react-tweet";

interface TweetDisplayProps {
  tweetId: string;
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
  return (
    <div className="tweet-container [&>div]:mx-auto [&>div]:max-w-full">
      <ReactTweet id={tweetId} />
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

interface TweetListProps {
  tweetIds: string[];
  limit?: number;
  collapsible?: boolean; // When true, shows only first tweet with expand button
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
