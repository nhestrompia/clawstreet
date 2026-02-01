import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import { calculateNewPrice } from "./priceEngine";

// Get recent trades (for live feed)
export const getRecentTrades = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_created")
      .order("desc")
      .take(limit);

    // Enrich with agent and profile data
    const enrichedTrades = await Promise.all(
      trades.map(async (trade) => {
        const agent = await ctx.db.get(trade.agentId);
        const profile = await ctx.db.get(trade.profileId);
        return {
          ...trade,
          agentName: agent?.name ?? "Unknown Agent",
          agentEmoji: agent?.avatarEmoji ?? "🤖",
          profilePrice: profile?.currentPrice ?? trade.priceAtTrade,
        };
      }),
    );

    return enrichedTrades;
  },
});

// Get trades for a specific profile
export const getTradesByProfile = query({
  args: {
    profileId: v.id("profiles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .order("desc")
      .take(limit);

    // Enrich with agent data
    const enrichedTrades = await Promise.all(
      trades.map(async (trade) => {
        const agent = await ctx.db.get(trade.agentId);
        return {
          ...trade,
          agentName: agent?.name ?? "Unknown Agent",
          agentEmoji: agent?.avatarEmoji ?? "🤖",
        };
      }),
    );

    return enrichedTrades;
  },
});

// Get trades by a specific agent
export const getTradesByAgent = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);

    // Enrich with profile data
    const enrichedTrades = await Promise.all(
      trades.map(async (trade) => {
        const profile = await ctx.db.get(trade.profileId);
        return {
          ...trade,
          profilePrice: profile?.currentPrice ?? trade.priceAtTrade,
        };
      }),
    );

    return enrichedTrades;
  },
});

