import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { sanitizeContent, validateBio, validateTweet } from "./contentFilter";

// Calculate confidence level based on tweet content
function calculateConfidenceLevel(
  tweets: string[],
  bio?: string,
): "low" | "medium" | "high" {
  // For tweet IDs (numeric strings), we can't analyze content, so use heuristics
  // For actual text content, analyze the text
  const allText = [...tweets, bio || ""].join(" ").toLowerCase();

  // Check if tweets are IDs (all numeric) vs actual content
  const areTweetIds = tweets.every((t) => /^\d+$/.test(t));

  // High confidence indicators
  const highConfidencePatterns = [
    /shipped/,
    /launched/,
    /built/,
    /released/,
    /published/,
    /open source/,
    /github\.com/,
    /milestone/,
    /revenue/,
    /\$\d+k/,
    /users/,
    /customers/,
    /completed/,
    /achieved/,
  ];

  // Low confidence indicators
  const lowConfidencePatterns = [
    /maybe/,
    /might/,
    /thinking about/,
    /considering/,
    /idk/,
    /not sure/,
    /hopefully/,
    /planning/,
  ];

  let score = 50; // Start at medium

  // If tweets are IDs (not text), use different heuristics
  if (areTweetIds) {
    // Use tweet count and bio quality as primary indicators
    if (tweets.length >= 5) score += 20;
    else if (tweets.length >= 3) score += 10;
    else if (tweets.length === 1) score -= 20;

    if (bio) {
      if (bio.length > 100) score += 15;
      else if (bio.length > 50) score += 5;
    } else {
      score -= 10; // No bio is a negative signal
    }
  } else {
    // Analyze actual text content
    for (const pattern of highConfidencePatterns) {
      if (pattern.test(allText)) score += 10;
    }

    for (const pattern of lowConfidencePatterns) {
      if (pattern.test(allText)) score -= 10;
    }

    // Factor in tweet count
    if (tweets.length >= 5) score += 10;
    if (tweets.length <= 1) score -= 15;

    // Factor in bio presence and quality
    if (bio && bio.length > 50) score += 10;
  }

  if (score >= 70) return "high";
  if (score <= 40) return "low";
  return "medium";
}

// Create a new profile (IPO)
export const createProfile = mutation({
  args: {
    name: v.string(),
    bio: v.optional(v.string()),
    tweets: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate and sanitize name
    const name = sanitizeContent(args.name.trim());
    if (!name || name.length < 2) {
      throw new Error("Name must be at least 2 characters");
    }
    if (name.length > 100) {
      throw new Error("Name must be less than 100 characters");
    }

    // Filter out empty tweets, validate, and sanitize
    const processedTweets: string[] = [];

    for (const rawTweet of args.tweets.slice(0, 10)) {
      const trimmed = rawTweet.trim();
      if (trimmed.length === 0) continue;

      const validation = validateTweet(trimmed);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      processedTweets.push(sanitizeContent(trimmed.slice(0, 280)));
    }

    if (processedTweets.length === 0) {
      throw new Error("At least one tweet is required");
    }

    // Validate and sanitize bio
    let bio: string | undefined;
    if (args.bio?.trim()) {
      const trimmedBio = args.bio.trim();
      const bioValidation = validateBio(trimmedBio);
      if (!bioValidation.valid) {
        throw new Error(bioValidation.error);
      }
      bio = sanitizeContent(trimmedBio.slice(0, 500));
    }

    const tweets = processedTweets;

    const confidenceLevel = calculateConfidenceLevel(tweets, bio);
    const now = Date.now();

    const profileId = await ctx.db.insert("profiles", {
      name,
      bio,
      tweets,
      creatorType: "user",
      confidenceLevel,
      currentPrice: 10.0, // Starting price
      totalShares: 100000, // Fixed supply of 100,000 shares
      totalTrades: 0,
      createdAt: now,
    });

    // Record initial price history
    await ctx.db.insert("priceHistory", {
      profileId,
      price: 10.0,
      timestamp: now,
    });

    return { profileId, confidenceLevel };
  },
});

// Get a single profile by ID
export const getProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.profileId);
  },
});
// Search profiles by name
export const searchProfiles = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const searchLower = args.searchTerm.toLowerCase();

    // Get all profiles and filter by name
    const allProfiles = await ctx.db.query("profiles").collect();

    const matchingProfiles = allProfiles
      .filter((profile) => profile.name?.toLowerCase().includes(searchLower))
      .sort((a, b) => {
        // Prioritize exact matches and closer matches
        const aName = a.name?.toLowerCase() || "";
        const bName = b.name?.toLowerCase() || "";
        const aExact = aName === searchLower ? -1 : 0;
        const bExact = bName === searchLower ? -1 : 0;
        if (aExact !== bExact) return aExact - bExact;

        // Then by position of match
        const aIndex = aName.indexOf(searchLower);
        const bIndex = bName.indexOf(searchLower);
        if (aIndex !== bIndex) return aIndex - bIndex;

        // Finally by price (higher first)
        return b.currentPrice - a.currentPrice;
      })
      .slice(0, limit);

    return matchingProfiles;
  },
});
// Get all profiles sorted by price (descending)
export const getAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("profiles").order("desc").collect();
  },
});

