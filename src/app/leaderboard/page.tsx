import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { getIndividualLeaderboard, getTeamLeaderboard } from "@/services/leaderboard.service";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  if (!(session.user as any).teamId) {
    redirect("/team-selection");
  }

  const individualLeaderboard = await getIndividualLeaderboard();
  const teamLeaderboard = await getTeamLeaderboard();

  return (
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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 text-left text-sm text-muted-foreground">
                    <th className="p-4 font-semibold">Rank</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Team</th>
                    <th className="p-4 font-semibold text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {individualLeaderboard.map((user, idx) => (
                    <tr key={user.userId} className="border-b border-border/20 hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-lg">{idx + 1}</td>
                      <td className="p-4 font-medium">{user.name}</td>
                      <td className="p-4 text-muted-foreground flex items-center gap-2">
                        {user.flagUrl && <img src={user.flagUrl} alt="" className="w-6 h-4 rounded-sm object-cover" />}
                        {user.team}
                      </td>
                      <td className="p-4 font-black text-right text-accent">{user.points}</td>
                    </tr>
                  ))}
                  {individualLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">No scores calculated yet.</td>
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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 text-left text-sm text-muted-foreground">
                    <th className="p-4 font-semibold">Rank</th>
                    <th className="p-4 font-semibold">Team</th>
                    <th className="p-4 font-semibold">Country</th>
                    <th className="p-4 font-semibold text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {teamLeaderboard.map((team, idx) => (
                    <tr key={team.id} className="border-b border-border/20 hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-lg">{idx + 1}</td>
                      <td className="p-4 font-medium text-lg flex items-center gap-3">
                        {team.flagUrl && <img src={team.flagUrl} alt="" className="w-8 h-6 rounded-sm object-cover shadow-sm" />}
                        {team.name}
                      </td>
                      <td className="p-4 text-muted-foreground">{team.country}</td>
                      <td className="p-4 font-black text-right text-accent text-xl">{team.totalPoints}</td>
                    </tr>
                  ))}
                  {teamLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">No teams found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
