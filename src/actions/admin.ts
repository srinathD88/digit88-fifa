"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { processPendingMatches } from "@/services/scoring.service";

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function updateUserAction(formData: FormData) {
  const admin = await verifyAdmin();
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as any;
  const teamId = formData.get("teamId") as string || null;
  const points = parseInt(formData.get("points") as string || "0");
  const isActive = formData.get("isActive") === "true";

  if (!userId) throw new Error("User ID required");

  // Prevent super admin downgrade by normal admin
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (targetUser?.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
    throw new Error("Cannot modify SUPER_ADMIN");
  }

  // Calculate bonus points by subtracting earned prediction points from total target points
  const pointsAwardedAggr = await prisma.prediction.aggregate({
    where: { userId },
    _sum: { pointsAwarded: true }
  });
  const earnedPoints = pointsAwardedAggr._sum.pointsAwarded || 0;
  const bonusPoints = points - earnedPoints;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role, teamId, bonusPoints, isActive }
  });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE_USER",
      userId: admin.id,
      entityType: "USER",
      entityId: userId,
      metadata: { role, teamId, targetPoints: points, calculatedBonusPoints: bonusPoints, isActive }
    }
  });

  revalidateTag("leaderboard", "max");
  revalidatePath("/admin/users");
  revalidatePath("/leaderboard");
}

export async function updateMatchAction(formData: FormData) {
  const admin = await verifyAdmin();
  const matchId = formData.get("matchId") as string;
  const status = formData.get("status") as any;
  const homeScoreStr = formData.get("homeScore") as string;
  const awayScoreStr = formData.get("awayScore") as string;
  const pointMultiplier = parseFloat(formData.get("pointMultiplier") as string || "1.0");

  const homeScore = homeScoreStr ? parseInt(homeScoreStr) : null;
  const awayScore = awayScoreStr ? parseInt(awayScoreStr) : null;

  const updatedMatch = await prisma.match.update({
    where: { id: matchId },
    data: { status, homeScore, awayScore, pointMultiplier }
  });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE_MATCH",
      userId: admin.id,
      entityType: "MATCH",
      entityId: matchId,
      metadata: { status, homeScore, awayScore, pointMultiplier }
    }
  });

  revalidateTag("matches", "max");
  revalidatePath("/admin/matches");
  revalidatePath("/");
}

export async function recalculateMatchAction(formData: FormData) {
  const admin = await verifyAdmin();
  const matchId = formData.get("matchId") as string;

  // In reality, this would invoke your scoring engine or a queue job
  // For now, we simulate by marking it pending
  await prisma.matchProcessing.upsert({
    where: { matchId },
    update: { status: "PENDING", attempts: 0 },
    create: { matchId, status: "PENDING" }
  });

  await prisma.auditLog.create({
    data: {
      action: "RECALCULATE_MATCH",
      userId: admin.id,
      entityType: "MATCH",
      entityId: matchId,
      metadata: { reason: "Manual trigger via Admin UI" }
    }
  });

  revalidateTag("matches", "max");
  revalidatePath("/admin/matches");
}

export async function generateMatchContextAction(formData: FormData) {
  const admin = await verifyAdmin();
  const matchId = formData.get("matchId") as string;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Match not found");
  
  await prisma.matchFact.createMany({
    data: [
      { matchId, fact: `${match.homeTeamName} has a strong historical record in international competitions.`, category: "HISTORY" },
      { matchId, fact: `The match between ${match.homeTeamName} and ${match.awayTeamName} is expected to be highly competitive.`, category: "TEAM" },
      { matchId, fact: `${match.awayTeamName} brings a mix of experienced veterans and young talent to the tournament.`, category: "PLAYER" }
    ]
  });

  await prisma.match.update({
    where: { id: matchId },
    data: { factsGenerated: true }
  });

  await prisma.auditLog.create({
    data: {
      action: "GENERATE_CONTEXT",
      userId: admin.id,
      entityType: "MATCH",
      entityId: matchId,
      metadata: { reason: "Manual trigger via Admin UI" }
    }
  });

  revalidatePath("/admin/matches");
}

