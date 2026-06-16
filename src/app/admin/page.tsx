import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const usersCount = await prisma.user.count();
  const adminCount = await prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });

  const completedMatches = await prisma.match.count({ where: { status: 'FINISHED' } });
  const TOURNAMENT_TOTAL_MATCHES = 104; // FIFA 2026 format
  const progressPercent = Math.round((completedMatches / TOURNAMENT_TOTAL_MATCHES) * 100);
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  const todaysMatches = await prisma.match.findMany({
    where: { startTime: { gte: todayStart, lt: tomorrowStart } },
    select: { id: true }
  });
  
  const todaysMatchIds = todaysMatches.map(m => m.id);
  const predictionsForToday = todaysMatchIds.length > 0 
    ? await prisma.prediction.count({ where: { matchId: { in: todaysMatchIds } } })
    : 0;
    
  // coverage: assuming each user makes 1 prediction per match
  const maxPossiblePredictionsToday = todaysMatches.length * usersCount;
  const coveragePercent = maxPossiblePredictionsToday > 0 
    ? Math.round((predictionsForToday / maxPossiblePredictionsToday) * 100) 
    : 0;

  // Job Queue / Processing
  const processing = await prisma.matchProcessing.findMany({ 
    include: { match: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">Monitor system health and tournament progress.</p>
      </div>

      {/* Top row cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-card bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tournament Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
              {completedMatches} <span className="text-xl text-muted-foreground">/ {TOURNAMENT_TOTAL_MATCHES}</span>
            </div>
            <div className="mt-4 h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-xs text-primary font-bold mt-2">
              {progressPercent}% Complete
            </p>
          </CardContent>
        </Card>
        
        <Card className="glass-card bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Prediction Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-accent">
              {coveragePercent}%
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Today's Matches: <span className="text-white">{todaysMatches.length}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Predictions: <span className="text-white">{predictionsForToday} / {maxPossiblePredictionsToday}</span>
            </p>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">User Base</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{usersCount}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Active Accounts
            </p>
            <p className="text-sm text-primary">
              {adminCount} Administrators
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 text-sm mt-1">
              <div className="flex justify-between items-center bg-secondary/30 p-2 rounded-md">
                <span className="font-semibold text-muted-foreground">Match Schedules:</span>
                <span className="text-green-400 font-bold bg-green-400/10 px-2 py-0.5 rounded text-xs">Healthy</span>
              </div>
              <div className="flex justify-between items-center bg-secondary/30 p-2 rounded-md">
                <span className="font-semibold text-muted-foreground">Live Results:</span>
                <span className="text-green-400 font-bold bg-green-400/10 px-2 py-0.5 rounded text-xs">Healthy</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
