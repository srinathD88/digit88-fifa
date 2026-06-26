import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const getUserPredictions = unstable_cache(
  async (userId: string) => {
    return prisma.prediction.findMany({
      where: { userId }
    });
  },
  ["user-predictions"],
  {
    revalidate: 60,
    tags: ["predictions"],
  }
);

export const getMatchPredictions = unstable_cache(
  async (matchId: string) => {
    return prisma.prediction.findMany({
      where: { matchId },
      include: { user: { include: { team: true } } },
      orderBy: { pointsAwarded: 'desc' }
    });
  },
  ["match-predictions"],
  {
    revalidate: 60,
    tags: ["predictions", "matches"],
  }
);
