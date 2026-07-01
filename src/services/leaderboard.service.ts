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
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.perfectCount - a.perfectCount;
  });
}

export async function getTeamLeaderboard() {
  const individualScores = await getIndividualLeaderboard();
  
  const teams = await prisma.team.findMany();
  
  return teams.map(team => {
    const teamUsers = individualScores.filter(u => u.teamId === team.id);
    const totalPoints = teamUsers.reduce((sum, u) => sum + u.points, 0);
    return {
      id: team.id,
      name: team.name,
      country: team.country,
      flagUrl: team.flagUrl,
      totalPoints,
      usersCount: teamUsers.length
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);
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
  { key: "overall", title: "Overall Tournament", type: "overall", badgePrefix: "", calculation: "TOTAL_POINTS" },
  { key: "perfect", title: "Most Perfect Predictions", type: "performance", badgePrefix: "🎯", calculation: "MOST_PERFECT" },
  { key: "consistent", title: "Most Consistent Predictor", type: "performance", badgePrefix: "📈", calculation: "MOST_CONSISTENT" },
  { key: "stage_GROUP", title: "Group Stage", type: "stage", badgePrefix: "G", calculation: "STAGE_POINTS", stage: "GROUP" },
  { key: "stage_ROUND_OF_32", title: "Round of 32", type: "stage", badgePrefix: "R32", calculation: "STAGE_POINTS", stage: "ROUND_OF_32" },
  { key: "stage_ROUND_OF_16", title: "Round of 16", type: "stage", badgePrefix: "R16", calculation: "STAGE_POINTS", stage: "ROUND_OF_16" },
  { key: "stage_QUARTER_FINAL", title: "Quarter-final", type: "stage", badgePrefix: "QF", calculation: "STAGE_POINTS", stage: "QUARTER_FINAL" },
  { key: "stage_SEMI_FINAL", title: "Semi-final", type: "stage", badgePrefix: "SF", calculation: "STAGE_POINTS", stage: "SEMI_FINAL" },
  { key: "stage_FINAL", title: "Final", type: "stage", badgePrefix: "F", calculation: "STAGE_POINTS", stage: "FINAL" },
];

export async function _getTournamentAwards() {
  const usersData = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      bonusPoints: true,
      predictions: {
        select: {
          pointsAwarded: true,
          match: {
            select: {
              stage: true
            }
          }
        }
      }
    }
  });

  const users = usersData.map(u => {
    let totalPoints = u.bonusPoints;
    let perfectCount = 0;
    let consistentCount = 0;
    const stagePoints: Record<string, number> = {};

    u.predictions.forEach(p => {
      const pts = p.pointsAwarded || 0;
      totalPoints += pts;
      if (pts >= 55) perfectCount++;
      if (pts > 0) consistentCount++;
      
      const stage = p.match?.stage;
      if (stage) {
        stagePoints[stage] = (stagePoints[stage] || 0) + pts;
      }
    });

    return {
      id: u.id,
      name: u.name || "Unknown",
      totalPoints,
      perfectCount,
      consistentCount,
      stagePoints
    };
  });

  // Competition Ranking (1224)
  const getRankWinners1224 = (usersList: any[], metric: (u: any) => number) => {
    const sorted = [...usersList].sort((a, b) => metric(b) - metric(a) || a.name.localeCompare(b.name));
    
    const rankings = { first: [] as any[], second: [] as any[], third: [] as any[] };
    
    let currentScore = -1;
    let currentRank = 1;
    
    for (let i = 0; i < sorted.length; i++) {
      const score = metric(sorted[i]);
      if (score <= 0) break; // Don't award for 0 points
      
      if (currentScore === -1) {
        currentScore = score;
      } else if (score < currentScore) {
        currentScore = score;
        currentRank = i + 1; // 1-based index (1224 ranking)
      }
      
      if (currentRank === 1) rankings.first.push({ ...sorted[i], score });
      else if (currentRank === 2) rankings.second.push({ ...sorted[i], score });
      else if (currentRank === 3) rankings.third.push({ ...sorted[i], score });
      else if (currentRank > 3) break; // Only top 3 ranks
    }
    
    return rankings;
  };

  const awardsList: any[] = [];
  const userAwards: Record<string, any[]> = {};

  AWARD_CONFIG.forEach(award => {
    let metric: (u: any) => number;

    if (award.calculation === "TOTAL_POINTS") {
      metric = u => u.totalPoints;
    } else if (award.calculation === "MOST_PERFECT") {
      metric = u => u.perfectCount;
    } else if (award.calculation === "MOST_CONSISTENT") {
      metric = u => u.consistentCount;
    } else if (award.calculation === "STAGE_POINTS" && award.stage) {
      metric = u => u.stagePoints[award.stage as string] || 0;
    } else {
      return;
    }

    const rankings = getRankWinners1224(users, metric);

    if (rankings.first.length > 0) {
      awardsList.push({
        ...award,
        rankings
      });

      const pushToUserAwards = (rankGroup: any[], rank: number) => {
        rankGroup.forEach(w => {
          if (!userAwards[w.id]) userAwards[w.id] = [];
          
          let badge = "";
          let title = `${rank === 1 ? "1st Place" : rank === 2 ? "2nd Place" : "3rd Place"} - ${award.title}`;
          const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
          
          if (award.type === "overall") {
            badge = rank === 1 ? "🏆" : medal;
            if (rank === 1) title = "Tournament Champion";
            if (rank === 2) title = "Tournament Runner-up";
            if (rank === 3) title = "Tournament Third Place";
          } else {
            badge = `${award.badgePrefix}${award.type === "performance" ? ` ${medal}` : medal}`;
          }

          userAwards[w.id].push({
            category: award.title,
            type: award.type,
            rank,
            badge,
            title
          });
        });
      };

      pushToUserAwards(rankings.first, 1);
      pushToUserAwards(rankings.second, 2);
      pushToUserAwards(rankings.third, 3);
    }
  });

  return { awardsList, userAwards };
}
