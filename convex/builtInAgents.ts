"use node";

import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

// Run a single trading round for all built-in agents
export const runTradingRound = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all built-in agents
    const agents = await ctx.runQuery(internal.agents.getBuiltInAgents);
    if (agents.length === 0) {
      console.log("No built-in agents found. Run seed first.");
      return { trades: 0 };
    }

    // Get active profiles to trade
    const profiles = await ctx.runQuery(api.profiles.getActiveProfiles, {});
    if (profiles.length === 0) {
      console.log("No profiles available for trading.");
      return { trades: 0 };
    }

    // Get recent trades for context
    const recentTrades = await ctx.runQuery(api.trades.getRecentTrades, {
      limit: 20,
    });

    let tradesExecuted = 0;

    // Each agent evaluates 1-3 random profiles
    for (const agent of agents) {
      // Select random profiles (1-3 depending on agent type)
      const numProfiles = Math.min(
        profiles.length,
        agent.name === "Chaos Trader" ? 3 : agent.name === "Trend Chaser" ? 2 : 1
      );

      const selectedProfiles = shuffleArray([...profiles]).slice(0, numProfiles);

      for (const profile of selectedProfiles) {
        try {
          // Generate trade decision using LLM
          const decision = await ctx.runAction(api.llm.generateTradeDecision, {
            agentName: agent.name,
            agentPersona: agent.persona,
            profile: {
              id: profile._id,
              bio: profile.bio,
              tweets: profile.tweets,
              currentPrice: profile.currentPrice,
              confidenceLevel: profile.confidenceLevel,
            },
            recentTrades: recentTrades.slice(0, 5).map((t) => ({
              action: t.action,
              agentName: t.agentName,
              priceChange: t.priceChange,
            })),
          });

          // Skip HOLD actions (no trade needed)
          if (decision.action === "HOLD") {
            continue;
          }

          // Check if agent can afford the trade
          if (decision.action === "BUY") {
            const cost = decision.size * profile.currentPrice;
            if (agent.balance < cost) {
              console.log(`${agent.name} can't afford to buy. Balance: ${agent.balance}, Cost: ${cost}`);
              continue;
            }
          }

          // Check if agent has shares to sell
          if (decision.action === "SELL") {
            const holdings = await ctx.runQuery(api.agents.getAgentHoldings, {
              agentId: agent._id,
            });
            const profileHolding = holdings.find(
              (h) => h.profileId === profile._id
            );
            if (!profileHolding || profileHolding.shares < decision.size) {
              // Adjust size to available shares or skip
              if (profileHolding && profileHolding.shares > 0) {
                decision.size = profileHolding.shares;
              } else {
                continue;
              }
            }
          }

          // Record the trade
          await ctx.runMutation(internal.trades.recordTrade, {
            agentId: agent._id,
            profileId: profile._id,
            action: decision.action,
            size: decision.size,
            reason: decision.reason,
            roastLine: decision.roastLine,
          });

          tradesExecuted++;
          console.log(
            `${agent.name} ${decision.action} ${profile._id} @ $${profile.currentPrice.toFixed(2)}`
          );
        } catch (error) {
          console.error(`Error processing trade for ${agent.name}:`, error);
        }
      }
    }

    return { trades: tradesExecuted };
  },
});

// Utility function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