export async function updateScoringConfigAction(formData: FormData) {
  const admin = await verifyAdmin();
  
  const winnerPoints = parseInt(formData.get("winnerPoints") as string);
  const exactScorePoints = parseInt(formData.get("exactScorePoints") as string);
  const maxGoalsPoints = parseInt(formData.get("maxGoalsPoints") as string);
  const perfectPredictionBonus = parseInt(formData.get("perfectPredictionBonus") as string);

  await prisma.scoringConfig.upsert({
    where: { id: 1 },
    update: {
      winnerPoints, exactScorePoints, maxGoalsPoints, perfectPredictionBonus,
      updatedBy: admin.id
    },
    create: {
      id: 1,
      winnerPoints, exactScorePoints, maxGoalsPoints, perfectPredictionBonus,
      updatedBy: admin.id
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE_SCORING",
      userId: admin.id,
      entityType: "SCORING_CONFIG",
      entityId: "1",
      metadata: { winnerPoints, exactScorePoints, maxGoalsPoints, perfectPredictionBonus }
    }
  });

  revalidatePath("/admin/scoring");
}

export async function generateHighlightsAction(formData?: FormData) {
  const admin = await verifyAdmin();
  const { generateDailyHighlightsService } = await import("@/services/ai/highlights.service");
  
  const job = await prisma.syncJob.create({
    data: { type: "AI_HIGHLIGHTS", status: "RUNNING" }
  });

  try {
    const count = await generateDailyHighlightsService(admin.id);
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "SUCCESS", recordsProcessed: count, completedAt: new Date() }
    });
  } catch (err: any) {
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: err.message, completedAt: new Date() }
    });
  }

  revalidateTag("highlights", "max");
  revalidatePath("/");
  revalidatePath("/admin/settings");
}

export async function syncTeamsAction() {
  const admin = await verifyAdmin();
  const { getMatchProvider } = await import("@/services/providers");
  const provider = getMatchProvider();
  
    if (provider.syncTeams) {
      await provider.syncTeams();
      revalidatePath("/admin/settings");
    }
}

export async function syncStadiumsAction() {
  const admin = await verifyAdmin();
  const { getMatchProvider } = await import("@/services/providers");
  const provider = getMatchProvider();
  
    if (provider.syncStadiums) {
      await provider.syncStadiums();
      revalidatePath("/admin/settings");
    }
}

export async function syncFixturesAction() {
  const admin = await verifyAdmin();
  const { getMatchProvider } = await import("@/services/providers");
  const provider = getMatchProvider();
  
  await provider.syncFixtures();
  revalidateTag("matches", "max");
  revalidatePath("/admin/settings");
  revalidatePath("/");
}

export async function recalculateAllScoresAction() {
  const admin = await verifyAdmin();

  const job = await prisma.syncJob.create({
    data: { type: "RECALCULATE_SCORES", status: "RUNNING" }
  });

  try {
    const finishedMatches = await prisma.match.findMany({
      where: { status: "FINISHED" },
      select: { id: true }
    });

    for (const match of finishedMatches) {
      await prisma.matchProcessing.upsert({
        where: { matchId: match.id },
        update: { status: "PENDING", attempts: 0 },
        create: { matchId: match.id, status: "PENDING" }
      });
    }

    // Process them immediately instead of waiting for the cron job
    await processPendingMatches();

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "SUCCESS", recordsProcessed: finishedMatches.length, completedAt: new Date() }
    });
  } catch (err: any) {
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: err.message, completedAt: new Date() }
    });
  }

  revalidateTag("leaderboard", "max");
  revalidateTag("predictions", "max");
  revalidatePath("/admin/scoring");
  revalidatePath("/leaderboard");
  revalidatePath("/admin/settings");
}

