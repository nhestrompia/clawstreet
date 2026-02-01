import { internalMutation } from "./_generated/server";

// Migration: Add creatorType to existing profiles
// Run this once to update all existing profiles to have creatorType="user"
export const addCreatorTypeToProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    let updated = 0;
    let alreadyHave = 0;

    for (const profile of profiles) {
      if (!profile.creatorType) {
        // Update profile to have creatorType="user" (default for existing profiles)
        await ctx.db.patch(profile._id, {
          creatorType: "user" as const,
        });
        updated++;
        console.log(`Updated profile ${profile._id} with creatorType="user"`);
      } else {
        alreadyHave++;
      }
    }

    return {
      total: profiles.length,
      updated,
      alreadyHave,
      message: `Migration complete: ${updated} profiles updated, ${alreadyHave} already had creatorType`,
    };
  },
});

// Migration: Add names to existing profiles
// Run this once to add default names to profiles that don't have them
export const addNamesToProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    let updated = 0;
    let alreadyHave = 0;

    for (const profile of profiles) {
      if (!profile.name) {
        // Generate a default name based on the first tweet or just use a generic name
        const defaultName =
          profile.tweets[0]?.slice(0, 50) || `IPO #${profile._id.slice(-6)}`;

        await ctx.db.patch(profile._id, {
          name: defaultName,
        });
        updated++;
        console.log(
          `Updated profile ${profile._id} with name="${defaultName}"`,
        );
      } else {
        alreadyHave++;
      }
    }

    return {
      total: profiles.length,
      updated,
      alreadyHave,
      message: `Migration complete: ${updated} profiles updated with names, ${alreadyHave} already had names`,
    };
  },
});

// Migration: Add totalShares to existing profiles
export const addTotalSharesToProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    let count = 0;
    for (const profile of profiles) {
      if (profile.totalShares === undefined) {
        await ctx.db.patch(profile._id, {
          totalShares: 100000, // Default 100k shares for all existing IPOs
        });
        count++;
      }
    }

    return {
      updated: count,
      message: `Added totalShares to ${count} profiles`,
    };
  },
});

// Migration: Enable all existing built-in agents
export const enableAllBuiltInAgents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();

    let count = 0;
    for (const agent of agents) {
      if (agent.isBuiltIn && agent.enabled === undefined) {
        await ctx.db.patch(agent._id, {
          enabled: true, // Enable all built-in agents by default
        });
        count++;
      }
    }

    return { updated: count, message: `Enabled ${count} built-in agents` };
  },
});

// Migration: Add nameLower to existing profiles for search optimization
export const addNameLowerToProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    let updated = 0;
    let alreadyHave = 0;

    for (const profile of profiles) {
      if (profile.name && !profile.nameLower) {
        await ctx.db.patch(profile._id, {
          nameLower: profile.name.toLowerCase(),
        });
        updated++;
        console.log(
          `Updated profile ${profile._id} with nameLower="${profile.name.toLowerCase()}"`,
        );
      } else if (profile.nameLower) {
        alreadyHave++;
      }
    }

    return {
      total: profiles.length,
      updated,
      alreadyHave,
      message: `Migration complete: ${updated} profiles updated with nameLower, ${alreadyHave} already had nameLower`,
    };
  },
});

// Migration: Initialize platform stats document
export const initializePlatformStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if stats already exist
    const existingStats = await ctx.db.query("platformStats").first();
    if (existingStats) {
      return { message: "Platform stats already initialized", stats: existingStats };
    }

    // Count current totals
    const trades = await ctx.db.query("trades").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const agents = await ctx.db.query("agents").collect();

    const hourAgo = Date.now() - 60 * 60 * 1000;
    const tradesLastHour = trades.filter((t) => t.createdAt > hourAgo).length;

    const statsId = await ctx.db.insert("platformStats", {
      totalTrades: trades.length,
      totalProfiles: profiles.length,
      totalAgents: agents.length,
      tradesLastHour,
      lastUpdated: Date.now(),
    });

    return {
      message: "Platform stats initialized",
      statsId,
      totalTrades: trades.length,
      totalProfiles: profiles.length,
      totalAgents: agents.length,
      tradesLastHour,
    };
  },
});

// Migration: Initialize agent leaderboard entries
export const initializeAgentLeaderboard = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const agents = await ctx.db.query("agents").collect();

    let created = 0;
    let skipped = 0;

    for (const agent of agents) {
      // Check if entry already exists
      const existing = await ctx.db
        .query("agentLeaderboard")
        .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Calculate portfolio value
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

      // Create leaderboard entry
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
      created++;
    }

    return {
      message: `Leaderboard initialized: ${created} entries created, ${skipped} already existed`,
      created,
      skipped,
    };
  },
});
