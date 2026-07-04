import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.scoringConfig.findUnique({ where: { id: 1 } });

  if (!existing) {
    console.log("No ScoringConfig row found — nothing to patch.");
    return;
  }

  const patch: Record<string, number> = {};

  if ((existing as any).nearMissClosePoints === 0)   patch.nearMissClosePoints   = 10;
  if ((existing as any).nearMissFarPoints   === 0)   patch.nearMissFarPoints     = 5;
  if ((existing as any).penaltyShootoutPoints === 0) patch.penaltyShootoutPoints = 30;
  if ((existing as any).penaltyPerfectBonus === 0)   patch.penaltyPerfectBonus   = 30;

  if (Object.keys(patch).length === 0) {
    console.log("ScoringConfig already has non-zero values — no patch needed.");
    return;
  }

  await prisma.scoringConfig.update({ where: { id: 1 }, data: patch });
  console.log("Patched ScoringConfig:", patch);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
