import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Price calculation constants
const VOLATILITY = 0.5;
const MIN_PRICE = 1;
const MAX_PRICE = 100;

// Calculate new price based on buy/sell pressure
export function calculateNewPrice(
  currentPrice: number,
  buySize: number,
  sellSize: number
): number {
  const netPressure = buySize - sellSize;
  const priceChange = netPressure * VOLATILITY;
  const newPrice = currentPrice + priceChange;
  return Math.max(MIN_PRICE, Math.min(MAX_PRICE, newPrice));
}

// Calculate price change percentage
export function calculatePriceChangePercent(
  oldPrice: number,
  newPrice: number
): number {
  if (oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

// Internal mutation to update profile price
export const updateProfilePrice = internalMutation({
  args: {
    profileId: v.id("profiles"),
    newPrice: v.number(),
    priceChange: v.number(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return;

    // Update profile with new price
    await ctx.db.patch(args.profileId, {
      currentPrice: args.newPrice,
      totalTrades: profile.totalTrades + 1,
    });

    // Record price history
    await ctx.db.insert("priceHistory", {
      profileId: args.profileId,
      price: args.newPrice,
      timestamp: Date.now(),
    });
  },
});

// Get 24h price change for a profile
export const get24hPriceChange = internalQuery({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const history = await ctx.db
      .query("priceHistory")
      .withIndex("by_profile_time", (q) => q.eq("profileId", args.profileId))
      .order("asc")
      .collect();

    // Find price 24h ago
    const oldEntry = history.find((h) => h.timestamp >= dayAgo);
    const currentEntry = history[history.length - 1];

    if (!oldEntry || !currentEntry) return 0;

    return calculatePriceChangePercent(oldEntry.price, currentEntry.price);
  },
});
