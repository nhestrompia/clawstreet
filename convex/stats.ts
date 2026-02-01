import { internalMutation, query } from "./_generated/server";

async function getOrCreateStats(ctx: { db: any }) {
  const existing = await ctx.db.query("platformStats").first();
  if (existing) {
    return existing;
  }

  const statsId = await ctx.db.insert("platformStats", {
    totalTrades: 0,
    totalProfiles: 0,
    totalAgents: 0,
    tradesLastHour: 0,
    lastUpdated: Date.now(),
  });

  return await ctx.db.get(statsId);
}

// Get precomputed platform statistics - O(1) read
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db.query("platformStats").first();

    // Return default values if stats don't exist yet
    if (!stats) {
      return {
        totalTrades: 0,
        totalProfiles: 0,
        totalAgents: 0,
        tradesLastHour: 0,
      };
    }

    return {
      totalTrades: stats.totalTrades,
      totalProfiles: stats.totalProfiles,
      totalAgents: stats.totalAgents,
      tradesLastHour: stats.tradesLastHour,
    };
  },
});

// Refresh last-hour trade count from minute buckets
export const refreshTradesLastHour = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const hourAgoMinute = Math.floor(hourAgo / 60000) * 60000;

    const buckets = await ctx.db
      .query("tradeBuckets")
      .withIndex("by_minute", (q) => q.gte("minute", hourAgoMinute))
      .collect();

    let tradesLastHour = buckets.reduce(
      (sum: number, bucket: { count: number }) => sum + bucket.count,
      0,
    );

    // If buckets are empty (e.g., after deploy), backfill from recent trades
    if (buckets.length === 0) {
      const recentTrades = await ctx.db
        .query("trades")
        .withIndex("by_created", (q) => q.gte("createdAt", hourAgo))
        .collect();

      const bucketCounts = new Map<number, number>();
      for (const trade of recentTrades) {
        const minute = Math.floor(trade.createdAt / 60000) * 60000;
        bucketCounts.set(minute, (bucketCounts.get(minute) ?? 0) + 1);
      }

      for (const [minute, count] of bucketCounts.entries()) {
        await ctx.db.insert("tradeBuckets", { minute, count });
      }

      tradesLastHour = recentTrades.length;
    }

    const stats = await getOrCreateStats(ctx);
    await ctx.db.patch(stats._id, {
      tradesLastHour,
      lastUpdated: now,
    });

    // Cleanup buckets older than 48 hours (bounded)
    const staleBefore = hourAgoMinute - 48 * 60 * 60 * 1000;
    const staleBuckets = await ctx.db
      .query("tradeBuckets")
      .withIndex("by_minute", (q) => q.lt("minute", staleBefore))
      .take(100);

    for (const bucket of staleBuckets) {
      await ctx.db.delete(bucket._id);
    }

    return { tradesLastHour };
  },
});

// Increment trade count - called after each trade
export const incrementTradeCount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stats = await getOrCreateStats(ctx);

    await ctx.db.patch(stats._id, {
      totalTrades: stats.totalTrades + 1,
      tradesLastHour: stats.tradesLastHour + 1,
      lastUpdated: now,
    });

    const minute = Math.floor(now / 60000) * 60000;
    const bucket = await ctx.db
      .query("tradeBuckets")
      .withIndex("by_minute", (q) => q.eq("minute", minute))
      .first();

    if (bucket) {
      await ctx.db.patch(bucket._id, { count: bucket.count + 1 });
    } else {
      await ctx.db.insert("tradeBuckets", { minute, count: 1 });
    }
  },
});

// Increment profile count - called after profile creation
export const incrementProfileCount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stats = await getOrCreateStats(ctx);
    await ctx.db.patch(stats._id, {
      totalProfiles: stats.totalProfiles + 1,
      lastUpdated: Date.now(),
    });
  },
});

// Increment agent count - called after agent registration
export const incrementAgentCount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stats = await getOrCreateStats(ctx);
    await ctx.db.patch(stats._id, {
      totalAgents: stats.totalAgents + 1,
      lastUpdated: Date.now(),
    });
  },
});
