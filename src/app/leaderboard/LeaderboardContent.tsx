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
      <div
        key={user.userId}
        className={`flex items-center gap-3 px-4 py-3 border-b border-border/20 transition-colors ${
          isMe ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-white/5"
        }`}
      >
        <div className="w-10 shrink-0 flex items-center justify-center">
          {getRankBadge(idx)}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-base flex items-center gap-1.5 flex-wrap ${isMe ? "text-primary" : ""}`}>
            {isMe && <span className="text-sm">👤</span>}
            <span className="truncate">{user.name}</span>
            {isMe && (
              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold bg-primary/20 text-primary shrink-0">
                (You)
              </span>
            )}
          </div>
          <div className="text-muted-foreground text-xs flex items-center gap-1.5 mt-0.5">
            {user.flagUrl && <img src={user.flagUrl} alt="" className="w-4 h-3 rounded-sm object-cover shrink-0" />}
            <span className="truncate">{user.team}</span>
          </div>
          {badges && badges.some((a: any) => a.type === "stage") && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {badges.filter((a: any) => a.type === "stage").map((award: any, i: number) => (
                <span
                  key={i}
                  title={award.title}
                  className="cursor-default text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20"
                >
                  {award.badge}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span className="font-black text-xl">{user.points}</span>
          <span className="text-sm font-bold text-muted-foreground ml-1">pts</span>
        </div>
      </div>
    );
  };

  const renderTeamRow = (team: any, idx: number) => {
    const isMyTeam = team.id === currentUserTeamId;
    return (
      <div
        key={team.id}
        className={`flex items-center gap-3 px-4 py-3 border-b border-border/20 transition-colors ${
          isMyTeam ? "bg-accent/10 border-l-4 border-l-accent" : "hover:bg-white/5"
        }`}
      >
        <div className="w-10 shrink-0 flex items-center justify-center">
          {getRankBadge(idx)}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-base flex items-center gap-1.5 ${isMyTeam ? "text-accent" : ""}`}>
            {team.flagUrl && (
              <img src={team.flagUrl} alt="" className="w-6 h-4 rounded-sm object-cover shadow-sm shrink-0" />
            )}
            <span className="truncate">{team.name}</span>
            {isMyTeam && (
              <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase tracking-wider font-bold shrink-0">
                👥 Your Team
              </span>
            )}
          </div>
          <div className="text-muted-foreground text-xs mt-0.5">
            {team.usersCount} members · {team.totalPoints} pts total
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="font-black text-xl">{Math.round(team.avgPoints)}</span>
          <span className="text-sm font-bold text-muted-foreground ml-1">pts</span>
        </div>
      </div>
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
            {individualLeaderboard.length === 0
              ? <p className="p-8 text-center text-muted-foreground">No scores yet.</p>
              : individualLeaderboard.map((user: any, idx: number) => renderPlayerRow(user, idx, userAwards[user.userId]))
            }
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden border-border/50">
          <div className="bg-accent/5 border-b border-border/50 px-6 py-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-accent">🚩</span> Team Rankings
            </h2>
          </div>
          <CardContent className="p-0">
            {teamLeaderboard.length === 0
              ? <p className="p-8 text-center text-muted-foreground">No teams found.</p>
              : teamLeaderboard.map((team: any, idx: number) => renderTeamRow(team, idx))
            }
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isStageTab) {
    return (
      <Card className="glass-card overflow-hidden border-border/50 max-w-2xl mx-auto w-full">
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
            stageLeaderboard.map((user: any, idx: number) => renderPlayerRow(user, idx))
          )}
        </CardContent>
      </Card>
    );
  }

  if (tab === "teams") {
    return (
      <Card className="glass-card overflow-hidden border-border/50 max-w-2xl mx-auto w-full">
        <div className="bg-accent/5 border-b border-border/50 px-6 py-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-accent">🚩</span> Team Rankings
          </h2>
        </div>
        <CardContent className="p-0">
          {teamLeaderboard.length === 0
            ? <p className="p-8 text-center text-muted-foreground">No teams found.</p>
            : teamLeaderboard.map((team: any, idx: number) => renderTeamRow(team, idx))
          }
        </CardContent>
      </Card>
    );
  }

  return null;
}
