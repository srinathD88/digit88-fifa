import { prisma } from "@/lib/prisma";
import { MatchOperationsCenter } from "./MatchOperationsCenter";

export default async function AdminMatchesPage() {
  const matches = await prisma.match.findMany({
    include: {
      _count: {
        select: { predictions: true }
      }
    },
    orderBy: { startTime: 'asc' }
  });

  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } });
  const stadiums = await prisma.stadium.findMany({ orderBy: { name: 'asc' } });
  
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: 'MATCH' },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Operations Center</h1>
        <p className="text-muted-foreground">Manage tournament matches, monitor sync status, and override API data.</p>
      </div>

      <MatchOperationsCenter matches={matches} teams={teams} stadiums={stadiums} auditLogs={auditLogs} />
    </div>
  );
}
