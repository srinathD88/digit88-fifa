import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export async function getIndividualLeaderboard() {
  const userScores = await prisma.prediction.groupBy({
    by: ['userId'],
    _sum: { pointsAwarded: true },
    where: { pointsAwarded: { not: null } }
  });

  const users = await prisma.user.findMany({
    include: { team: true, predictions: { where: { pointsAwarded: { not: null } } } }
  });

  return users.map(user => {
    const predictionPoints = user.predictions.reduce((sum, p) => sum + (p.pointsAwarded || 0), 0);
    // A perfect prediction scores at least 55 points (10 Winner + 25 Exact + 20 Bonus).
    const perfectCount = user.predictions.filter(p => (p.pointsAwarded || 0) >= 55).length;
    
    return {
      userId: user.id,
      name: user.name || "Unknown",
      team: user.team?.name || "No Team",
      flagUrl: user.team?.flagUrl || null,
      teamId: user.teamId,
      points: predictionPoints + user.bonusPoints,
      perfectCount
    };
  }).sort((a, b) =>
    b.points - a.points ||
    b.perfectCount - a.perfectCount ||
    a.name.localeCompare(b.name)
  );
}

export async function getStageLeaderboard(stage: string) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      teamId: true,
      team: { select: { name: true, flagUrl: true } },
      predictions: {
        where: { match: { stage: stage as any, status: 'FINISHED' } },
        select: { pointsAwarded: true }
      }
    }
  });

  return users
    .map(u => ({
      userId: u.id,
      name: u.name || 'Unknown',
      teamId: u.teamId,
      team: u.team?.name || 'No Team',
      flagUrl: u.team?.flagUrl || null,
      points: u.predictions.reduce((s: number, p: any) => s + (p.pointsAwarded || 0), 0),
      perfectCount: u.predictions.filter((p: any) => (p.pointsAwarded || 0) >= 55).length,
      predictionCount: u.predictions.length,
    }))
    .filter(u => u.predictionCount > 0)
    .sort((a, b) =>
      b.points - a.points ||
      b.perfectCount - a.perfectCount ||
      a.name.localeCompare(b.name)
    );
}

export async function getTeamLeaderboard() {
  const individualScores = await getIndividualLeaderboard();
  
  const teams = await prisma.team.findMany();
  
  return teams.map(team => {
    const teamUsers = individualScores.filter(u => u.teamId === team.id);
    const totalPoints = teamUsers.reduce((sum, u) => sum + u.points, 0);
    const usersCount = teamUsers.length;
    const avgPoints = usersCount > 0 ? totalPoints / usersCount : 0;
    return {
      id: team.id,
      name: team.name,
      country: team.country,
      flagUrl: team.flagUrl,
      totalPoints,
      avgPoints,
      usersCount
    };
  }).sort((a, b) => b.avgPoints - a.avgPoints);
}

export const getUserLeaderboardStats = unstable_cache(
  async (userId: string) => {
    const leaderboard = await getIndividualLeaderboard();
    const index = leaderboard.findIndex(u => u.userId === userId);
    
    if (index === -1) return null;
    
    return {
      points: leaderboard[index].points,
      rank: index + 1,
      team: leaderboard[index].team,
      flagUrl: leaderboard[index].flagUrl,
    };
  },
  ['user-leaderboard-stats'],
  { revalidate: 300 }
);

