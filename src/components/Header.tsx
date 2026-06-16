import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HeaderNav } from "@/components/HeaderNav";
import { Digit88Logo } from "@/components/Digit88Logo";

export async function Header() {
  const session = await auth();

  if (!session) return null;

  const isAdmin = (session.user as any).role === "ADMIN" || (session.user as any).role === "SUPER_ADMIN";

  let teamFlagUrl = null;
  if ((session.user as any).teamId) {
    const userTeam = await prisma.team.findUnique({ where: { id: (session.user as any).teamId } });
    if (userTeam) {
      teamFlagUrl = userTeam.flagUrl;
    }
  }

  return (
    <header className="flex justify-between items-center mb-10 border-b border-border/40 pb-6 relative z-10">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Digit88Logo className="h-10 w-auto" />
        </Link>
        <HeaderNav isAdmin={isAdmin} />
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right hidden md:block">
          <p className="font-medium text-sm text-muted-foreground flex items-center">
            {teamFlagUrl && <img src={teamFlagUrl} alt="Team" className="mr-2 w-6 h-4 rounded-sm object-cover" />}
            {session.user.name}
          </p>
        </div>
        <form action={async () => {
          "use server"
          const { signOut } = await import("@/auth");
          await signOut();
        }}>
          <Button variant="secondary" size="sm" type="submit" className="glass-card uppercase tracking-wider text-xs font-bold h-8">Sign Out</Button>
        </form>
      </div>
    </header>
  );
}
