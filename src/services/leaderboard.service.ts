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
      totalPoints
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