export const AWARD_CONFIG = [
  // The Podiums
  { key: "overall", title: "Overall Podium", type: "overall", badgePrefix: "", calculation: "TOTAL_POINTS" },

  // Round-by-Round Milestones
  { key: "round_top_r32",    title: "Round of 32 — Top Predictor",    type: "milestone", badgePrefix: "R32⚽", calculation: "ROUND_TOP",        stage: "ROUND_OF_32" },
  { key: "round_top_r16",    title: "Round of 16 — Top Predictor",    type: "milestone", badgePrefix: "R16⚽", calculation: "ROUND_TOP",        stage: "ROUND_OF_16" },
  { key: "round_top_qf",     title: "Quarter-finals — Top Predictor", type: "milestone", badgePrefix: "QF⚽",  calculation: "ROUND_TOP",        stage: "QUARTER_FINAL" },
  { key: "penalty_shooter",  title: "Penalty Shooter",                 type: "milestone", badgePrefix: "🥅",   calculation: "PENALTY_SHOOTER" },

  // Streak & Precision
  { key: "streak_5",         title: "Winning Streak 5",               type: "streak",    badgePrefix: "✨5",  calculation: "WINNING_STREAK",  threshold: 5 },
  { key: "streak_10",        title: "Winning Streak 10",              type: "streak",    badgePrefix: "💫10", calculation: "WINNING_STREAK",  threshold: 10 },
  { key: "double_jeopardy",  title: "Double Jeopardy",                type: "streak",    badgePrefix: "🎰",   calculation: "DOUBLE_JEOPARDY" },

  // Comeback & Progression
  { key: "rising_star_r16", title: "Rising Star — R32→R16", type: "comeback", badgePrefix: "⭐", calculation: "RISING_STAR_R16" },
  { key: "rising_star_qf",  title: "Rising Star — R16→R8",  type: "comeback", badgePrefix: "⭐", calculation: "RISING_STAR_QF" },
  { key: "rising_star_sf",  title: "Rising Star — R8→R4",   type: "comeback", badgePrefix: "⭐", calculation: "RISING_STAR_SF" },

  // Stage Winners
  { key: "stage_GROUP",          title: "Group Stage",    type: "stage", badgePrefix: "G",   calculation: "STAGE_POINTS", stage: "GROUP" },
  { key: "stage_ROUND_OF_32",    title: "Round of 32",    type: "stage", badgePrefix: "R32", calculation: "STAGE_POINTS", stage: "ROUND_OF_32" },
  { key: "stage_ROUND_OF_16",    title: "Round of 16",    type: "stage", badgePrefix: "R16", calculation: "STAGE_POINTS", stage: "ROUND_OF_16" },
  { key: "stage_QUARTER_FINAL",  title: "Quarter-final",  type: "stage", badgePrefix: "QF",  calculation: "STAGE_POINTS", stage: "QUARTER_FINAL" },
  { key: "stage_SEMI_FINAL",     title: "Semi-final",     type: "stage", badgePrefix: "SF",  calculation: "STAGE_POINTS", stage: "SEMI_FINAL" },
  { key: "stage_FINAL",          title: "Final",          type: "stage", badgePrefix: "F",   calculation: "STAGE_POINTS", stage: "FINAL" },

  // { key: "perfect",    title: "Most Perfect Predictions",   type: "performance", badgePrefix: "🎯", calculation: "MOST_PERFECT" },
  // { key: "consistent", title: "Most Consistent Predictor",  type: "performance", badgePrefix: "📈", calculation: "MOST_CONSISTENT" },
];

