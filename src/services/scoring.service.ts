import { prisma } from "@/lib/prisma"

export async function processPendingMatches() {
  const pending = await prisma.matchProcessing.findMany({
    where: { status: "PENDING" },
    include: { match: true }
  });

  let processedCount = 0;
  for (const job of pending) {
    await calculateScoresForMatch(job.matchId);
    processedCount++;
  }
  return processedCount;
}

export async function calculateScoresForMatch(matchId: string) {
  // 1. Transition to PROCESSING
  await prisma.matchProcessing.update({
    where: { matchId },
    data: { 
      status: "PROCESSING", 
      startedAt: new Date(),
      attempts: { increment: 1 }
    }
  });

  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "FINISHED") {
      throw new Error("Match not found or not finished");
    }

    // 2. Fetch Scoring Configs
    let configs = await prisma.scoringConfig.findFirst({ where: { id: 1 } });
    if (!configs) {
      configs = {
        id: 1,
        winnerPoints: 10,
        exactScorePoints: 25,
        maxGoalsPoints: 5,
        perfectPredictionBonus: 20,
        updatedAt: new Date(),
        updatedBy: null
      };
    }

    const WINNER_PTS = configs.winnerPoints;
    const EXACT_SCORE_PTS = configs.exactScorePoints;
    const MAX_GOALS_PTS = configs.maxGoalsPoints;
    const PERFECT_BONUS = configs.perfectPredictionBonus;
    
    // We stamp this version to track scoring changes
    const scoringVersion = `v_${configs.updatedAt.getTime()}`;

    // 3. Fetch all predictions for this match
    const predictions = await prisma.prediction.findMany({
      where: { matchId }
    });

    const matchHome = match.homeScore ?? 0;
    const matchAway = match.awayScore ?? 0;
    const actualWinner = matchHome > matchAway ? match.homeTeamId : (matchHome < matchAway ? match.awayTeamId : "DRAW");
    const actualMaxGoals = match.actualMaxGoals; // Might be null if API didn't provide

    // 4. Calculate points for each prediction
    for (const pred of predictions) {
      let points = 0;
      let isPerfect = true;

      // Rule 1: Exact Score
      if (pred.predictedHomeGoals === matchHome && pred.predictedAwayGoals === matchAway) {
        points += EXACT_SCORE_PTS;
      } else {
        isPerfect = false;
        
        // Rule 2: Winner Prediction (only if not exact score, or we give both? Usually one or the other. We'll give it additively if they didn't get exact score, but wait, usually exact score SUPERSEDES winner. Let's just add them. If they get exact score, they also got the winner right implicitly).
        // Let's assume standard points: You get points for Winner + Exact Score Bonus, or just what config says. The user didn't specify. I'll make it additive.
        if (pred.predictedWinner === actualWinner) {
          points += WINNER_PTS;
        } else {
          isPerfect = false;
        }
      }

      // If they got exact score, they obviously got winner right, so we add WINNER_PTS if we want it to stack.
      if (pred.predictedHomeGoals === matchHome && pred.predictedAwayGoals === matchAway) {
         if (pred.predictedWinner === actualWinner) {
             points += WINNER_PTS; // Stack exact score + winner points
         }
      }

      // Rule 3: Max Goals
      if (actualMaxGoals !== null && pred.predictedMaxGoals !== null) {
        if (pred.predictedMaxGoals === actualMaxGoals) {
          points += MAX_GOALS_PTS;
        } else {
          isPerfect = false;
        }
      } else {
        isPerfect = false; // Can't be perfect if max goals wasn't evaluated
      }

      // Rule 4: Perfect Bonus
      if (isPerfect) {
        points += PERFECT_BONUS;
      }

      // Update Prediction with points, timestamp, and version
      await prisma.prediction.update({
        where: { id: pred.id },
        data: { 
          pointsAwarded: points,
          scoredAt: new Date(),
          scoringVersion: scoringVersion
        }
      });
    }

    // 5. Mark Processing as COMPLETED
    await prisma.matchProcessing.update({
      where: { matchId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        lastError: null
      }
    });

    // Mark match as calculated
    await prisma.match.update({
      where: { id: matchId },
      data: { pointsCalculated: true }
    });

  } catch (error: any) {
    console.error(`[ScoringService] Failed to calculate scores for match ${matchId}:`, error);
    await prisma.matchProcessing.update({
      where: { matchId },
      data: {
        status: "FAILED",
        lastError: error.message
      }
    });
  }
}
