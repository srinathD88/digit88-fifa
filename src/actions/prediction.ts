"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const predictionSchema = z.object({
  matchId: z.string().min(1),
  homeGoals: z.coerce.number().min(0).max(30),
  awayGoals: z.coerce.number().min(0).max(30),
  maxGoals: z.coerce.number().min(0).max(10),
});

export async function submitPrediction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const result = predictionSchema.safeParse({
    matchId: formData.get("matchId"),
    homeGoals: formData.get("homeGoals"),
    awayGoals: formData.get("awayGoals"),
    maxGoals: formData.get("maxGoals"),
  });

  if (!result.success) {
    throw new Error("Invalid prediction data");
  }

  const { matchId, homeGoals, awayGoals, maxGoals } = result.data;

  // Verify match is not locked
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Match not found");
  
  if (new Date() >= match.startTime || match.status !== 'SCHEDULED') {
    throw new Error("Match predictions are locked.");
  }

  const predictedWinner = (homeGoals > awayGoals ? match.homeTeamId : (homeGoals < awayGoals ? match.awayTeamId : "DRAW")) || "DRAW";

  await prisma.prediction.upsert({
    where: {
      userId_matchId: {
        userId: session.user.id,
        matchId: match.id,
      }
    },
    update: {
      predictedHomeGoals: homeGoals,
      predictedAwayGoals: awayGoals,
      predictedMaxGoals: maxGoals,
      predictedWinner,
    },
    create: {
      userId: session.user.id,
      matchId: match.id,
      predictedHomeGoals: homeGoals,
      predictedAwayGoals: awayGoals,
      predictedMaxGoals: maxGoals,
      predictedWinner,
    }
  });

  // Log action
  await prisma.auditLog.create({
    data: {
      action: "PREDICTION_SUBMITTED",
      userId: session.user.id,
      entityType: "MATCH",
      entityId: match.id,
      metadata: { homeGoals, awayGoals }
    }
  });

  revalidatePath("/");
  revalidatePath(`/matches/${match.id}`);
  redirect("/");
}