export async function updateMatchManualAction(formData: FormData) {
  const admin = await verifyAdmin();
  const matchId = formData.get("matchId") as string;
  const status = formData.get("status") as any;
  const stage = formData.get("stage") as any;
  const startTime = new Date(formData.get("startTime") as string);
  const homeScoreStr = formData.get("homeScore") as string;
  const awayScoreStr = formData.get("awayScore") as string;
  const actualMaxGoalsStr = formData.get("actualMaxGoals") as string;
  const winner = formData.get("winner") as string;
  const manualOverride = formData.get("manualOverride") === "true";

  const homeScore = homeScoreStr ? parseInt(homeScoreStr) : null;
  const awayScore = awayScoreStr ? parseInt(awayScoreStr) : null;
  const actualMaxGoals = actualMaxGoalsStr ? parseInt(actualMaxGoalsStr) : null;

  const previousMatch = await prisma.match.findUnique({ where: { id: matchId } });
  
  let finalWinner = winner;
  if (winner === "HOME") finalWinner = previousMatch?.homeTeamName || "";
  else if (winner === "AWAY") finalWinner = previousMatch?.awayTeamName || "";
  
  const updatedMatch = await prisma.match.update({
    where: { id: matchId },
    data: { 
      status, stage, startTime, 
      homeScore, awayScore, actualMaxGoals, 
      winner: finalWinner || null,
      manualOverride 
    }
  });

  const changes: any = {};
  if (previousMatch?.homeScore !== homeScore) changes.homeScore = `${previousMatch?.homeScore} -> ${homeScore}`;
  if (previousMatch?.awayScore !== awayScore) changes.awayScore = `${previousMatch?.awayScore} -> ${awayScore}`;
  if (previousMatch?.status !== status) changes.status = `${previousMatch?.status} -> ${status}`;

  await prisma.auditLog.create({
    data: {
      action: "MANUAL_UPDATE_MATCH",
      userId: admin.id,
      entityType: "MATCH",
      entityId: matchId,
      metadata: { changes, manualOverride }
    }
  });

  // Automated scoring recalculation if status became FINISHED
  if (status === "FINISHED" && previousMatch?.status !== "FINISHED") {
     await prisma.matchProcessing.upsert({
        where: { matchId },
        update: { status: "PENDING", attempts: 0 },
        create: { matchId, status: "PENDING" }
     });
     const { processPendingMatches } = await import("@/services/scoring.service");
     await processPendingMatches();
  }

  revalidateTag("matches", "max");
  revalidateTag("leaderboard", "max");
  revalidateTag("predictions", "max");
  revalidatePath("/admin/matches");
  revalidatePath("/");
  revalidatePath("/leaderboard");
}

export async function createMatchManualAction(formData: FormData) {
  const admin = await verifyAdmin();
  const homeTeamId = formData.get("homeTeamId") as string;
  const awayTeamId = formData.get("awayTeamId") as string;
  const status = formData.get("status") as any;
  const stage = formData.get("stage") as any;
  const startTime = new Date(formData.get("startTime") as string);
  const homeScoreStr = formData.get("homeScore") as string;
  const awayScoreStr = formData.get("awayScore") as string;
  const actualMaxGoalsStr = formData.get("actualMaxGoals") as string;
  const winner = formData.get("winner") as string;

  const homeScore = homeScoreStr ? parseInt(homeScoreStr) : null;
  const awayScore = awayScoreStr ? parseInt(awayScoreStr) : null;
  const actualMaxGoals = actualMaxGoalsStr ? parseInt(actualMaxGoalsStr) : null;

  const homeTeam = await prisma.team.findUnique({ where: { id: homeTeamId } });
  const awayTeam = await prisma.team.findUnique({ where: { id: awayTeamId } });
  if (!homeTeam || !awayTeam) throw new Error("Teams not found");

  let finalWinner = winner;
  if (winner === "HOME") finalWinner = homeTeam.name;
  else if (winner === "AWAY") finalWinner = awayTeam.name;

  const newMatch = await prisma.match.create({
    data: {
      externalMatchId: `manual_${Date.now()}`,
      source: "MANUAL",
      manualOverride: true,
      homeTeamId, awayTeamId,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      status, stage, startTime,
      homeScore, awayScore, actualMaxGoals,
      winner: finalWinner || null
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "MANUAL_CREATE_MATCH",
      userId: admin.id,
      entityType: "MATCH",
      entityId: newMatch.id,
      metadata: { source: "MANUAL" }
    }
  });

  if (status === "FINISHED") {
     await prisma.matchProcessing.upsert({
        where: { matchId: newMatch.id },
        update: { status: "PENDING", attempts: 0 },
        create: { matchId: newMatch.id, status: "PENDING" }
     });
     const { processPendingMatches } = await import("@/services/scoring.service");
     await processPendingMatches();
  }

  revalidateTag("matches", "max");
  revalidatePath("/admin/matches");
  revalidatePath("/");
}
