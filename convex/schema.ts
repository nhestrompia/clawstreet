import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Profiles - IPOs submitted by users or agents
  profiles: defineTable({
    // Profile content
    name: v.optional(v.string()), // Bond name - will be required after migration
    bio: v.optional(v.string()),
    tweets: v.array(v.string()), // For users: actual tweets. For agents: self-descriptions/thoughts

    // Creator info (optional for backward compatibility with existing data)
    creatorType: v.optional(v.union(v.literal("user"), v.literal("agent"))),
    creatorAgentId: v.optional(v.id("agents")), // If created by agent

    // Market data
    confidenceLevel: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
    ),
    currentPrice: v.number(), // starts at 10.00
    totalShares: v.optional(v.number()), // fixed supply (e.g., 100,000) - optional during migration
    totalTrades: v.number(),
    createdAt: v.number(),
  })
    .index("by_price", ["currentPrice"])
    .index("by_created", ["createdAt"])
    .index("by_creator_type", ["creatorType"])
    .index("by_creator_agent", ["creatorAgentId"]),

  // Agents - built-in + external OpenClaw agents
  agents: defineTable({
    name: v.string(),
    persona: v.string(),
    balance: v.number(),
    avatarEmoji: v.string(),
    isBuiltIn: v.boolean(), // true for default 5 agents
    enabled: v.optional(v.boolean()), // feature flag to disable built-in agents
    apiKey: v.optional(v.string()), // for external agents
    webhookUrl: v.optional(v.string()), // optional webhook for notifications
    lastActiveAt: v.number(),
  }).index("by_api_key", ["apiKey"]),

  // Agent Holdings - what each agent owns
  agentHoldings: defineTable({
    agentId: v.id("agents"),
    profileId: v.id("profiles"),
    shares: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_profile", ["profileId"])
    .index("by_agent_profile", ["agentId", "profileId"]),

  // Trades - every buy/sell action
  trades: defineTable({
    agentId: v.id("agents"),
    profileId: v.id("profiles"),
    action: v.union(v.literal("BUY"), v.literal("SELL"), v.literal("HOLD")),
    size: v.number(), // 0.1 to 1.0
    shares: v.optional(v.number()), // number of shares traded
    reason: v.string(),
    roastLine: v.string(),
    priceAtTrade: v.number(),
    priceChange: v.number(),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"])
    .index("by_created", ["createdAt"])
    .index("by_agent", ["agentId"]),

  // Price History - for charts
  priceHistory: defineTable({
    profileId: v.id("profiles"),
    price: v.number(),
    timestamp: v.number(),
  })
    .index("by_profile", ["profileId"])
    .index("by_profile_time", ["profileId", "timestamp"]),

  // Leaderboard snapshots
  leaderboard: defineTable({
    profileId: v.id("profiles"),
    rank: v.number(),
    price: v.number(),
    priceChange24h: v.number(),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),
});
