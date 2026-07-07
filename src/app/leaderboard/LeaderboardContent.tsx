import { Card, CardContent } from "@/components/ui/card";
import {
  getIndividualLeaderboard,
  getTeamLeaderboard,
  getStageLeaderboard,
  getTournamentAwards,
} from "@/lib/cache/leaderboard";

const TAB_STAGE: Record<string, string> = {
  r32: "ROUND_OF_32",
  r16: "ROUND_OF_16",
  qf:  "QUARTER_FINAL",
  sf:  "SEMI_FINAL",
};

const TAB_LABEL: Record<string, string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf:  "Quarter-finals",
  sf:  "Semi-finals",
};

export default async function LeaderboardContent({
  tab,
  currentUserId,
  currentUserTeamId,
}: {
  tab: string;
  currentUserId: string;
  currentUserTeamId: string;
}) {
  const isStageTab = tab in TAB_STAGE;

  const [individualLeaderboard, teamLeaderboard, stageLeaderboard, awardsData] = await Promise.all([
    tab === "alltime" ? getIndividualLeaderboard() : Promise.resolve([]),
    tab === "alltime" || tab === "teams" ? getTeamLeaderboard() : Promise.resolve([]),
    isStageTab ? getStageLeaderboard(TAB_STAGE[tab]) : Promise.resolve([]),
    tab === "alltime"
      ? getTournamentAwards()
      : Promise.resolve({ awardsList: [], userAwards: {} as Record<string, any[]>, teamAward: null }),
  ]);
  const userAwards: Record<string, any[]> = (awardsData as any).userAwards ?? {};

  const getRankBadge = (idx: number) => {
    if (idx === 0) return <span className="text-amber-500 text-2xl drop-shadow-sm">👑</span>;
    if (idx === 1) return <span className="text-gray-300 text-2xl drop-shadow-sm">🥈</span>;
    if (idx === 2) return <span className="text-amber-700 text-2xl drop-shadow-sm">🥉</span>;
    return <span className="text-muted-foreground font-bold text-sm">#{idx + 1}</span>;
  };

  const renderPlayerRow = (user: any, idx: number, badges?: any[]) => {
    const isMe = user.userId === currentUserId;
    return (
      <tr
        key={user.userId}
        className={`border-b border-border/20 transition-colors ${
          isMe ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-white/5"
        }`}
      >
        <td className="p-4 w-16">
          <div className="flex items-center justify-center w-8">{getRankBadge(idx)}</div>
        </td>
        <td className="p-4">
          <div className="flex flex-col">
            <span className={`font-bold text-lg flex items-center gap-2 ${isMe ? "text-primary" : ""}`}>
              {isMe && <span className="text-base">👤</span>}
              {user.name}
              {isMe && (
                <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ml-1 font-bold bg-primary/20 text-primary">
                  (You)
                </span>
              )}
            </span>
            <span className="text-muted-foreground text-xs flex items-center gap-1.5 mt-0.5">
              {user.flagUrl && <img src={user.flagUrl} alt="" className="w-4 h-3 rounded-sm object-cover" />}
              {user.team}
            </span>
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {badges.map((award: any, i: number) => (
                  <span
                    key={i}
                    title={award.title}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20"
                  >
                    {award.badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        </td>
        <td className="p-4 font-black text-right text-xl whitespace-nowrap">
          {user.points} <span className="text-sm font-bold text-muted-foreground">pts</span>
        </td>
      </tr>
    );
  };

  const renderTeamRow = (team: any, idx: number) => {
    const isMyTeam = team.id === currentUserTeamId;
    return (
      <tr
        key={team.id}
        className={`border-b border-border/20 transition-colors ${
          isMyTeam ? "bg-accent/10 border-l-4 border-l-accent" : "hover:bg-white/5"
        }`}
      >
        <td className="p-4 w-16">
          <div className="flex items-center justify-center w-8">{getRankBadge(idx)}</div>
        </td>
        <td className="p-4">
          <div className="flex flex-col">
            <span className={`font-bold text-lg flex items-center gap-2 ${isMyTeam ? "text-accent" : ""}`}>
              {team.flagUrl && <img src={team.flagUrl} alt="" className="w-6 h-4 rounded-sm object-cover shadow-sm" />}
              {team.name}
              {isMyTeam && (
                <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase tracking-wider ml-1 font-bold">
                  👥 Your Team
                </span>
              )}
            </span>
            <span className="text-muted-foreground text-xs mt-0.5">
              {team.usersCount} members · {team.totalPoints} pts total
            </span>
          </div>
        </td>
        <td className="p-4 font-black text-right text-xl whitespace-nowrap">
          {Math.round(team.avgPoints)} <span className="text-sm font-bold text-muted-foreground">pts</span>
        </td>
      </tr>
    );
  };

  if (tab === "alltime") {
    return (
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="glass-card overflow-hidden border-border/50">
          <div className="bg-primary/5 border-b border-border/50 px-6 py-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-primary">🏆</span> Individual Rankings
            </h2>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 text-left text-sm text-muted-foreground">
                    <th className="p-4 font-semibold w-16">Rank</th>
                    <th className="p-4 font-semibold">Player</th>
                    <th className="p-4 font-semibold text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {individualLeaderboard.map((user, idx) =>
                    renderPlayerRow(user, idx, userAwards[user.userId])
                  )}
                  {individualLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-muted-foreground">No scores yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden border-border/50">
          <div className="bg-accent/5 border-b border-border/50 px-6 py-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-accent">🚩</span> Team Rankings
            </h2>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 text-left text-sm text-muted-foreground">
                    <th className="p-4 font-semibold w-16">Rank</th>
                    <th className="p-4 font-semibold">Team</th>
                    <th className="p-4 font-semibold text-right">Avg pts</th>
                  </tr>
                </thead>
                <tbody>
                  {teamLeaderboard.map((team, idx) => renderTeamRow(team, idx))}
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
    );
  }

  if (isStageTab) {
    return (
      <Card className="glass-card overflow-hidden border-border/50">
        <div className="bg-primary/5 border-b border-border/50 px-6 py-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-primary">⚽</span> {TAB_LABEL[tab]} Rankings
          </h2>
        </div>
        <CardContent className="p-0">
          {stageLeaderboard.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <p className="text-5xl">⏳</p>
              <p className="font-bold text-lg">Round not started yet</p>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Keep predicting and you can get on this leaderboard.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 text-left text-sm text-muted-foreground">
                    <th className="p-4 font-semibold w-16">Rank</th>
                    <th className="p-4 font-semibold">Player</th>
                    <th className="p-4 font-semibold text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {stageLeaderboard.map((user, idx) => renderPlayerRow(user, idx))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (tab === "teams") {
    return (
      <Card className="glass-card overflow-hidden border-border/50">
        <div className="bg-accent/5 border-b border-border/50 px-6 py-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-accent">🚩</span> Team Rankings
          </h2>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 text-left text-sm text-muted-foreground">
                  <th className="p-4 font-semibold w-16">Rank</th>
                  <th className="p-4 font-semibold">Team</th>
                  <th className="p-4 font-semibold text-right">Avg pts</th>
                </tr>
              </thead>
              <tbody>
                {teamLeaderboard.map((team, idx) => renderTeamRow(team, idx))}
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
    );
  }

  return null;
}
