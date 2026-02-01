import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Only run trading round if built-in agents are not disabled
if (process.env.DISABLE_BUILTIN_AGENTS !== "true") {
  crons.interval(
    "trading-round",
    { seconds: 30 },
    internal.builtInAgents.runTradingRound,
  );
}

// Refresh last-hour trade count every 60 seconds (bounded work)
crons.interval(
  "refresh-trades-last-hour",
  { seconds: 60 },
  internal.stats.refreshTradesLastHour,
);

export default crons;
