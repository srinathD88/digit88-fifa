import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/SubmitButton";
import { updateUserAction } from "@/actions/admin";
import { getIndividualLeaderboard } from "@/services/leaderboard.service";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: { team: true },
    orderBy: { createdAt: 'desc' }
  });

  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } });
  
  const leaderboard = await getIndividualLeaderboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Users Management</h1>
        <p className="text-muted-foreground">Manage user roles, teams, and total points.</p>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/20">
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="p-4">Name / Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Team</th>
                  <th className="p-4 w-32">Points</th>
                  <th className="p-4 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const formId = `form-${user.id}`;
                  const lbEntry = leaderboard.find(l => l.userId === user.id);
                  const totalPoints = lbEntry?.points || 0;

                  return (
                    <tr key={`${user.id}-${user.updatedAt.toISOString()}`} className="border-b border-border/20 hover:bg-white/5 transition-colors group">
                      <td className="p-4 align-middle">
                        {/* Hidden form for this row */}
                        <form id={formId} action={updateUserAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="isActive" value="true" />
                        </form>

                        <div className="font-bold text-base">{user.name || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="p-4 align-middle">
                        <select form={formId} name="role" defaultValue={user.role} className="bg-secondary/40 border border-border/50 rounded-lg px-3 h-10 text-sm font-bold w-full min-w-[130px] max-w-[150px] focus:ring-2 focus:ring-primary outline-none transition-colors group-hover:bg-secondary/80">
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      </td>
                      <td className="p-4 align-middle">
                        <select form={formId} name="teamId" defaultValue={user.teamId || ""} className="bg-secondary/40 border border-border/50 rounded-lg px-3 h-10 text-sm font-bold w-full min-w-[150px] max-w-[200px] focus:ring-2 focus:ring-primary outline-none transition-colors group-hover:bg-secondary/80">
                          <option value="">No Team</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>
                      <td className="p-4 align-middle">
                        <input 
                          form={formId}
                          type="number" 
                          name="points" 
                          defaultValue={totalPoints} 
                          className="bg-secondary/40 border border-border/50 rounded-lg px-3 h-10 w-full min-w-[80px] max-w-[100px] text-sm font-bold text-accent focus:ring-2 focus:ring-primary outline-none transition-colors group-hover:bg-secondary/80" 
                        />
                      </td>
                      <td className="p-4 align-middle">
                        <SubmitButton form={formId} type="submit" variant="default" className="h-10 px-4 font-bold tracking-wide w-full min-w-[100px]" loadingText="Saving...">Save</SubmitButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