// Internal mutation to record a trade (called by agent system)
export const recordTrade = internalMutation({
  args: {
    agentId: v.id("agents"),
    profileId: v.id("profiles"),
    action: v.union(v.literal("BUY"), v.literal("SELL"), v.literal("HOLD")),
    size: v.number(),
    reason: v.string(),
    roastLine: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    const agent = await ctx.db.get(args.agentId);

    if (!profile || !agent) {
      throw new Error("Profile or agent not found");
    }

    const now = Date.now();
    const currentPrice = profile.currentPrice;
    const totalShares = profile.totalShares || 100000;
    let updatedBalance = agent.balance;

    // Calculate shares to trade based on size (0.1 to 1.0) and agent's balance
    const maxAffordableShares = Math.floor(agent.balance / currentPrice);
    const sharesToTrade = Math.floor(maxAffordableShares * args.size);

    let newPrice = currentPrice;
    let priceChange = 0;

    // Calculate price change based on action
    if (args.action === "BUY" && sharesToTrade > 0) {
      newPrice = calculateNewPrice(currentPrice, args.size, 0);
      priceChange = newPrice - currentPrice;
    } else if (args.action === "SELL") {
      newPrice = calculateNewPrice(currentPrice, 0, args.size);
      priceChange = newPrice - currentPrice;
    }
    // HOLD doesn't change price

    // Record the trade
    const tradeId = await ctx.db.insert("trades", {
      agentId: args.agentId,
      profileId: args.profileId,
      action: args.action,
      size: args.size,
      shares: sharesToTrade,
      reason: args.reason,
      roastLine: args.roastLine,
      priceAtTrade: currentPrice,
      priceChange,
      createdAt: now,
    });

    // Update profile price and trade count
    await ctx.db.patch(args.profileId, {
      currentPrice: newPrice,
      totalTrades: profile.totalTrades + 1,
    });

    // Record price history
    await ctx.db.insert("priceHistory", {
      profileId: args.profileId,
      price: newPrice,
      timestamp: now,
    });

    // Update agent holdings
    if (args.action === "BUY" && sharesToTrade > 0) {
      const existingHolding = await ctx.db
        .query("agentHoldings")
        .withIndex("by_agent_profile", (q) =>
          q.eq("agentId", args.agentId).eq("profileId", args.profileId),
        )
        .first();

      if (existingHolding) {
        await ctx.db.patch(existingHolding._id, {
          shares: existingHolding.shares + sharesToTrade,
        });
      } else {
        await ctx.db.insert("agentHoldings", {
          agentId: args.agentId,
          profileId: args.profileId,
          shares: sharesToTrade,
        });
      }

      // Deduct from agent balance
      updatedBalance = agent.balance - sharesToTrade * currentPrice;
      await ctx.db.patch(args.agentId, {
        balance: updatedBalance,
        lastActiveAt: now,
      });
    } else if (args.action === "SELL") {
      const existingHolding = await ctx.db
        .query("agentHoldings")
        .withIndex("by_agent_profile", (q) =>
          q.eq("agentId", args.agentId).eq("profileId", args.profileId),
        )
        .first();

      if (existingHolding && existingHolding.shares > 0) {
        const sharesToSell = Math.min(
          Math.floor(existingHolding.shares * args.size),
          existingHolding.shares,
        );
        const newShares = existingHolding.shares - sharesToSell;

        if (newShares <= 0) {
          await ctx.db.delete(existingHolding._id);
        } else {
          await ctx.db.patch(existingHolding._id, {
            shares: newShares,
          });
        }

        // Add to agent balance
        updatedBalance = agent.balance + sharesToSell * currentPrice;
        await ctx.db.patch(args.agentId, {
          balance: updatedBalance,
          lastActiveAt: now,
        });
      }
    }

    // Update leaderboard values for all holders of this profile based on price change
    const priceDelta = newPrice - currentPrice;
    if (priceDelta !== 0) {
      const profileHoldings = await ctx.db
        .query("agentHoldings")
        .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
        .collect();

      for (const holding of profileHoldings) {
        const entry = await ctx.db
          .query("agentLeaderboard")
          .withIndex("by_agent", (q) => q.eq("agentId", holding.agentId))
          .first();

        if (entry) {
          await ctx.db.patch(entry._id, {
            portfolioValue: entry.portfolioValue + holding.shares * priceDelta,
            lastUpdated: now,
          });
          continue;
        }

        const holderAgent = await ctx.db.get(holding.agentId);
        if (!holderAgent) {
          continue;
        }

        const holderHoldings = await ctx.db
          .query("agentHoldings")
          .withIndex("by_agent", (q) => q.eq("agentId", holding.agentId))
          .collect();

        let portfolioValue = holderAgent.balance;
        for (const holderHolding of holderHoldings) {
          const holdingProfile =
            holderHolding.profileId === args.profileId
              ? { currentPrice: newPrice }
              : await ctx.db.get(holderHolding.profileId);
          if (holdingProfile) {
            portfolioValue += holderHolding.shares * holdingProfile.currentPrice;
          }
        }

        await ctx.db.insert("agentLeaderboard", {
          agentId: holderAgent._id,
          portfolioValue,
          holdingsCount: holderHoldings.length,
          agentName: holderAgent.name,
          avatarEmoji: holderAgent.avatarEmoji,
          balance: holderAgent.balance,
          isBuiltIn: holderAgent.isBuiltIn,
          lastUpdated: now,
        });
      }
    }

    // Recompute trading agent leaderboard entry to keep balance/holdings exact
    const agentHoldings = await ctx.db
      .query("agentHoldings")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    let portfolioValue = updatedBalance;
    for (const holding of agentHoldings) {
      const holdingProfile =
        holding.profileId === args.profileId
          ? { currentPrice: newPrice }
          : await ctx.db.get(holding.profileId);
      if (holdingProfile) {
        portfolioValue += holding.shares * holdingProfile.currentPrice;
      }
    }

    const agentEntry = await ctx.db
      .query("agentLeaderboard")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();

    if (agentEntry) {
      await ctx.db.patch(agentEntry._id, {
        portfolioValue,
        holdingsCount: agentHoldings.length,
        agentName: agent.name,
        avatarEmoji: agent.avatarEmoji,
        balance: updatedBalance,
        isBuiltIn: agent.isBuiltIn,
        lastUpdated: now,
      });
    } else {
      await ctx.db.insert("agentLeaderboard", {
        agentId: agent._id,
        portfolioValue,
        holdingsCount: agentHoldings.length,
        agentName: agent.name,
        avatarEmoji: agent.avatarEmoji,
        balance: updatedBalance,
        isBuiltIn: agent.isBuiltIn,
        lastUpdated: now,
      });
    }

    // Schedule stats increment
    await ctx.scheduler.runAfter(0, internal.stats.incrementTradeCount, {});

    return { tradeId, newPrice, priceChange };
  },
});

// Get trade statistics
export const getTradeStats = query({
  args: {},
  handler: async (ctx) => {
    const trades = await ctx.db.query("trades").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const agents = await ctx.db.query("agents").collect();

    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recentTrades = trades.filter((t) => t.createdAt > hourAgo);

    return {
      totalTrades: trades.length,
      totalProfiles: profiles.length,
      totalAgents: agents.length,
      tradesLastHour: recentTrades.length,
    };
  },
});
