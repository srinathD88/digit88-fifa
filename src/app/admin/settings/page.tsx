import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { syncTeamsAction, syncStadiumsAction, syncFixturesAction, generateHighlightsAction } from "@/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDistanceToNow, format } from "date-fns";

function getDuration(start: Date, end: Date | null) {
  if (!end) return "-";
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function SyncItem({ title, description, action, latestJob, buttonLabel }: any) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-4 bg-secondary/30 rounded-lg gap-4">
      <div className="flex-1">
        <span className="text-sm text-foreground font-semibold block mb-1">{title}</span>
        <span className="text-xs text-muted-foreground block mb-2">{description}</span>
        
        {latestJob && (
          <div className="text-[10px] space-y-1 mt-2 p-2 bg-black/20 rounded">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Sync:</span>
              <span className="font-mono">{format(latestJob.startedAt, "MMM d, HH:mm")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-bold ${latestJob.status === 'SUCCESS' ? 'text-green-400' : latestJob.status === 'FAILED' ? 'text-red-400' : 'text-yellow-400'}`}>
                {latestJob.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Imported:</span>
              <span className="font-mono text-accent">{latestJob.recordsProcessed}</span>
            </div>
            {latestJob.error && (
              <div className="text-red-400 mt-1 truncate max-w-xs" title={latestJob.error}>
                {latestJob.error}
              </div>
            )}
          </div>
        )}
        {!latestJob && (
          <div className="text-[10px] text-muted-foreground mt-2 italic">Never synced</div>
        )}
      </div>
      <form action={action} className="shrink-0">
        <SubmitButton type="submit" variant="default" className="bg-primary/20 text-primary px-4 h-9 rounded-lg text-sm font-bold hover:bg-primary hover:text-white transition-colors border border-primary/20 whitespace-nowrap" loadingText="Syncing...">
          {buttonLabel}
        </SubmitButton>
      </form>
    </div>
  );
}

export default async function SettingsPage() {
  const latestTeamsSync = await prisma.syncJob.findFirst({ where: { type: 'TEAMS' }, orderBy: { startedAt: 'desc' } });
  const latestStadiumsSync = await prisma.syncJob.findFirst({ where: { type: 'STADIUMS' }, orderBy: { startedAt: 'desc' } });
  const latestMatchesSync = await prisma.syncJob.findFirst({ where: { type: 'MATCHES' }, orderBy: { startedAt: 'desc' } });

  const recentLogs = await prisma.syncJob.findMany({
    orderBy: { startedAt: 'desc' },
    take: 10
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">System Settings</h1>
        <p className="text-muted-foreground">Manage data synchronization and AI triggers.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Data Sync Triggers */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Data Synchronization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SyncItem 
              title="Sync Teams" 
              description="Fetch the latest World Cup teams." 
              action={syncTeamsAction} 
              latestJob={latestTeamsSync} 
              buttonLabel="Sync Teams" 
            />
            <SyncItem 
              title="Sync Stadiums" 
              description="Fetch tournament venues." 
              action={syncStadiumsAction} 
              latestJob={latestStadiumsSync} 
              buttonLabel="Sync Stadiums" 
            />
            <SyncItem 
              title="Sync Matches" 
              description="Pull latest fixtures and results." 
              action={syncFixturesAction} 
              latestJob={latestMatchesSync} 
              buttonLabel="Sync Matches" 
            />
          </CardContent>
        </Card>

        {/* AI Content Management */}
        <Card className="glass-card h-fit">
          <CardHeader>
            <CardTitle>AI Content Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-4 bg-secondary/30 rounded-lg gap-4">
              <div>
                <span className="text-sm text-foreground font-semibold block mb-1">Daily Highlights</span>
                <span className="text-xs text-muted-foreground">Force regenerate today's highlights.</span>
              </div>
              <form action={generateHighlightsAction} className="shrink-0">
                <SubmitButton type="submit" variant="secondary" className="bg-accent/20 text-accent px-4 h-9 rounded-lg text-sm font-bold hover:bg-accent hover:text-black transition-colors border border-accent/20" loadingText="Running...">
                  Regenerate
                </SubmitButton>
              </form>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-4 bg-secondary/30 rounded-lg gap-4">
              <div>
                <span className="text-sm text-foreground font-semibold block mb-1">Recalculate Scores</span>
                <span className="text-xs text-muted-foreground">Queue all finished matches for score recalculation.</span>
              </div>
              <form action={async () => {
                "use server";
                const { recalculateAllScoresAction } = await import("@/actions/admin");
                await recalculateAllScoresAction();
              }} className="shrink-0">
                <SubmitButton type="submit" variant="default" className="bg-primary/20 text-primary px-4 h-9 rounded-lg text-sm font-bold hover:bg-primary hover:text-white transition-colors border border-primary/20" loadingText="Queueing...">
                  Recalculate
                </SubmitButton>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Sync Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/20">
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map(log => (
                  <tr key={log.id} className="border-b border-border/20 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-xs">{format(log.startedAt, "MMM d, HH:mm:ss")}</td>
                    <td className="p-4 font-bold">Sync {log.type.toLowerCase()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.status === 'SUCCESS' ? 'bg-green-500/20 text-green-400' :
                        log.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{getDuration(log.startedAt, log.completedAt)}</td>
                  </tr>
                ))}
                {recentLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">No sync jobs recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
