import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ExportSummaryButton } from "./ExportSummaryButton";
import { getIndividualLeaderboard } from "@/services/leaderboard.service";
import { getTournamentAwards } from "@/lib/cache/leaderboard";
import { CopyButton } from "./CopyButton";

export const revalidate = 60; // Cache for 60 seconds

export default async function ReportsDashboardPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cutoffTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // rolling 24h
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Tournament Overview
  const allUsers = await prisma.user.findMany({ select: { id: true, name: true, email: true, teamId: true, bonusPoints: true } });
  const usersCount = allUsers.length;
  
  const allPredictions = await prisma.prediction.findMany({ select: { userId: true, matchId: true, pointsAwarded: true, createdAt: true } });
  const totalPredictions = allPredictions.length;

  const activeUserIds = new Set(allPredictions.map(p => p.userId));
  const activeUsersCount = activeUserIds.size;
  const participationRate = usersCount > 0 ? Math.round((activeUsersCount / usersCount) * 100) : 0;

  // 2. Today's Highlights
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { startTime: 'asc' }
  });

  const todaysMatches = matches.filter(m => new Date(m.startTime) >= todayStart && new Date(m.startTime) < cutoffTime);
  const todaysMatchIds = new Set(todaysMatches.map(m => m.id));
  
  const todaysPredictions = allPredictions.filter(p => p.createdAt >= todayStart);
  
  let mostPredictedMatchToday = null;
  let maxMatchPredsToday = 0;
  for (const match of todaysMatches) {
    const count = todaysPredictions.filter(p => p.matchId === match.id).length;
    if (count > maxMatchPredsToday) {
      maxMatchPredsToday = count;
      mostPredictedMatchToday = match;
    }
  }

  const teams = await prisma.team.findMany();
  let mostActiveTeamToday = null;
  let maxTeamPredsToday = 0;
  for (const team of teams) {
    const teamUserIds = new Set(allUsers.filter(u => u.teamId === team.id).map(u => u.id));
    const count = todaysPredictions.filter(p => teamUserIds.has(p.userId)).length;
    if (count > maxTeamPredsToday) {
      maxTeamPredsToday = count;
      mostActiveTeamToday = team;
    }
  }

  const predictionsForToday = todaysPredictions.filter(p => todaysMatchIds.has(p.matchId)).length;
  const maxPossiblePredictionsToday = todaysMatches.length * usersCount;
  const coveragePercent = maxPossiblePredictionsToday > 0 
    ? Math.round((predictionsForToday / maxPossiblePredictionsToday) * 100) 
    : 0;

  // 3. Upcoming Matches
  const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const upcomingMatches48h = matches.filter(m => m.status === 'SCHEDULED' && new Date(m.startTime) <= next48Hours);
  
  const missingPredictionsMap = upcomingMatches48h.map(match => {
    const matchPredictions = allPredictions.filter(p => p.matchId === match.id);
    const predictedUserIds = new Set(matchPredictions.map(p => p.userId));
    const missingUsers = allUsers.filter(u => !predictedUserIds.has(u.id));
    return {
      match,
      predictedCount: predictedUserIds.size,
      missingCount: missingUsers.length,
      missingUsers
    };
  });

  const allMissingNamesText = missingPredictionsMap.flatMap(m => m.missingUsers.map(u => u.name)).join(", ");
  const allMissingEmailsText = missingPredictionsMap.flatMap(m => m.missingUsers.map(u => u.email)).filter(Boolean).join(", ");

  // 4. Inactive Users
  const inactiveUsers = allUsers.filter(u => !activeUserIds.has(u.id));
  const inactiveNamesText = inactiveUsers.map(u => u.name).join(", ");
  const inactiveEmailsText = inactiveUsers.map(u => u.email).filter(Boolean).join(", ");

  // 5. Weekly Highlights
  const weeklyPredictions = allPredictions.filter(p => p.createdAt >= weekStart);
  const perfectWeekly = weeklyPredictions.filter(p => (p.pointsAwarded ?? 0) >= 35).length;
  const perfectYesterday = allPredictions.filter(p => p.createdAt >= new Date(todayStart.getTime() - 24 * 60 * 60 * 1000) && p.createdAt < todayStart && (p.pointsAwarded ?? 0) >= 35).length;
  
  // Weekly Scorers
  const weeklyUserPoints = new Map();
  for (const p of weeklyPredictions) {
    weeklyUserPoints.set(p.userId, (weeklyUserPoints.get(p.userId) || 0) + (p.pointsAwarded || 0));
  }
  let highestWeeklyScorer = { name: "N/A", points: 0 };
  let maxWeeklyPoints = 0;
  for (const [uid, pts] of weeklyUserPoints.entries()) {
    if (pts > maxWeeklyPoints) {
      maxWeeklyPoints = pts;
      const u = allUsers.find(x => x.id === uid);
      if (u) {
        highestWeeklyScorer = { name: u.name || "Unknown", points: pts };
      }
    }
  }

  // Biggest Upset
  const completedThisWeek = matches.filter(m => m.status === 'FINISHED' && new Date(m.startTime) >= weekStart);
  let biggestUpset = null;
  let lowestWinnerPercent = 100;
  
  for (const m of completedThisWeek) {
    const preds = allPredictions.filter(p => p.matchId === m.id);
    if (preds.length === 0) continue;
    const winnerCorrect = preds.filter(p => (p.pointsAwarded ?? 0) >= 10).length;
    const percent = Math.round((winnerCorrect / preds.length) * 100);
    if (percent < lowestWinnerPercent) {
      lowestWinnerPercent = percent;
      biggestUpset = { match: m, percent };
    }
  }

  // 6. Top Predictors
  const leaderboard = await getIndividualLeaderboard();
  const topPredictors = leaderboard.slice(0, 5);

  // 7. Tournament Awards
  const { awardsList } = await getTournamentAwards();

  // 8. Team Engagement
  const userPointsMap = new Map();
  allPredictions.forEach(stat => {
    userPointsMap.set(stat.userId, (userPointsMap.get(stat.userId) || 0) + (stat.pointsAwarded || 0));
  });

  const teamEngagement = teams.map(team => {
    const members = allUsers.filter(u => u.teamId === team.id);
    const activeMembers = members.filter(u => activeUserIds.has(u.id));
    const partPercent = members.length > 0 ? Math.round((activeMembers.length / members.length) * 100) : 0;
    
    let teamTotal = 0;
    members.forEach(u => {
      teamTotal += (userPointsMap.get(u.id) || 0) + u.bonusPoints;
    });

    return {
      team,
      members: members.length,
      activeMembers: activeMembers.length,
      participation: partPercent,
      points: teamTotal
    };
  }).sort((a, b) => b.points - a.points); // Default sort by points

  const maxPartPercent = teamEngagement.length > 0 ? Math.max(...teamEngagement.map(t => t.participation)) : 0;
  const maxTeamPoints = teamEngagement.length > 0 ? Math.max(...teamEngagement.map(t => t.points)) : 0;

  // 8. Generate Summary Text for Export
  const summaryText = `🏆 FIFA Prediction Update

👥 Participants: ${usersCount}
📈 Participation: ${participationRate}%

⚽ Today's Matches: ${todaysMatches.length}
📊 Prediction Coverage: ${coveragePercent}%

🥇 Leader:
${topPredictors[0]?.name || 'N/A'} (${topPredictors[0]?.points || 0} pts)

🏆 Leading Team:
${teamEngagement[0]?.team.name || 'N/A'}

🎯 Perfect Predictions Yesterday:
${perfectYesterday}

⏳ Users Pending Predictions:
${missingPredictionsMap.reduce((acc, curr) => acc + curr.missingCount, 0)}`;

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Operations Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor participation, analyze predictions, and run the tournament.</p>
        </div>
        <ExportSummaryButton summaryText={summaryText} />
      </div>

      {/* 1. Tournament Overview */}
      <section>
        <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Tournament Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card bg-primary/5">
            <CardContent className="p-6">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Registered</p>
              <p className="text-3xl font-black">{usersCount}</p>
              <p className="text-xs text-muted-foreground mt-2">Total Participants</p>
            </CardContent>
          </Card>
          <Card className="glass-card bg-accent/5">
            <CardContent className="p-6">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Active</p>
              <p className="text-3xl font-black text-accent">{activeUsersCount}</p>
              <p className="text-xs text-muted-foreground mt-2">Participants</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Participation</p>
              <p className="text-3xl font-black">{participationRate}%</p>
              <p className="text-xs text-muted-foreground mt-2">Overall Rate</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Predictions</p>
              <p className="text-3xl font-black">{totalPredictions}</p>
              <p className="text-xs text-muted-foreground mt-2">Submitted Total</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 1.5 Tournament Awards */}
      <section className="mt-10">
        <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">🏆 Tournament Awards</h2>
        
        <div className="space-y-4">
          {['overall', 'stage', 'performance'].map((categoryType) => {
            const categoryAwards = awardsList.filter(a => a.type === categoryType);
            if (categoryAwards.length === 0) return null;
            
            const title = categoryType === 'overall' ? "Overall Awards" : categoryType === 'stage' ? "Stage Awards" : "Performance Awards";
            
            return (
              <details key={categoryType} className="group glass-card rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden" open={categoryType === 'overall'}>
                <summary className="p-4 bg-white/5 cursor-pointer font-bold uppercase tracking-wider flex justify-between items-center outline-none select-none">
                  {title}
                  <span className="text-muted-foreground transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="p-6 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {categoryAwards.map(award => (
                    <div key={award.key}>
                      <h3 className="text-primary font-bold mb-4 uppercase text-sm tracking-widest">{award.title}</h3>
                      <div className="space-y-3 pl-4 border-l-2 border-border/30">
                        {[
                          { rank: '🥇', winners: award.rankings.first },
                          { rank: '🥈', winners: award.rankings.second },
                          { rank: '🥉', winners: award.rankings.third }
                        ].map((tier, i) => (
                          tier.winners.length > 0 && (
                            <div key={i} className="space-y-2">
                              {tier.winners.map((w: any) => (
                                <div key={w.id} className="flex gap-3 items-center">
                                  <span className="w-6 text-center text-lg">{tier.rank}</span>
                                  <div className="flex-1 flex justify-between items-center">
                                    <span className="font-bold text-sm">{w.name}</span>
                                    <span className="text-xs text-muted-foreground font-bold">
                                      <span className="text-accent text-sm mr-0.5">{w.score}</span>
                                      {award.key === 'mostPerfect' ? 'perf' : award.key === 'mostConsistent' ? 'preds' : 'pts'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* 2. Today's Highlights */}
      <section className="mt-10">
        <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Today's Highlights</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">🔥 Most Predicted Match</p>
              {mostPredictedMatchToday ? (
                <>
                  <p className="text-lg font-black">{mostPredictedMatchToday.homeTeamName} vs {mostPredictedMatchToday.awayTeamName}</p>
                  <p className="text-sm text-accent font-bold mt-1">{maxMatchPredsToday} predictions today</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">No predictions today.</p>
              )}
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">🏆 Most Active Team</p>
              {mostActiveTeamToday ? (
                <>
                  <p className="text-lg font-black">{mostActiveTeamToday.name}</p>
                  <p className="text-sm text-accent font-bold mt-1">{maxTeamPredsToday} predictions today</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">No active teams today.</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card relative overflow-hidden border-accent/20">
             <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
             <CardContent className="p-6">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">📊 Today's Coverage</p>
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-amber-300">{coveragePercent}%</span>
                  <div className="text-xs font-bold text-muted-foreground leading-tight">
                    {predictionsForToday} / {maxPossiblePredictionsToday} <br/>Possible Predictions
                  </div>
                </div>
             </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. Upcoming Matches */}
      <section>
        <div className="flex justify-between items-end mb-4 border-b border-border/50 pb-2">
          <h2 className="text-xl font-bold uppercase tracking-wider text-muted-foreground">Upcoming Matches (Next 48h)</h2>
          <div className="flex gap-2">
             <CopyButton textToCopy={allMissingNamesText} label="Copy All Names" />
             <CopyButton textToCopy={allMissingEmailsText} label="Copy All Emails" />
          </div>
        </div>
        <div className="space-y-4">
          {missingPredictionsMap.map(({ match, predictedCount, missingCount, missingUsers }) => {
            const coverage = Math.round((predictedCount / usersCount) * 100) || 0;
            const namesText = missingUsers.map(u => u.name).join(", ");
            const emailsText = missingUsers.map(u => u.email).filter(Boolean).join(", ");

            return (
              <Card key={match.id} className="glass-card border-l-4 border-l-primary">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold uppercase rounded">
                          {match.stage.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          Kickoff: {new Date(match.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h3 className="text-xl font-black">
                        {match.homeTeamName} vs {match.awayTeamName}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-8 bg-black/20 p-3 rounded-lg border border-white/5">
                      <div className="text-center">
                        <p className="text-2xl font-black text-green-400">{predictedCount}</p>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Submitted</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-red-400">{missingCount}</p>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Pending</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-accent">{coverage}%</p>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Coverage</p>
                      </div>
                    </div>
                  </div>

                  {missingCount > 0 && (
                    <details className="mt-4 pt-4 border-t border-white/5 group">
                      <summary className="text-sm font-bold text-primary cursor-pointer hover:text-primary/80 transition-colors list-none flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="group-open:rotate-90 transition-transform">▶</span> View Missing Users ({missingCount})
                        </div>
                        <div className="flex gap-2">
                           <CopyButton textToCopy={namesText} label="Copy Names" />
                           <CopyButton textToCopy={emailsText} label="Copy Emails" />
                        </div>
                      </summary>
                      <div className="mt-3 p-3 bg-black/40 rounded-lg max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {missingUsers.map(user => (
                            <div key={user.id} className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                              {user.name || 'Unknown User'}
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {missingPredictionsMap.length === 0 && (
            <p className="text-muted-foreground text-sm italic">No upcoming matches scheduled in the next 48 hours.</p>
          )}
        </div>
      </section>

      {/* 4. Inactive Users */}
      <section>
         <div className="flex justify-between items-end mb-4 border-b border-border/50 pb-2">
            <h2 className="text-xl font-bold uppercase tracking-wider text-muted-foreground">Inactive Users</h2>
            <div className="flex gap-2">
               <CopyButton textToCopy={inactiveNamesText} label="Copy Names" />
               <CopyButton textToCopy={inactiveEmailsText} label="Copy Emails" />
            </div>
         </div>
         <Card className="glass-card border-l-4 border-l-red-500/50">
            <CardContent className="p-4 md:p-6">
               <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                  <div>
                     <h3 className="text-xl font-black text-red-400">Never Predicted</h3>
                     <p className="text-sm text-muted-foreground">{inactiveUsers.length} Users have not submitted a single prediction.</p>
                  </div>
               </div>
               {inactiveUsers.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/20 p-4 rounded-lg border border-white/5">
                     {inactiveUsers.map(user => (
                        <div key={user.id} className="text-sm font-medium text-muted-foreground flex flex-col">
                           <span className="font-bold text-white">{user.name || 'Unknown User'}</span>
                           <span className="text-[10px] truncate">{user.email}</span>
                        </div>
                     ))}
                  </div>
               ) : (
                  <p className="text-sm text-green-400 font-bold">Everyone has submitted at least one prediction!</p>
               )}
            </CardContent>
         </Card>
      </section>

      {/* 5. Weekly Highlights */}
      <section>
        <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Weekly Highlights</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Predictions</p>
              <p className="text-3xl font-black">{weeklyPredictions.length}</p>
              <p className="text-xs text-muted-foreground mt-2">This Week</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Perfect Preds</p>
              <p className="text-3xl font-black text-primary">{perfectWeekly}</p>
              <p className="text-xs text-muted-foreground mt-2">This Week</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Biggest Upset</p>
              {biggestUpset ? (
                 <>
                  <p className="text-lg font-black leading-tight mt-1">{biggestUpset.match.homeTeamName} vs {biggestUpset.match.awayTeamName}</p>
                  <p className="text-xs text-accent mt-2 font-bold">Only {biggestUpset.percent}% correct winners</p>
                 </>
              ) : (
                 <p className="text-sm text-muted-foreground italic mt-2">No upsets calculated yet.</p>
              )}
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Highest Scorer</p>
              <p className="text-xl font-black mt-1 leading-tight truncate">{highestWeeklyScorer.name}</p>
              <p className="text-xs text-primary mt-2 font-bold">{highestWeeklyScorer.points} pts this week</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-10">
        {/* 6. Top Predictors */}
        <section>
          <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Top Predictors</h2>
          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {topPredictors.map((user, idx) => (
                  <div key={user.userId} className="flex justify-between items-center p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center font-black text-muted-foreground">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                      </div>
                      <span className="font-bold">{user.name}</span>
                    </div>
                    <span className="font-black text-primary">{user.points} pts</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 7. Team Engagement */}
        <section>
          <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Team Engagement</h2>
          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 border-b border-border/50 text-muted-foreground">
                       <tr>
                          <th className="p-3 font-semibold">Team</th>
                          <th className="p-3 font-semibold text-center">Members</th>
                          <th className="p-3 font-semibold text-center">Active</th>
                          <th className="p-3 font-semibold text-center">Participation</th>
                          <th className="p-3 font-semibold text-right">Points</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                       {teamEngagement.map(t => (
                          <tr key={t.team.id} className="hover:bg-white/5 transition-colors group">
                             <td className="p-3 font-bold flex items-center gap-2">
                                {t.team.flagUrl && <img src={t.team.flagUrl} alt="" className="w-4 h-3 rounded-sm object-cover" />}
                                {t.team.name}
                                {t.participation > 0 && t.participation === maxPartPercent && (
                                   <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded ml-1 uppercase font-bold" title="Highest Participation">🔥</span>
                                )}
                                {t.points > 0 && t.points === maxTeamPoints && (
                                   <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1 uppercase font-bold" title="Highest Score">🏆</span>
                                )}
                             </td>
                             <td className="p-3 text-center">{t.members}</td>
                             <td className="p-3 text-center">{t.activeMembers}</td>
                             <td className="p-3 text-center font-bold text-accent">{t.participation}%</td>
                             <td className="p-3 text-right font-black text-primary">{t.points}</td>
                          </tr>
                       ))}
                       {teamEngagement.length === 0 && (
                          <tr>
                             <td colSpan={5} className="p-4 text-center text-muted-foreground">No teams found.</td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>



      <footer className="mt-16 text-center text-sm text-muted-foreground border-t border-border/50 pt-8">
        <p>Awards calculated</p>
        <p className="font-bold">{now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
      </footer>

    </div>
  );
}
