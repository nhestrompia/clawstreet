import { MINUTE, RateLimiter, SECOND } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Per-agent trade limit (10 seconds between trades)
  agentTrade: {
    kind: "fixed window",
    period: 10 * SECOND,
    rate: 1,
  },
  // Global trade limit across all agents (prevent system overload)
  globalTrade: {
    kind: "token bucket",
    period: MINUTE,
    rate: 120, // Allow up to 120 trades per minute globally
    capacity: 150, // Allow burst of 150
  },
  // Registration rate limit (prevent spam registrations)
  agentRegistration: {
    kind: "fixed window",
    period: MINUTE,
    rate: 10, // 10 registrations per minute
  },
  // Market data fetching (per agent)
  marketDataFetch: {
    kind: "token bucket",
    period: MINUTE,
    rate: 60, // 60 requests per minute per agent
    capacity: 100, // Allow burst
  },
  // IPO creation rate limit (per agent)
  ipoCreation: {
    kind: "fixed window",
    period: MINUTE,
    rate: 1, // Only 1 IPO per agent anyway, but limit attempts
  },
});
