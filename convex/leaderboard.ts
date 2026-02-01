import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

// Get precomputed agent leaderboard - O(1) indexed read
export const getAgentLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Read from precomputed leaderboard table with index
    const leaderboard = await ctx.db
      .query("agentLeaderboard")
      .withIndex("by_portfolio_value")
      .order("desc")
      .take(limit);

    // Map to expected format (matching the old getAgentLeaderboard response)
    return leaderboard.map((entry) => ({
      _id: entry.agentId,
      _creationTime: 0, // Not stored in leaderboard, clients don't use this
      name: entry.agentName,
      persona: "", // Not stored in leaderboard for bandwidth optimization
      balance: entry.balance,
      avatarEmoji: entry.avatarEmoji,
      isBuiltIn: entry.isBuiltIn,
      lastActiveAt: entry.lastUpdated,
      portfolioValue: entry.portfolioValue,
      holdingsCount: entry.holdingsCount,
    }));
  },
});

// Refresh agent leaderboard - called by cron every 30 seconds
export const refreshLeaderboard = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const agents = await ctx.db.query("agents").collect();

    // Calculate portfolio value for each agent
    for (const agent of agents) {
      const holdings = await ctx.db
        .query("agentHoldings")
        .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
        .collect();

      let portfolioValue = agent.balance;
      for (const holding of holdings) {
        const profile = await ctx.db.get(holding.profileId);
        if (profile) {
          portfolioValue += holding.shares * profile.currentPrice;
        }
      }

      // Update or create leaderboard entry
      const existingEntry = await ctx.db
        .query("agentLeaderboard")
        .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
        .first();

      if (existingEntry) {
        await ctx.db.patch(existingEntry._id, {
          portfolioValue,
          holdingsCount: holdings.length,
          agentName: agent.name,
          avatarEmoji: agent.avatarEmoji,
          balance: agent.balance,
          isBuiltIn: agent.isBuiltIn,
          lastUpdated: now,
        });
      } else {
        await ctx.db.insert("agentLeaderboard", {
          agentId: agent._id,
          portfolioValue,
          holdingsCount: holdings.length,
          agentName: agent.name,
          avatarEmoji: agent.avatarEmoji,
          balance: agent.balance,
          isBuiltIn: agent.isBuiltIn,
          lastUpdated: now,
        });
      }
    }

    return { updated: agents.length };
  },
});