// Get profiles sorted by creation date (newest first)
export const getRecentProfiles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("profiles")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});

// Get top profiles by price
export const getTopProfiles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("profiles")
      .withIndex("by_price")
      .order("desc")
      .take(limit);
  },
});

// Get price history for a profile
export const getPriceHistory = query({
  args: {
    profileId: v.id("profiles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("priceHistory")
      .withIndex("by_profile_time", (q) => q.eq("profileId", args.profileId))
      .order("desc")
      .take(limit);
  },
});

// Get active profiles for trading (profiles created in last 7 days or with recent trades)
export const getActiveProfiles = query({
  args: {},
  handler: async (ctx) => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const profiles = await ctx.db.query("profiles").collect();

    // Return profiles created in last week or all if few exist
    const activeProfiles = profiles.filter((p) => p.createdAt > weekAgo);

    // If no recent profiles, return all profiles
    return activeProfiles.length > 0 ? activeProfiles : profiles;
  },
});

// Get available IPOs for agents to trade (excludes agent's own IPO)
export const getAvailableIPOs = query({
  args: {
    excludeAgentId: v.optional(v.id("agents")),
    creatorType: v.optional(
      v.union(v.literal("user"), v.literal("agent"), v.literal("all")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    let profiles = await ctx.db
      .query("profiles")
      .withIndex("by_created")
      .order("desc")
      .take(limit * 2); // Get extra to filter

    // Filter by creator type if specified
    if (args.creatorType && args.creatorType !== "all") {
      profiles = profiles.filter(
        (p) => (p.creatorType || "user") === args.creatorType,
      );
    }

    // Exclude agent's own IPO if specified
    if (args.excludeAgentId) {
      profiles = profiles.filter(
        (p) => p.creatorAgentId !== args.excludeAgentId,
      );
    }

    return profiles.slice(0, limit);
  },
});

// Get profiles by creator type
export const getProfilesByCreatorType = query({
  args: {
    creatorType: v.union(v.literal("user"), v.literal("agent")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_creator_type", (q) =>
        q.eq("creatorType", args.creatorType),
      )
      .order("desc")
      .take(limit);
    return profiles;
  },
});

// Get an agent's own IPO profile
export const getAgentOwnIPO = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_creator_agent", (q) =>
        q.eq("creatorAgentId", args.agentId),
      )
      .first();
  },
});

// Internal mutation for agents to create their own IPO
export const createAgentIPO = internalMutation({
  args: {
    agentId: v.id("agents"),
    name: v.string(),
    bio: v.string(),
    selfDescriptions: v.array(v.string()), // Agent's thoughts/descriptions about themselves
  },
  handler: async (ctx, args) => {
    // Check if agent already has an IPO
    const existingIPO = await ctx.db
      .query("profiles")
      .withIndex("by_creator_agent", (q) =>
        q.eq("creatorAgentId", args.agentId),
      )
      .first();

    if (existingIPO) {
      throw new Error("Agent already has an IPO");
    }

    // Get the agent
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Validate and sanitize content
    const name = sanitizeContent(args.name.trim().slice(0, 100));
    if (!name) {
      throw new Error("Name is required");
    }

    const bio = sanitizeContent(args.bio.trim().slice(0, 500));

    // Process self-descriptions (like tweets but about the agent)
    const processedDescriptions: string[] = [];
    for (const desc of args.selfDescriptions.slice(0, 10)) {
      const trimmed = desc.trim();
      if (trimmed.length === 0) continue;
      processedDescriptions.push(sanitizeContent(trimmed.slice(0, 280)));
    }

    if (processedDescriptions.length === 0) {
      throw new Error("At least one self-description is required");
    }

    const confidenceLevel = calculateConfidenceLevel(
      processedDescriptions,
      bio,
    );
    const now = Date.now();

    const profileId = await ctx.db.insert("profiles", {
      name,
      bio,
      tweets: processedDescriptions, // Self-descriptions stored as "tweets"
      creatorType: "agent",
      creatorAgentId: args.agentId,
      confidenceLevel,
      currentPrice: 10.0,
      totalShares: 100000, // Fixed supply of 100,000 shares
      totalTrades: 0,
      createdAt: now,
    });

    // Record initial price history
    await ctx.db.insert("priceHistory", {
      profileId,
      price: 10.0,
      timestamp: now,
    });

    return { profileId, confidenceLevel };
  },
});
