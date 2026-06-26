import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HeaderNav } from "@/components/HeaderNav";
import { Digit88Logo } from "@/components/Digit88Logo";
import { getUserLeaderboardStats } from "@/services/leaderboard.service";

export async function Header() {
  const session = await auth();

  if (!session?.user?.id) return null;

  const isAdmin = (session.user as any).role === "ADMIN" || (session.user as any).role === "SUPER_ADMIN";

  const stats = await getUserLeaderboardStats(session.user.id);
  const teamName = stats?.team || "No Team";
  const points = stats?.points || 0;
  const rank = stats?.rank || "-";
  const flagUrl = stats?.flagUrl || null;

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-border/40 pb-6 relative z-10 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 w-full md:w-auto justify-between sm:justify-start">
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Digit88Logo className="h-10 w-auto" />
        </Link>
        <HeaderNav isAdmin={isAdmin} />
      </div>
      
      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        <div className="text-left md:text-right flex flex-col items-start md:items-end gap-0.5">
          <p className="font-bold text-sm flex items-center">
            {flagUrl && <img src={flagUrl} alt={teamName} className="mr-2 w-5 h-3.5 rounded-sm object-cover shadow-sm" />}
            {session.user.name}
          </p>
          <div className="flex items-center gap-2">
            {teamName !== "No Team" && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{teamName}</span>
            )}
            <div className="flex items-center text-xs font-black text-amber-500">
              <span className="mr-1">🏆</span> #{rank} • {points} pts
            </div>
          </div>
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
