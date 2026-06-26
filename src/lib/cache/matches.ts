import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const getMatches = unstable_cache(
  async () => {
    return prisma.match.findMany({
      orderBy: { startTime: 'asc' },
      include: { homeTeam: true, awayTeam: true }
    });
  },
  ["matches"],
  {
    revalidate: 60,
    tags: ["matches"],
  }
);

export const getMatchById = unstable_cache(
  async (id: string) => {
    return prisma.match.findUnique({
      where: { id },
      include: { homeTeam: true, awayTeam: true, stadium: true, matchFacts: true }
    });
  },
  ["match"], // will be unique when combined with id automatically by next? Actually it's better to pass it in args, but next.js unstable_cache uses the arguments automatically for the key.
  {
    revalidate: 60,
    tags: ["matches"],
  }
);
