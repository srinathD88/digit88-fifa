import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default async function PredictionsDashboardPage() {
  // 1. Fetch Top Supported Teams
  const userTeams = await prisma.user.groupBy({
    by: ['teamId'],
    _count: { id: true },
    where: { teamId: { not: null } },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  });

  const teamIds = userTeams.map(t => t.teamId).filter(Boolean) as string[];
  const teamsData = await prisma.team.findMany({ where: { id: { in: teamIds } } });
  
  const topTeams = userTeams.map(ut => {
    const team = teamsData.find(t => t.id === ut.teamId);
    return {
      team,
      users: ut._count.id
    };
  });

  // 2. Fetch Matches with Predictions
  const matches = await prisma.match.findMany({
    where: { predictions: { some: {} } },
    include: { predictions: true, homeTeam: true, awayTeam: true },
    orderBy: { startTime: 'asc' }
  });

  const totalPredictions = matches.reduce((sum, m) => sum + m.predictions.length, 0);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          Prediction Analytics
        </h1>
        <p className="text-muted-foreground">Community sentiment and consensus across all active matches.</p>
      </div>

      {/* High Level Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-bold mb-1">Total Predictions</p>
            <p className="text-4xl font-black text-primary">{totalPredictions}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-bold mb-1">Matches with Predictions</p>
            <p className="text-4xl font-black text-accent">{matches.length}</p>
          </CardContent>
        </Card>
        
        {/* Top Supported Teams Widget */}
        <Card className="glass-card row-span-2 overflow-hidden flex flex-col">
          <CardHeader className="bg-white/5 border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-yellow-400">⭐</span> Top Supported Teams
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="divide-y divide-border/20">
              {topTeams.map((item, idx) => (
                <div key={item.team?.id || idx} className="flex justify-between items-center p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono font-bold w-4">{idx + 1}.</span>
                    {item.team?.flagUrl ? (
                      <img src={item.team.flagUrl} alt="flag" className="w-6 h-4 rounded-sm object-cover" />
                    ) : <span className="w-6 h-4 bg-white/10 rounded-sm"></span>}
                    <span className="font-bold">{item.team?.name}</span>
                  </div>
                  <span className="bg-primary/20 text-primary px-2 py-1 rounded-md text-xs font-bold">
                    {item.users} users
                  </span>
                </div>
              ))}
              {topTeams.length === 0 && (
                <div className="p-8 text-center text-muted-foreground italic">No users have selected a team yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-border/40 pb-2">Community Consensus</h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {matches.map(match => {
            const preds = match.predictions;
            const count = preds.length;
            
            // Averages
            const avgHome = (preds.reduce((sum, p) => sum + p.predictedHomeGoals, 0) / count).toFixed(1);
            const avgAway = (preds.reduce((sum, p) => sum + p.predictedAwayGoals, 0) / count).toFixed(1);
            const validMax = preds.filter(p => p.predictedMaxGoals !== null);
            const avgMax = validMax.length > 0 
              ? (validMax.reduce((sum, p) => sum + p.predictedMaxGoals!, 0) / validMax.length).toFixed(1) 
              : "N/A";

            // Outcome Splits
            let homeWins = 0; let awayWins = 0; let draws = 0;
            preds.forEach(p => {
              if (p.predictedHomeGoals > p.predictedAwayGoals) homeWins++;
              else if (p.predictedAwayGoals > p.predictedHomeGoals) awayWins++;
              else draws++;
            });

            const homePct = Math.round((homeWins / count) * 100);
            const awayPct = Math.round((awayWins / count) * 100);
            const drawPct = Math.round((draws / count) * 100);

            // Community Pick
            let pick = "Draw";
            let pickPct = drawPct;
            let pickFlag = null;
            if (homeWins > awayWins && homeWins > draws) {
              pick = `${match.homeTeamName} Win`;
              pickPct = homePct;
              pickFlag = match.homeTeam?.flagUrl;
            } else if (awayWins > homeWins && awayWins > draws) {
              pick = `${match.awayTeamName} Win`;
              pickPct = awayPct;
              pickFlag = match.awayTeam?.flagUrl;
            }

            // Most Predicted Score
            const scores: Record<string, number> = {};
            preds.forEach(p => {
              const s = `${p.predictedHomeGoals}-${p.predictedAwayGoals}`;
              scores[s] = (scores[s] || 0) + 1;
            });
            let maxScore = ""; let maxScoreCount = 0;
            Object.entries(scores).forEach(([score, c]) => {
              if (c > maxScoreCount) { maxScoreCount = c; maxScore = score; }
            });
            const maxScorePct = Math.round((maxScoreCount / count) * 100);

            return (
              <Card key={match.id} className="glass-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader className="bg-white/5 border-b border-border/20 p-4 pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-muted-foreground font-mono">
                      {format(match.startTime, "MMM d, HH:mm")}
                    </div>
                    <div className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground">
                      {count} {count === 1 ? 'Pick' : 'Picks'}
                    </div>
                  </div>
                  <CardTitle className="text-lg font-bold flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span>{match.homeTeamName}</span>
                      {match.homeTeam?.flagUrl && <img src={match.homeTeam.flagUrl} alt="" className="w-5 h-3.5 rounded-sm" />}
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="text-sm">vs</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{match.awayTeamName}</span>
                      {match.awayTeam?.flagUrl && <img src={match.awayTeam.flagUrl} alt="" className="w-5 h-3.5 rounded-sm" />}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col space-y-5">
                  
                  {/* Community Pick */}
                  <div className="text-center bg-secondary/30 p-3 rounded-lg border border-border/30">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Community Pick</p>
                    <div className="flex items-center justify-center gap-2">
                      {pickFlag && <img src={pickFlag} className="w-4 h-3 rounded-sm" alt="" />}
                      <span className="font-extrabold text-lg text-primary">{pick}</span>
                      <span className="text-sm font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        {pickPct}%
                      </span>
                    </div>
                  </div>

                  {/* Outcome Split */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1.5">
                      <span>{match.homeTeamName?.substring(0,3).toUpperCase()} {homePct}%</span>
                      <span>Draw {drawPct}%</span>
                      <span>{match.awayTeamName?.substring(0,3).toUpperCase()} {awayPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex">
                      <div style={{ width: `${homePct}%` }} className="bg-primary/80 h-full transition-all"></div>
                      <div style={{ width: `${drawPct}%` }} className="bg-accent/80 h-full transition-all"></div>
                      <div style={{ width: `${awayPct}%` }} className="bg-white/30 h-full transition-all"></div>
                    </div>
                  </div>

                  {/* Most Predicted Score */}
                  <div className="flex justify-between items-center pt-2 border-t border-border/20">
                    <span className="text-sm text-muted-foreground font-bold">Top Score</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{maxScore}</span>
                      <span className="text-xs bg-white/10 px-1.5 rounded text-muted-foreground">{maxScorePct}%</span>
                    </div>
                  </div>

                  {/* Averages */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Avg Score</p>
                      <p className="font-mono text-sm font-bold">{avgHome} - {avgAway}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Avg Max Gls</p>
                      <p className="font-mono text-sm font-bold">{avgMax}</p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
        {matches.length === 0 && (
          <div className="text-center p-12 glass-card">
            <p className="text-xl font-bold text-muted-foreground">No matches have predictions yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
