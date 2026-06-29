import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/SubmitButton";
import { revalidatePath } from "next/cache";

async function selectTeam(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const teamId = formData.get("teamId") as string;
  if (!teamId) throw new Error("Team ID is required");

  // Verify the team exists and is not eliminated
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error("Invalid team selected");
  if (team.isEliminated) throw new Error("This team is no longer available.");

  // Assign team to user and set teamSelectedAt lock
  await prisma.user.update({
    where: { id: session.user.id },
    data: { 
      teamId,
      teamSelectedAt: new Date()
    }
  });

  revalidatePath("/");
  redirect("/");
}



export default async function TeamSelectionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  // If user already has a team, redirect them away (middleware also handles this, but double check)
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (dbUser?.teamId) {
    redirect("/");
  }

  const teams = await prisma.team.findMany({
    where: { isEliminated: false },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden py-12 px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 rounded-full blur-[150px] pointer-events-none" />
      
      <Card className="glass-card max-w-3xl w-full relative z-10 p-4 md:p-8">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent mb-4">
            Choose Your Team
          </CardTitle>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Before you can predict matches and earn points, you must select the team you support. 
            <strong className="block mt-2 text-white/90">This choice is final and cannot be changed.</strong>
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {teams.map(team => (
              <form key={team.id} action={selectTeam}>
                <input type="hidden" name="teamId" value={team.id} />
                <SubmitButton 
                  loadingText="Selecting..."
                  variant="outline" 
                  className="w-full h-auto py-4 px-2 flex flex-col items-center justify-center gap-2 hover:bg-white/10 hover:border-primary transition-all group"
                >
                  <div className="group-hover:scale-110 transition-transform flex items-center justify-center">
                    {team.flagUrl ? (
                      <img src={team.flagUrl || undefined} alt={team.name} className="w-12 h-8 object-cover rounded shadow-md" />
                    ) : (
                      <span className="text-3xl">⚽</span>
                    )}
                  </div>
                  <span className="font-bold text-center whitespace-normal mt-2">{team.name}</span>
                </SubmitButton>
              </form>
            ))}
            {teams.length === 0 && (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                No teams have been created in the database yet. Please contact an administrator.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
