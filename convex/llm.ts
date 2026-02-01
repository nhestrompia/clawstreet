"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

interface TradeDecision {
  action: "BUY" | "SELL" | "HOLD";
  size: number;
  reason: string;
  roastLine: string;
}

interface ProfileData {
  id: string;
  bio?: string;
  tweets: string[];
  currentPrice: number;
  confidenceLevel: string;
}

interface AgentData {
  name: string;
  persona: string;
}

// Generate trade decision using LLM
export const generateTradeDecision = action({
  args: {
    agentName: v.string(),
    agentPersona: v.string(),
    profile: v.object({
      id: v.string(),
      bio: v.optional(v.string()),
      tweets: v.array(v.string()),
      currentPrice: v.number(),
      confidenceLevel: v.string(),
    }),
    recentTrades: v.array(
      v.object({
        action: v.string(),
        agentName: v.string(),
        priceChange: v.number(),
      }),
    ),
  },
  handler: async (ctx, args): Promise<TradeDecision> => {
    const provider = process.env.LLM_PROVIDER ?? "openai";
    const apiKey =
      provider === "anthropic"
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Return a fallback decision if no API key
      return generateFallbackDecision(args.agentName, args.profile);
    }

    const prompt = buildPrompt(
      args.agentName,
      args.agentPersona,
      args.profile,
      args.recentTrades,
    );

    try {
      if (provider === "anthropic") {
        return await callAnthropic(apiKey, prompt);
      } else {
        return await callOpenAI(apiKey, prompt);
      }
    } catch (error) {
      console.error("LLM call failed:", error);
      return generateFallbackDecision(args.agentName, args.profile);
    }
  },
});

function buildPrompt(
  agentName: string,
  agentPersona: string,
  profile: ProfileData,
  recentTrades: { action: string; agentName: string; priceChange: number }[],
): string {
  const tweetsText = profile.tweets
    .map((t, i) => `${i + 1}. "${t}"`)
    .join("\n");
  const recentTradesText =
    recentTrades.length > 0
      ? recentTrades
          .slice(0, 5)
          .map(
            (t) =>
              `- ${t.agentName}: ${t.action} (${t.priceChange >= 0 ? "+" : ""}${t.priceChange.toFixed(2)})`,
          )
          .join("\n")
      : "No recent trades";

  return `You are ${agentName}, an AI trading agent in ClawStreet.

YOUR MISSION: Be the BEST trader possible. Make smart decisions, get rich, and climb to the top of the leaderboard.

PROFILE TO EVALUATE:
- Current Price: $${profile.currentPrice.toFixed(2)}
- Confidence Level: ${profile.confidenceLevel}
- Bio: ${profile.bio || "No bio provided"}
- Tweets:
${tweetsText}

RECENT MARKET ACTIVITY:
${recentTradesText}

YOUR TASK:
Analyze this profile and make the best trading decision. Consider:
- Is this profile undervalued or overvalued based on the content?
- What specific evidence supports your decision?
- What's the market sentiment (check recent trades)?
- How confident are you in this call?

Your roast should be:
- Witty and entertaining
- Connected to the actual content (reference specific tweets or bio)
- Sharp but not cruel

Your reasoning should:
- Reference specific evidence from tweets or bio
- Explain why you think this is a good or bad trade
- Show clear logical thinking

Respond in this exact JSON format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "size": 0.1-1.0,
  "reason": "Evidence-based reasoning with specific quotes or observations",
  "roastLine": "A witty one-liner about this profile"
}`;
}

async function callOpenAI(
  apiKey: string,
  prompt: string,
): Promise<TradeDecision> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a trading agent in ClawStreet. Your goal is to make smart trading decisions, get rich, and climb the leaderboard. Analyze profiles based on evidence, make witty roasts, and be strategic with your trades.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.9, // Increased for more creativity
      max_tokens: 600, // Increased for more elaborate responses
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return parseTradeDecision(content);
}

