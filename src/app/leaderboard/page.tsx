import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import { getIndividualLeaderboard, getTeamLeaderboard, getTournamentAwards } from "@/lib/cache/leaderboard";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const currentUserTeamId = (session.user as any).teamId;
  const currentUserId = session.user.id;

  if (!currentUserTeamId) {
    redirect("/team-selection");
  }

  const [individualLeaderboard, teamLeaderboard, awardsData] = await Promise.all([
    getIndividualLeaderboard(),
    getTeamLeaderboard(),
    getTournamentAwards()
  ]);

  const userAwards = awardsData.userAwards;

  const currentUserData = individualLeaderboard.findIndex(u => u.userId === currentUserId);
  const myRank = currentUserData !== -1 ? currentUserData + 1 : null;
  const myStats = currentUserData !== -1 ? individualLeaderboard[currentUserData] : null;

  const getRankBadge = (idx: number) => {
    if (idx === 0) return <span className="text-amber-500 text-2xl drop-shadow-sm" title="1st Place">👑</span>;
    if (idx === 1) return <span className="text-gray-300 text-2xl drop-shadow-sm" title="2nd Place">🥈</span>;
    if (idx === 2) return <span className="text-amber-700 text-2xl drop-shadow-sm" title="3rd Place">🥉</span>;
    return <span className="text-muted-foreground font-bold">#{idx + 1}</span>;
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto py-12 px-4 relative z-10">
        <Header />

        <div className="grid gap-10 lg:grid-cols-2">
        {/* Individual Leaderboard */}
        <Card className="glass-card overflow-hidden border-border/50">
          <CardHeader className="bg-primary/5 border-b border-border/50">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <span className="text-primary">🏆</span> Individual Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full relative">
                <thead>
                <tr className="border-b border-border/40 text-left text-sm text-muted-foreground shadow-sm">
                  <th className="p-4 font-semibold">Rank</th>
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {individualLeaderboard.map((user, idx) => {
                  const isMe = user.userId === currentUserId;
                  return (
                    <tr 
                      key={user.userId} 
                      className={`border-b border-border/20 transition-colors ${
                        isMe ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="p-4 w-20">
                        <div className="flex items-center justify-center w-8">
                          {getRankBadge(idx)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className={`font-bold text-lg flex items-center gap-2 ${isMe ? 'text-primary' : ''}`}>
                            {isMe && <span className="text-base">👤</span>}
                            {user.name}
                            {isMe && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider ml-1 font-bold">(You)</span>}
                          </span>
                          <span className="text-muted-foreground text-xs flex items-center gap-1.5 mt-0.5 font-medium flex-wrap">
                            {user.flagUrl && <img src={user.flagUrl} alt="" className="w-4 h-3 rounded-sm object-cover" />}
                            {user.team}
                            {(() => {
                              const awards = userAwards[user.userId];
                              if (!awards || awards.length === 0) return null;
                              
                              const priority: Record<string, number> = { "overall": 1, "milestone": 2, "streak": 3, "comeback": 4, "performance": 5, "stage": 6 };
                              const sortedAwards = [...awards].sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));

                              const visibleAwards = sortedAwards;

                              const renderBadge = (award: any, i: number) => {
                                let bgColor = "bg-primary/20 text-primary border-primary/20";
                                if (award.badge.includes("🥇") || award.badge.includes("🏆")) bgColor = "bg-amber-500/20 text-amber-500 border-amber-500/20";
                                else if (award.badge.includes("🥈")) bgColor = "bg-slate-400/20 text-slate-300 border-slate-400/20";
                                else if (award.badge.includes("🥉")) bgColor = "bg-amber-700/20 text-amber-600 border-amber-700/20";
                                if (award.type === "performance" && award.badge.includes("🎯")) bgColor = "bg-emerald-500/20 text-emerald-500 border-emerald-500/20";
                                if (award.type === "performance" && award.badge.includes("📈")) bgColor = "bg-blue-500/20 text-blue-500 border-blue-500/20";
                                if (award.type === "stage")     bgColor = "bg-purple-500/20 text-purple-400 border-purple-500/20";
                                if (award.type === "milestone") bgColor = "bg-amber-500/20 text-amber-400 border-amber-500/20";
                                if (award.type === "streak")    bgColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";
                                if (award.type === "comeback")  bgColor = "bg-sky-500/20 text-sky-400 border-sky-500/20";
                                
                                return (
                                  <Tooltip key={i}>
                                    <TooltipTrigger>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold shadow-sm cursor-default border ${bgColor}`}>
                                        {award.badge}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {award.title}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              };
                              
                              return (
                                <span className="ml-1 flex items-center gap-1 flex-wrap">
                                  {visibleAwards.map((a, i) => renderBadge(a, i))}
                                </span>
                              );
                            })()}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-black text-right text-xl whitespace-nowrap">
                        {user.points} <span className="text-sm font-bold text-muted-foreground">pts</span>
                      </td>
                    </tr>
                  );
                })}
                {individualLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">No scores calculated yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>

        {/* Team Leaderboard */}
        <Card className="glass-card overflow-hidden border-border/50">
          <CardHeader className="bg-accent/5 border-b border-border/50">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <span className="text-accent">🚩</span> Team Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full relative">
                <thead>
                <tr className="border-b border-border/40 text-left text-sm text-muted-foreground shadow-sm">
                  <th className="p-4 font-semibold">Rank</th>
                  <th className="p-4 font-semibold">Team</th>
                  <th className="p-4 font-semibold text-right">Avg Points</th>
                </tr>
              </thead>
              <tbody>
                {teamLeaderboard.map((team, idx) => {
                  const isMyTeam = team.id === currentUserTeamId;
                  return (
                    <tr 
                      key={team.id} 
                      className={`border-b border-border/20 transition-colors ${
                        isMyTeam ? 'bg-accent/10 border-l-4 border-l-accent' : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="p-4 w-20">
                        <div className="flex items-center justify-center w-8">
                          {getRankBadge(idx)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                           <span className={`font-bold text-lg flex items-center gap-2 ${isMyTeam ? 'text-accent' : ''}`}>
                             {team.flagUrl && <img src={team.flagUrl} alt="" className="w-6 h-4 rounded-sm object-cover shadow-sm" />}
                             {team.name}
                             {isMyTeam && <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase tracking-wider ml-1 flex items-center gap-1 font-bold">👥 Your Team</span>}
                           </span>
                           <span className="text-muted-foreground text-xs font-normal mt-0.5">
                             {(team as any).usersCount || 0} members · {team.totalPoints} pts total
                           </span>
                        </div>
                      </td>
                      <td className="p-4 font-black text-right text-xl whitespace-nowrap">
                        {Math.round((team as any).avgPoints as number)} <span className="text-sm font-bold text-muted-foreground">pts</span>
                      </td>
                    </tr>
                  );
                })}
                {teamLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">No teams found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </TooltipProvider>
  );
}
