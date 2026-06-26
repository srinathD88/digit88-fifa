import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const getHighlights = unstable_cache(
  async (limit = 10) => {
    return prisma.aIHighlight.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  },
  ["highlights"],
  {
    revalidate: 60,
    tags: ["highlights"],
  }
);