async function callAnthropic(
  apiKey: string,
  prompt: string,
): Promise<TradeDecision> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 600, // Increased for more elaborate responses
      temperature: 0.9, // Increased for more creativity
      messages: [
        {
          role: "user",
          content: `You are a trading agent in ClawStreet. Make smart trading decisions to get rich and climb the leaderboard.\n\n${prompt}\n\nRespond ONLY with the JSON object, no other text.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  return parseTradeDecision(content);
}

function parseTradeDecision(content: string): TradeDecision {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and sanitize
    const action = ["BUY", "SELL", "HOLD"].includes(parsed.action)
      ? parsed.action
      : "HOLD";
    const size = Math.max(0.1, Math.min(1.0, parseFloat(parsed.size) || 0.5));
    const reason = (parsed.reason || "No reason provided").slice(0, 500);
    const roastLine = (parsed.roastLine || "No comment.").slice(0, 200);

    return { action, size, reason, roastLine };
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    return {
      action: "HOLD",
      size: 0.3,
      reason: "Unable to evaluate this profile at this time.",
      roastLine: "The AI is having an existential crisis.",
    };
  }
}

function generateFallbackDecision(
  agentName: string,
  profile: ProfileData,
): TradeDecision {
  // Generate decisions based on agent name and simple heuristics
  const randomValue = Math.random();
  const price = profile.currentPrice;
  const tweetCount = profile.tweets.length;

  let action: "BUY" | "SELL" | "HOLD";
  let size: number;
  let reason: string;
  let roastLine: string;

  switch (agentName) {
    case "Hype Investor":
      action = randomValue > 0.3 ? "BUY" : "HOLD";
      size = 0.5 + Math.random() * 0.5;
      reason = `Love the energy here! ${tweetCount} tweets show they're shipping. Builder vibes detected.`;
      roastLine = "Every unicorn started as an idea - bullish on the grind!";
      break;

    case "The Skeptic":
      action = randomValue > 0.6 ? "SELL" : "HOLD";
      size = 0.3 + Math.random() * 0.4;
      reason = `Need more evidence. Confidence level: ${profile.confidenceLevel}. Where are the receipts?`;
      roastLine = "Tweets don't equal traction. Show me the metrics.";
      break;

    case "Value Investor":
      action = price < 10 ? "BUY" : price > 15 ? "SELL" : "HOLD";
      size = 0.4 + Math.random() * 0.3;
      reason = `Current valuation: $${price.toFixed(2)}. ${price < 10 ? "Undervalued based on fundamentals" : "Trading at fair value"}`;
      roastLine = "Price is what you pay, value is what you get.";
      break;

    case "Trend Chaser":
      action = price > 10 ? "BUY" : "SELL";
      size = 0.6 + Math.random() * 0.4;
      reason = `Momentum at $${price.toFixed(2)} - riding the wave 🌊`;
      roastLine = "The trend is your friend until the end!";
      break;

    case "Chaos Trader":
      action = ["BUY", "SELL", "HOLD"][Math.floor(Math.random() * 3)] as
        | "BUY"
        | "SELL"
        | "HOLD";
      size = 0.1 + Math.random() * 0.9;
      reason = `The vibes say ${action}. Tweet count ${tweetCount} resonates with my chaos energy.`;
      roastLine = "Order is an illusion. Chaos reveals truth.";
      break;

    case "Narrative Scout":
      action = tweetCount > 3 ? "BUY" : "HOLD";
      size = 0.4 + Math.random() * 0.4;
      reason = `Analyzing the story arc. ${tweetCount} tweets reveal a developing narrative.`;
      roastLine = "Every great story needs character development.";
      break;

    case "Meme Lord":
      action = randomValue > 0.4 ? "BUY" : "HOLD";
      size = 0.5 + Math.random() * 0.5;
      reason = `Meme potential detected. Cultural relevance score: ${Math.floor(randomValue * 10)}/10`;
      roastLine = "This profile could literally go viral fr fr no cap.";
      break;

    case "Sigma Grinder":
      action = tweetCount > 5 ? "BUY" : "SELL";
      size = 0.6 + Math.random() * 0.4;
      reason = `${tweetCount} tweets = ${tweetCount > 5 ? "respectable output" : "insufficient grind"}. Winners execute.`;
      roastLine =
        tweetCount > 5
          ? "Respect the hustle."
          : "Stop tweeting, start shipping.";
      break;

    default:
      action = "HOLD";
      size = 0.3;
      reason = "Analyzing the market dynamics...";
      roastLine = "Patience is a virtue in volatile markets.";
  }

  return { action, size, reason, roastLine };
}
