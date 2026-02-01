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

// Refresh platform stats every 60 seconds
crons.interval("refresh-stats", { seconds: 60 }, internal.stats.refreshStats);

// Refresh agent leaderboard every 30 seconds
crons.interval(
  "refresh-leaderboard",
  { seconds: 30 },
  internal.leaderboard.refreshLeaderboard,
);

export default crons;
