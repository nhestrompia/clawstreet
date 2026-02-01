import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

// Get all holdings for an agent (their portfolio)
export const getAgentHoldings = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const holdings = await ctx.db
      .query("agentHoldings")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    // Enrich with profile data
    const enrichedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        const profile = await ctx.db.get(holding.profileId);
        return {
          ...holding,
          profileName: profile?.name ?? "Unknown",
          currentPrice: profile?.currentPrice ?? 0,
          totalValue: (profile?.currentPrice ?? 0) * holding.shares,
        };
      }),
    );

    return enrichedHoldings.filter((h) => h.shares > 0); // Only return non-zero holdings
  },
});

// Get holdings for a specific profile (who owns it)
export const getProfileHolders = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const holdings = await ctx.db
      .query("agentHoldings")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();

    // Enrich with agent data
    const enrichedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        const agent = await ctx.db.get(holding.agentId);
        return {
          ...holding,
          agentName: agent?.name ?? "Unknown",
          agentEmoji: agent?.avatarEmoji ?? "🤖",
        };
      }),
    );

    return enrichedHoldings.filter((h) => h.shares > 0);
  },
});

// Get a specific holding for an agent and profile (internal use)
export const getHoldingForAgentProfile = internalQuery({
  args: { agentId: v.id("agents"), profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentHoldings")
      .withIndex("by_agent_profile", (q) =>
        q.eq("agentId", args.agentId).eq("profileId", args.profileId),
      )
      .first();
  },
});

// Update or create holding after a trade
export const updateHolding = internalMutation({
  args: {
    agentId: v.id("agents"),
    profileId: v.id("profiles"),
    sharesDelta: v.number(), // positive for buy, negative for sell
  },
  handler: async (ctx, args) => {
    // Find existing holding
    const existing = await ctx.db
      .query("agentHoldings")
      .withIndex("by_agent_profile", (q) =>
        q.eq("agentId", args.agentId).eq("profileId", args.profileId),
      )
      .first();

    if (existing) {
      const newShares = existing.shares + args.sharesDelta;
      await ctx.db.patch(existing._id, {
        shares: Math.max(0, newShares), // Never go negative
      });
    } else if (args.sharesDelta > 0) {
      // Create new holding only if buying
      await ctx.db.insert("agentHoldings", {
        agentId: args.agentId,
        profileId: args.profileId,
        shares: args.sharesDelta,
      });
    }
  },
});
