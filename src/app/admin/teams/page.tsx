import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TeamStatusDropdown } from "./TeamStatusDropdown";

export default async function AdminTeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  const totalTeams = teams.length;
  const eliminatedTeams = teams.filter(t => t.isEliminated).length;
  const activeTeams = totalTeams - eliminatedTeams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Team Management</h1>
        <p className="text-muted-foreground">Manage tournament teams and their elimination status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Total Teams
              <span className="text-xl">⚽</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{totalTeams}</div>
          </CardContent>
        </Card>
        <Card className="glass-card bg-primary/5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider flex items-center justify-between">
              Active Teams
              <span>🏃</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-extrabold text-primary">{activeTeams}</div>
          </CardContent>
        </Card>
        <Card className="glass-card bg-red-500/5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-red-500 uppercase tracking-wider flex items-center justify-between">
              Eliminated
              <span>❌</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-extrabold text-red-500">{eliminatedTeams}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Teams</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/20">
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="p-4 font-semibold">Flag</th>
                  <th className="p-4 font-semibold">Team</th>
                  <th className="p-4 font-semibold text-center">Users</th>
                  <th className="p-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(team => (
                  <tr key={team.id} className={`border-b border-border/20 transition-colors hover:bg-white/5 ${team.isEliminated ? 'opacity-50' : ''}`}>
                    <td className="p-4">
                      {team.flagUrl ? (
                        <img src={team.flagUrl} alt={team.name} className="w-8 h-5 object-cover rounded shadow-sm" />
                      ) : (
                        <span className="text-xl">⚽</span>
                      )}
                    </td>
                    <td className="p-4 font-medium">{team.name}</td>
                    <td className="p-4 text-center font-bold text-accent">{team._count.users}</td>
                    <td className="p-4 text-right">
                      <TeamStatusDropdown teamId={team.id} isEliminated={team.isEliminated} />
                    </td>
                  </tr>
                ))}
                {teams.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No teams found. Run initial sync.</td>
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
