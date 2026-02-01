import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Get all agents (sanitized - no API keys exposed)
export const getAllAgents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const agents = await ctx.db.query("agents").take(limit);
    // Remove sensitive fields before returning
    return agents.map((agent) => ({
      _id: agent._id,
      _creationTime: agent._creationTime,
      name: agent.name,
      persona: agent.persona,
      balance: agent.balance,
      avatarEmoji: agent.avatarEmoji,
      isBuiltIn: agent.isBuiltIn,
      lastActiveAt: agent.lastActiveAt,
      // apiKey and webhookUrl intentionally omitted for security
    }));
  },
});

// Search agents by name - lightweight query for BondSearch
export const searchAgents = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const searchLower = args.searchTerm.toLowerCase();

    // Get limited agents and filter in memory
    const agents = await ctx.db.query("agents").take(100);

    const matchingAgents = agents
      .filter((agent) => agent.name.toLowerCase().includes(searchLower))
      .slice(0, limit);

    // Return only essential fields for search
    return matchingAgents.map((agent) => ({
      _id: agent._id,
      name: agent.name,
      balance: agent.balance,
      avatarEmoji: agent.avatarEmoji,
      isBuiltIn: agent.isBuiltIn,
    }));
  },
});

// Get built-in agents only (filtered by env variable)
export const getBuiltInAgents = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Check if built-in agents are disabled via environment variable
    const disableBuiltInAgents = process.env.DISABLE_BUILTIN_AGENTS === "true";
    if (disableBuiltInAgents) {
      return [];
    }

    const agents = await ctx.db.query("agents").collect();
    return agents.filter((a) => a.isBuiltIn);
  },
});

// Get a single agent by ID (sanitized - no API keys exposed)
export const getAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return null;

    // Remove sensitive fields before returning
    return {
      _id: agent._id,
      _creationTime: agent._creationTime,
      name: agent.name,
      persona: agent.persona,
      balance: agent.balance,
      avatarEmoji: agent.avatarEmoji,
      isBuiltIn: agent.isBuiltIn,
      lastActiveAt: agent.lastActiveAt,
      // apiKey and webhookUrl intentionally omitted for security
    };
  },
});

// Get agent by API key (for external agents)
export const getAgentByApiKey = internalQuery({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_api_key", (q) => q.eq("apiKey", args.apiKey))
      .first();
  },
});

// Register an external agent
export const registerExternalAgent = mutation({
  args: {
    name: v.string(),
    persona: v.string(),
    avatarEmoji: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate a simple API key
    const apiKey = `asm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const agentId = await ctx.db.insert("agents", {
      name: args.name.slice(0, 50), // Limit name length
      persona: args.persona.slice(0, 500), // Limit persona length
      avatarEmoji: args.avatarEmoji ?? "🤖",
      balance: 10000, // Starting balance
      isBuiltIn: false,
      apiKey,
      webhookUrl: args.webhookUrl,
      lastActiveAt: Date.now(),
    });

    // Initialize leaderboard entry for the new agent
    await ctx.db.insert("agentLeaderboard", {
      agentId,
      portfolioValue: 10000,
      holdingsCount: 0,
      agentName: args.name.slice(0, 50),
      avatarEmoji: args.avatarEmoji ?? "🤖",
      balance: 10000,
      isBuiltIn: false,
      lastUpdated: Date.now(),
    });

    // Schedule stats increment
    await ctx.scheduler.runAfter(0, internal.stats.incrementAgentCount, {});

    return { agentId, apiKey };
  },
});

// Get agent holdings
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
          profilePrice: profile?.currentPrice ?? 0,
          value: holding.shares * (profile?.currentPrice ?? 0),
        };
      }),
    );

    return enrichedHoldings;
  },
});

// Get agent leaderboard (by portfolio value)
export const getAgentLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const agents = await ctx.db.query("agents").collect();

    // Calculate portfolio value for each agent
    const agentValues = await Promise.all(
      agents.map(async (agent) => {
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

        return {
          ...agent,
          portfolioValue,
          holdingsCount: holdings.length,
        };
      }),
    );

    // Sort by portfolio value and take top
    return agentValues
      .sort((a, b) => b.portfolioValue - a.portfolioValue)
      .slice(0, limit);
  },
});

// Update agent last active timestamp
export const updateAgentActivity = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      lastActiveAt: Date.now(),
    });
  },
});

// Get detailed agent stats including PnL
export const getAgentStats = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return null;

    // Get all holdings
    const holdings = await ctx.db
      .query("agentHoldings")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    // Calculate current portfolio value
    let currentPortfolioValue = 0;
    const enrichedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        const profile = await ctx.db.get(holding.profileId);
        const currentValue = holding.shares * (profile?.currentPrice ?? 0);
        currentPortfolioValue += currentValue;

        return {
          ...holding,
          profileName: profile?.name ?? "Unknown",
          profilePrice: profile?.currentPrice ?? 0,
          currentValue,
        };
      }),
    );

    // Get all trades to calculate PnL
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    // Calculate total invested, total returns, and PnL
    let totalInvested = 0;
    let totalReturns = 0;
    let buyCount = 0;
    let sellCount = 0;

    for (const trade of trades) {
      if (trade.action === "BUY") {
        totalInvested += (trade.shares ?? 0) * trade.priceAtTrade;
        buyCount++;
      } else if (trade.action === "SELL") {
        totalReturns += (trade.shares ?? 0) * trade.priceAtTrade;
        sellCount++;
      }
    }

    const realizedPnL = totalReturns - totalInvested;
    const totalValue = agent.balance + currentPortfolioValue;
    const startingBalance = 10000; // Default starting balance
    const totalPnL = totalValue - startingBalance;
    const pnlPercent = (totalPnL / startingBalance) * 100;

    return {
      agent: {
        _id: agent._id,
        name: agent.name,
        persona: agent.persona,
        avatarEmoji: agent.avatarEmoji,
        balance: agent.balance,
        isBuiltIn: agent.isBuiltIn,
        enabled: agent.enabled !== false,
        lastActiveAt: agent.lastActiveAt,
      },
      holdings: enrichedHoldings,
      stats: {
        portfolioValue: currentPortfolioValue,
        totalValue,
        totalInvested,
        totalReturns,
        realizedPnL,
        totalPnL,
        pnlPercent,
        buyCount,
        sellCount,
        totalTrades: trades.length,
        holdingsCount: holdings.length,
        startingBalance,
      },
    };
  },
});

// Toggle agent enabled state
export const toggleAgentEnabled = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Only allow toggling built-in agents
    if (!agent.isBuiltIn) {
      throw new Error("Can only toggle built-in agents");
    }

    await ctx.db.patch(args.agentId, {
      enabled: !(agent.enabled ?? true),
    });

    return { enabled: !(agent.enabled ?? true) };
  },
});
