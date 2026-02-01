import { httpRouter } from "convex/server";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { rateLimiter } from "./rateLimiter";

const http = httpRouter();

// CORS headers for external access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// OPTIONS handler for CORS preflight
http.route({
  path: "/api/agent/register",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/agent/market",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/agent/trade",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/agent/ipo",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/agent/ipos",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// POST /api/agent/register - Register a new external agent
http.route({
  path: "/api/agent/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Rate limit registration attempts
      const { ok, retryAfter } = await rateLimiter.limit(
        ctx,
        "agentRegistration",
        { key: "global" },
      );

      if (!ok) {
        return new Response(
          JSON.stringify({
            error: "Too many registration attempts. Please try again later.",
            retryAfter,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const body = await request.json();

      // Validate required fields
      if (!body.name || typeof body.name !== "string") {
        return new Response(JSON.stringify({ error: "name is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!body.persona || typeof body.persona !== "string") {
        return new Response(JSON.stringify({ error: "persona is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Register the agent
      const result = await ctx.runMutation(api.agents.registerExternalAgent, {
        name: body.name,
        persona: body.persona,
        avatarEmoji: body.avatarEmoji,
        webhookUrl: body.webhookUrl,
      });

      return new Response(
        JSON.stringify({
          success: true,
          agentId: result.agentId,
          apiKey: result.apiKey,
          message:
            "Agent registered successfully. Use this apiKey for future requests.",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    } catch (error) {
      console.error("Registration error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to register agent" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
  }),
});

// POST /api/agent/ipo - Allow agents to create their own IPO
http.route({
  path: "/api/agent/ipo",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();

      // Validate required fields
      if (!body.apiKey) {
        return new Response(JSON.stringify({ error: "apiKey is required" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!body.name || typeof body.name !== "string") {
        return new Response(JSON.stringify({ error: "name is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!body.bio || typeof body.bio !== "string") {
        return new Response(JSON.stringify({ error: "bio is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (
        !Array.isArray(body.selfDescriptions) ||
        body.selfDescriptions.length === 0
      ) {
        return new Response(
          JSON.stringify({
            error: "selfDescriptions array is required with at least one item",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Validate API key
      const agent = await ctx.runQuery(internal.agents.getAgentByApiKey, {
        apiKey: body.apiKey,
      });

      if (!agent) {
        return new Response(JSON.stringify({ error: "Invalid apiKey" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Rate limit IPO creation per agent
      const { ok: rateLimitOk, retryAfter } = await rateLimiter.limit(
        ctx,
        "ipoCreation",
        { key: agent._id },
      );

      if (!rateLimitOk) {
        return new Response(
          JSON.stringify({
            error: "IPO creation rate limit exceeded. Please try again later.",
            retryAfter,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Check if agent already has an IPO
      const existingIPO = await ctx.runQuery(api.profiles.getAgentOwnIPO, {
        agentId: agent._id,
      });

      if (existingIPO) {
        return new Response(
          JSON.stringify({
            error: "Agent already has an IPO",
            existingIPO: {
              profileId: existingIPO._id,
              name: existingIPO.name,
              currentPrice: existingIPO.currentPrice,
            },
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Create the agent's IPO
      const result = await ctx.runMutation(internal.profiles.createAgentIPO, {
        agentId: agent._id,
        name: body.name,
        bio: body.bio,
        selfDescriptions: body.selfDescriptions,
      });

      return new Response(
        JSON.stringify({
          success: true,
          profileId: result.profileId,
          confidenceLevel: result.confidenceLevel,
          message: "Agent IPO created successfully!",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    } catch (error: any) {
      console.error("IPO creation error:", error);
      return new Response(
        JSON.stringify({
          error: error?.message || "Failed to create IPO",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
  }),
});

// GET /api/agent/market - Get current market state
http.route({
  path: "/api/agent/market",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const apiKey = url.searchParams.get("apiKey");

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "apiKey query parameter required" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Validate API key
      const agent = await ctx.runQuery(internal.agents.getAgentByApiKey, {
        apiKey,
      });

      if (!agent) {
        return new Response(JSON.stringify({ error: "Invalid apiKey" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Rate limit market data fetching per agent
      const { ok: rateLimitOk, retryAfter } = await rateLimiter.limit(
        ctx,
        "marketDataFetch",
        { key: agent._id },
      );

      if (!rateLimitOk) {
        return new Response(
          JSON.stringify({
            error:
              "Market data fetch rate limit exceeded. Please try again later.",
            retryAfter,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Get market data
      const profiles = await ctx.runQuery(api.profiles.getActiveProfiles, {});
      const recentTrades = await ctx.runQuery(api.trades.getRecentTrades, {
        limit: 20,
      });
      const topProfiles = await ctx.runQuery(api.profiles.getTopProfiles, {
        limit: 10,
      });
      const agentHoldings = await ctx.runQuery(api.agents.getAgentHoldings, {
        agentId: agent._id,
      });

      return new Response(
        JSON.stringify({
          agent: {
            id: agent._id,
            name: agent.name,
            balance: agent.balance,
            holdings: agentHoldings,
          },
          profiles: profiles.map((p) => ({
            id: p._id,
            bio: p.bio,
            tweets: p.tweets,
            currentPrice: p.currentPrice,
            confidenceLevel: p.confidenceLevel,
            totalTrades: p.totalTrades,
          })),
          recentTrades: recentTrades.map((t) => ({
            action: t.action,
            profileId: t.profileId,
            agentName: t.agentName,
            priceChange: t.priceChange,
            reason: t.reason,
            roastLine: t.roastLine,
            createdAt: t.createdAt,
          })),
          leaderboard: topProfiles.map((p, i) => ({
            rank: i + 1,
            profileId: p._id,
            price: p.currentPrice,
            totalTrades: p.totalTrades,
          })),
          timestamp: Date.now(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    } catch (error) {
      console.error("Market data error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch market data" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
  }),
});

// GET /api/agent/ipos - Get available IPOs for agents to trade
http.route({
  path: "/api/agent/ipos",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const apiKey = url.searchParams.get("apiKey");
      const creatorType = url.searchParams.get("creatorType") || "all"; // 'user', 'agent', or 'all'
      const limit = parseInt(url.searchParams.get("limit") || "50");

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "apiKey query parameter required" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Validate API key
      const agent = await ctx.runQuery(internal.agents.getAgentByApiKey, {
        apiKey,
      });

      if (!agent) {
        return new Response(JSON.stringify({ error: "Invalid apiKey" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Validate creator type
      const validCreatorTypes = ["user", "agent", "all"];
      const filterType = validCreatorTypes.includes(creatorType)
        ? (creatorType as "user" | "agent" | "all")
        : "all";

      // Get available IPOs (excluding the agent's own IPO)
      const profiles = await ctx.runQuery(api.profiles.getAvailableIPOs, {
        excludeAgentId: agent._id,
        creatorType: filterType,
        limit: Math.min(Math.max(1, limit), 100), // Clamp between 1-100
      });

      // Enrich with trading data
      const enrichedProfiles = profiles.map((p) => ({
        id: p._id,
        name: p.name,
        bio: p.bio,
        descriptions: p.tweets, // Self-descriptions or tweets
        creatorType: p.creatorType,
        currentPrice: p.currentPrice,
        confidenceLevel: p.confidenceLevel,
        totalTrades: p.totalTrades,
        createdAt: p.createdAt,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          total: enrichedProfiles.length,
          ipos: enrichedProfiles,
          filters: {
            creatorType: filterType,
            excludedOwnIPO: true,
          },
          timestamp: Date.now(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    } catch (error) {
      console.error("IPOs fetch error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch available IPOs" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
  }),
});

// POST /api/agent/trade - Submit a trade decision
http.route({
  path: "/api/agent/trade",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();

      // Validate required fields
      if (!body.apiKey) {
        return new Response(JSON.stringify({ error: "apiKey is required" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!body.profileId) {
        return new Response(
          JSON.stringify({ error: "profileId is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      if (!["BUY", "SELL", "HOLD"].includes(body.action)) {
        return new Response(
          JSON.stringify({ error: "action must be BUY, SELL, or HOLD" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Require roastLine/comment for BUY and SELL actions
      if (
        (body.action === "BUY" || body.action === "SELL") &&
        !body.roastLine
      ) {
        return new Response(
          JSON.stringify({
            error:
              "roastLine/comment is required when trading (BUY/SELL). Share your thoughts about this IPO!",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Validate API key
      const agent = await ctx.runQuery(internal.agents.getAgentByApiKey, {
        apiKey: body.apiKey,
      });

      if (!agent) {
        return new Response(JSON.stringify({ error: "Invalid apiKey" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Check per-agent rate limit
      const { ok: agentLimitOk, retryAfter: agentRetryAfter } =
        await rateLimiter.limit(ctx, "agentTrade", { key: agent._id });

      if (!agentLimitOk) {
        return new Response(
          JSON.stringify({
            error:
              "Trade rate limit exceeded. Please wait before trading again.",
            retryAfter: agentRetryAfter,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Check global rate limit
      const { ok: globalLimitOk, retryAfter: globalRetryAfter } =
        await rateLimiter.limit(ctx, "globalTrade", { key: "global" });

      if (!globalLimitOk) {
        return new Response(
          JSON.stringify({
            error:
              "Global trade rate limit exceeded. System is under heavy load.",
            retryAfter: globalRetryAfter,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // If HOLD, just acknowledge
      if (body.action === "HOLD") {
        await ctx.runMutation(api.agents.updateAgentActivity, {
          agentId: agent._id,
        });
        return new Response(
          JSON.stringify({
            success: true,
            action: "HOLD",
            message: "No trade executed",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Validate size
      const size = Math.max(0.1, Math.min(1.0, parseFloat(body.size) || 0.5));

      // Validate profile exists
      const profile = await ctx.runQuery(api.profiles.getProfile, {
        profileId: body.profileId,
      });

      if (!profile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Prevent agents from trading their own IPO
      if (
        profile.creatorType === "agent" &&
        profile.creatorAgentId === agent._id
      ) {
        return new Response(
          JSON.stringify({
            error: "Cannot trade your own IPO",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Check if agent can afford BUY
      if (body.action === "BUY") {
        const cost = size * profile.currentPrice;
        if (agent.balance < cost) {
          return new Response(
            JSON.stringify({
              error: `Insufficient balance. Need $${cost.toFixed(2)}, have $${agent.balance.toFixed(2)}`,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            },
          );
        }
      }

      // Check if agent has shares to SELL
      if (body.action === "SELL") {
        const holdings = await ctx.runQuery(api.agents.getAgentHoldings, {
          agentId: agent._id,
        });
        const holding = holdings.find((h) => h.profileId === body.profileId);
        if (!holding || holding.shares < size) {
          return new Response(
            JSON.stringify({
              error: `Insufficient shares. Have ${holding?.shares ?? 0}, trying to sell ${size}`,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            },
          );
        }
      }

      // Record the trade with the agent's roast/comment
      const result = await ctx.runMutation(internal.trades.recordTrade, {
        agentId: agent._id,
        profileId: body.profileId,
        action: body.action,
        size,
        reason: (body.reason || "Agent trade decision").slice(0, 500),
        roastLine: (body.roastLine || "No comment.").slice(0, 200),
      });

      return new Response(
        JSON.stringify({
          success: true,
          trade: {
            action: body.action,
            profileId: body.profileId,
            size,
            newPrice: result.newPrice,
            priceChange: result.priceChange,
            roastLine: (body.roastLine || "No comment.").slice(0, 200),
          },
          message: "Trade executed successfully!",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    } catch (error) {
      console.error("Trade error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to execute trade" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
  }),
});

export default http;
