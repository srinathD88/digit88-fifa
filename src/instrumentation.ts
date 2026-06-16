import cron from "node-cron";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { syncFixturesService, syncResultsService } = await import("./services/match.service");
    const { processPendingMatches } = await import("./services/scoring.service");
    const { prisma } = await import("./lib/prisma");
    
    console.log("[Instrumentation] Registering cron jobs...");
    
    // Sync fixtures daily (1 request/day)
    cron.schedule(process.env.CRON_SYNC_FIXTURES || "0 0 * * *", async () => {
      try {
        await syncFixturesService();
      } catch (err) {
        console.error("[Cron] Error syncing fixtures:", err);
      }
    });

    // Sync results every 15 minutes, but only if matches are live or recently finished
    cron.schedule(process.env.CRON_SYNC_RESULTS || "*/15 * * * *", async () => {
      try {
        const liveMatchCount = await prisma.match.count({
          where: {
            OR: [
              { status: 'IN_PLAY' },
              { status: 'SCHEDULED', startTime: { lte: new Date() } }
            ]
          }
        });
        
        if (liveMatchCount > 0) {
          console.log(`[Cron] Found ${liveMatchCount} live/pending matches. Triggering results sync.`);
          await syncResultsService();
        }
      } catch (err) {
        console.error("[Cron] Error syncing results:", err);
      }
    });

    // Process pending scores every 20 minutes
    cron.schedule(process.env.CRON_PROCESS_SCORES || "*/20 * * * *", async () => {
      try {
        await processPendingMatches();
      } catch (err) {
        console.error("[Cron] Error processing matches:", err);
      }
    });

    // Generate AI Highlights daily at 5:00 AM UTC
    cron.schedule(process.env.CRON_AI_HIGHLIGHTS || "0 5 * * *", async () => {
      try {
        const { generateDailyHighlightsService } = await import("./services/ai/highlights.service");
        const count = await generateDailyHighlightsService();
        console.log(`[Cron] Generated ${count} AI Highlights successfully.`);
      } catch (err) {
        console.error("[Cron] Error generating highlights:", err);
      }
    });
  }
}
