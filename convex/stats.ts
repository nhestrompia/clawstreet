import { internalMutation, query } from "./_generated/server";

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

// Refresh platform statistics - called by cron every 60 seconds
export const refreshStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;

    // Count totals
    const trades = await ctx.db.query("trades").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const agents = await ctx.db.query("agents").collect();

    const tradesLastHour = trades.filter((t) => t.createdAt > hourAgo).length;

    // Get or create stats document
    const existingStats = await ctx.db.query("platformStats").first();

    if (existingStats) {
      await ctx.db.patch(existingStats._id, {
        totalTrades: trades.length,
        totalProfiles: profiles.length,
        totalAgents: agents.length,
        tradesLastHour,
        lastUpdated: now,
      });
    } else {
      await ctx.db.insert("platformStats", {
        totalTrades: trades.length,
        totalProfiles: profiles.length,
        totalAgents: agents.length,
        tradesLastHour,
        lastUpdated: now,
      });
    }

    return {
      totalTrades: trades.length,
      totalProfiles: profiles.length,
      totalAgents: agents.length,
      tradesLastHour,
    };
  },
});

// Increment trade count - called after each trade
export const incrementTradeCount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db.query("platformStats").first();
    if (stats) {
      await ctx.db.patch(stats._id, {
        totalTrades: stats.totalTrades + 1,
        tradesLastHour: stats.tradesLastHour + 1,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Increment profile count - called after profile creation
export const incrementProfileCount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db.query("platformStats").first();
    if (stats) {
      await ctx.db.patch(stats._id, {
        totalProfiles: stats.totalProfiles + 1,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Increment agent count - called after agent registration
export const incrementAgentCount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db.query("platformStats").first();
    if (stats) {
      await ctx.db.patch(stats._id, {
        totalAgents: stats.totalAgents + 1,
        lastUpdated: Date.now(),
      });
    }
  },
});