export async function _getTournamentAwards() {
  const usersData = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      bonusPoints: true,
      teamId: true,
      predictions: {
        where: { match: { status: 'FINISHED' } },
        select: {
          pointsAwarded: true,
          predictedHomeGoals: true,
          predictedAwayGoals: true,
          predictedMaxGoals: true,
          predictedPenaltyHomeScore: true,
          predictedPenaltyAwayScore: true,
          match: {
            select: {
              stage: true,
              homeScore: true,
              awayScore: true,
              actualMaxGoals: true,
              winner: true,
              homeTeamName: true,
              awayTeamName: true,
              startTime: true,
              homePenaltyScore: true,
              awayPenaltyScore: true,
            }
          }
        }
      }
    }
  });

  const PENALTY_STAGES = new Set(['ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL']);

  const users = usersData.map(u => {
    let totalPoints = u.bonusPoints;
    let perfectCount = 0;
    let consistentCount = 0;
    const stagePoints: Record<string, number> = {};

    // Sort predictions chronologically for streak/double-jeopardy checks
    const sortedPreds = [...u.predictions].sort(
      (a, b) => new Date(a.match.startTime).getTime() - new Date(b.match.startTime).getTime()
    );

    u.predictions.forEach(p => {
      const pts = p.pointsAwarded || 0;
      totalPoints += pts;
      if (pts >= 55) perfectCount++;
      if (pts > 0) consistentCount++;
      const stage = p.match?.stage;
      if (stage) stagePoints[stage] = (stagePoints[stage] || 0) + pts;
    });

    // --- Winning Streak (continuous across full tournament) ---
    let currentStreak = 0;
    let streak5CompletedAt: Date | null = null;
    let streak10CompletedAt: Date | null = null;

    for (const p of sortedPreds) {
      const match = p.match;
      if (!match?.winner) continue;

      const predH = p.predictedHomeGoals ?? 0;
      const predA = p.predictedAwayGoals ?? 0;
      let predictedWinner: string;
      if (predH > predA) predictedWinner = match.homeTeamName;
      else if (predA > predH) predictedWinner = match.awayTeamName;
      else predictedWinner = "DRAW";

      if (predictedWinner === match.winner) {
        currentStreak++;
        if (currentStreak >= 5 && !streak5CompletedAt) streak5CompletedAt = new Date(match.startTime);
        if (currentStreak >= 10 && !streak10CompletedAt) streak10CompletedAt = new Date(match.startTime);
      } else {
        currentStreak = 0;
      }
    }

    // --- Double Jeopardy: 2 consecutive perfect predictions (exact score + exact max goals) ---
    let doubleJeopardyCompletedAt: Date | null = null;
    let lastWasPerfect = false;

    for (const p of sortedPreds) {
      const match = p.match;
      if (!match) continue;
      const exactScore =
        p.predictedHomeGoals !== null && p.predictedHomeGoals === match.homeScore &&
        p.predictedAwayGoals !== null && p.predictedAwayGoals === match.awayScore;
      const exactMaxGoals =
        p.predictedMaxGoals !== null && match.actualMaxGoals !== null &&
        p.predictedMaxGoals === match.actualMaxGoals;
      const isPerfect = exactScore && exactMaxGoals;

      if (isPerfect && lastWasPerfect && !doubleJeopardyCompletedAt) doubleJeopardyCompletedAt = new Date(match.startTime);
      lastWasPerfect = isPerfect;
    }

    // --- Penalty Shooter: correct penalty predictions from R16+ ---
    let penaltyCorrectCount = 0;
    for (const p of u.predictions) {
      const match = p.match;
      if (!match || !PENALTY_STAGES.has(match.stage)) continue;
      if (match.homePenaltyScore === null || match.awayPenaltyScore === null) continue;
      if (
        p.predictedPenaltyHomeScore !== null &&
        p.predictedPenaltyAwayScore !== null &&
        p.predictedPenaltyHomeScore === match.homePenaltyScore &&
        p.predictedPenaltyAwayScore === match.awayPenaltyScore
      ) penaltyCorrectCount++;
    }

    return {
      id: u.id,
      name: u.name || "Unknown",
      totalPoints,
      perfectCount,
      consistentCount,
      stagePoints,
      teamId: u.teamId,
      streak5CompletedAt,
      streak10CompletedAt,
      doubleJeopardyCompletedAt,
      penaltyCorrectCount,
    };
  });

  // --- Rising Star: biggest rank jump across consecutive stage snapshots ---
  const computeRankSnapshot = (stages: string[]): Map<string, number> => {
    const stageSet = new Set(stages);
    const pts = new Map<string, number>();
    for (const u of usersData) {
      let p = u.bonusPoints;
      for (const pred of u.predictions) {
        if (pred.match && stageSet.has(pred.match.stage)) p += (pred.pointsAwarded || 0);
      }
      pts.set(u.id, p);
    }
    const sorted = [...pts.entries()].sort((a, b) => b[1] - a[1]);
    const rankMap = new Map<string, number>();
    let currentRank = 1;
    let currentPts = -1;
    for (let i = 0; i < sorted.length; i++) {
      const [uid, score] = sorted[i];
      if (score !== currentPts) { currentRank = i + 1; currentPts = score; }
      rankMap.set(uid, currentRank);
    }
    return rankMap;
  };

  const snapshots = [
    computeRankSnapshot(['GROUP', 'ROUND_OF_32']),
    computeRankSnapshot(['GROUP', 'ROUND_OF_32', 'ROUND_OF_16']),
    computeRankSnapshot(['GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL']),
    computeRankSnapshot(['GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL']),
  ];

  const findRisingStarForTransition = (before: Map<string, number>, after: Map<string, number>) =>
    users
      .map((u: any) => {
        const rankBefore = before.get(u.id) ?? (users.length + 1);
        const rankAfter  = after.get(u.id)  ?? (users.length + 1);
        return { ...u, bestRankJump: rankBefore - rankAfter, rankBefore, rankAfter };
      })
      .filter((u: any) => u.bestRankJump > 0)
      .sort((a: any, b: any) => b.bestRankJump - a.bestRankJump)[0] ?? null;

  const risingStarR16 = findRisingStarForTransition(snapshots[0], snapshots[1]);
  const risingStarQF  = findRisingStarForTransition(snapshots[1], snapshots[2]);
  const risingStarSF  = findRisingStarForTransition(snapshots[2], snapshots[3]);

  // --- Top Winning Team ---
  const teamLeaderboard = await getTeamLeaderboard();
  const topTeam = teamLeaderboard[0] ?? null;
  let teamAward: any = null;
  if (topTeam) {
    const members = users
      .filter(u => u.teamId === topTeam.id)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map(u => ({ id: u.id, name: u.name, totalPoints: u.totalPoints }));
    teamAward = {
      teamId: topTeam.id,
      teamName: topTeam.name,
      flagUrl: (topTeam as any).flagUrl,
      avgPoints: topTeam.avgPoints,
      totalPoints: topTeam.totalPoints,
      members,
    };
  }

  // --- Competition Ranking (1-2-2-4) ---
  const getRankWinners1224 = (usersList: any[], metric: (u: any) => number) => {
    const sorted = [...usersList].sort((a, b) => metric(b) - metric(a) || a.name.localeCompare(b.name));
    const rankings = { first: [] as any[], second: [] as any[], third: [] as any[] };
    let currentScore = -1;
    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      const score = metric(sorted[i]);
      if (score <= 0) break;
      if (currentScore === -1) { currentScore = score; }
      else if (score < currentScore) { currentScore = score; currentRank = i + 1; }
      if (currentRank === 1) rankings.first.push({ ...sorted[i], score });
      else if (currentRank === 2) rankings.second.push({ ...sorted[i], score });
      else if (currentRank === 3) rankings.third.push({ ...sorted[i], score });
      else break;
    }
    return rankings;
  };

  const awardsList: any[] = [];
  const userAwards: Record<string, any[]> = {};

  const addUserAward = (userId: string, entry: any) => {
    if (!userAwards[userId]) userAwards[userId] = [];
    userAwards[userId].push(entry);
  };

  AWARD_CONFIG.forEach((award: any) => {
    // --- Standard metric-based awards ---
    if (award.calculation === "TOTAL_POINTS" || award.calculation === "MOST_PERFECT" ||
        award.calculation === "MOST_CONSISTENT" || award.calculation === "STAGE_POINTS") {
      let metric: (u: any) => number;
      if (award.calculation === "TOTAL_POINTS")   metric = u => u.totalPoints;
      else if (award.calculation === "MOST_PERFECT")   metric = u => u.perfectCount;
      else if (award.calculation === "MOST_CONSISTENT") metric = u => u.consistentCount;
      else metric = u => u.stagePoints[award.stage] || 0;

      const rankings = getRankWinners1224(users, metric);
      if (rankings.first.length === 0) return;
      awardsList.push({ ...award, rankings });

      const pushRank = (group: any[], rank: number) => group.forEach(w => {
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
        let badge = award.type === "overall" ? (rank === 1 ? "🏆" : medal) : `${award.badgePrefix}${medal}`;
        const titles: Record<number, string> = {
          1: award.type === "overall" ? "Tournament Champion"   : `1st Place — ${award.title}`,
          2: award.type === "overall" ? "Tournament Runner-up"  : `2nd Place — ${award.title}`,
          3: award.type === "overall" ? "Tournament 3rd Place"  : `3rd Place — ${award.title}`,
        };
        addUserAward(w.id, { category: award.title, type: award.type, rank, badge, title: titles[rank] });
      });
      pushRank(rankings.first, 1);
      pushRank(rankings.second, 2);
      pushRank(rankings.third, 3);
      return;
    }

    // --- Round Top Predictor (exclusive — no award on tie) ---
    if (award.calculation === "ROUND_TOP") {
      const sorted = users
        .map(u => ({ ...u, stageScore: u.stagePoints[award.stage] || 0 }))
        .filter(u => u.stageScore > 0)
        .sort((a, b) => b.stageScore - a.stageScore);
      if (sorted.length === 0) return;
      const topScore = sorted[0].stageScore;
      if (sorted.filter(u => u.stageScore === topScore).length > 1) return; // strict tie → no winner
      const winner = sorted[0];
      awardsList.push({ ...award, rankings: { first: [{ ...winner, score: winner.stageScore }], second: [], third: [] } });
      addUserAward(winner.id, { category: award.title, type: award.type, rank: 1, badge: award.badgePrefix, title: award.title });
      return;
    }

    // --- Penalty Shooter ---
    if (award.calculation === "PENALTY_SHOOTER") {
      const rankings = getRankWinners1224(users.filter(u => u.penaltyCorrectCount > 0), u => u.penaltyCorrectCount);
      if (rankings.first.length === 0) return;
      awardsList.push({ ...award, rankings });
      const pushRank = (group: any[], rank: number) => group.forEach(w => {
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
        addUserAward(w.id, { category: award.title, type: award.type, rank, badge: `${award.badgePrefix}${medal}`, title: `${award.title} — ${rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}` });
      });
      pushRank(rankings.first, 1); pushRank(rankings.second, 2); pushRank(rankings.third, 3);
      return;
    }

    // --- Winning Streak 5 & 10 (first 2 to achieve) ---
    if (award.calculation === "WINNING_STREAK") {
      const field = award.threshold === 5 ? 'streak5CompletedAt' : 'streak10CompletedAt';
      const winners = users
        .filter(u => u[field] !== null)
        .sort((a, b) => (a[field] as Date).getTime() - (b[field] as Date).getTime())
        .slice(0, 2);
      if (winners.length === 0) return;
      awardsList.push({ ...award, rankings: { first: winners.map(w => ({ ...w, score: award.threshold })), second: [], third: [] } });
      winners.forEach(w => addUserAward(w.id, { category: award.title, type: award.type, rank: 1, badge: award.badgePrefix, title: award.title }));
      return;
    }

    // --- Double Jeopardy (first 2 to achieve) ---
    if (award.calculation === "DOUBLE_JEOPARDY") {
      const winners = users
        .filter(u => u.doubleJeopardyCompletedAt !== null)
        .sort((a, b) => a.doubleJeopardyCompletedAt!.getTime() - b.doubleJeopardyCompletedAt!.getTime())
        .slice(0, 2);
      if (winners.length === 0) return;
      awardsList.push({ ...award, rankings: { first: winners.map(w => ({ ...w, score: 2 })), second: [], third: [] } });
      winners.forEach(w => addUserAward(w.id, { category: award.title, type: award.type, rank: 1, badge: award.badgePrefix, title: award.title }));
      return;
    }

    // --- Rising Star (one per transition) ---
    const risingStarMap: Record<string, any> = {
      RISING_STAR_R16: risingStarR16,
      RISING_STAR_QF:  risingStarQF,
      RISING_STAR_SF:  risingStarSF,
    };
    if (award.calculation in risingStarMap) {
      const winner = risingStarMap[award.calculation];
      if (!winner) return;
      awardsList.push({ ...award, rankings: { first: [{ ...winner, score: winner.bestRankJump }], second: [], third: [] } });
      addUserAward(winner.id, { category: award.title, type: award.type, rank: 1, badge: award.badgePrefix, title: award.title });
      return;
    }
  });

  return { awardsList, userAwards, teamAward };
}
