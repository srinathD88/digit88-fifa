import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HeaderNav } from "@/components/HeaderNav";
import { Digit88Logo } from "@/components/Digit88Logo";
import { getUserLeaderboardStats } from "@/services/leaderboard.service";
import { getTournamentAwards } from "@/lib/cache/leaderboard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export async function Header() {
  const session = await auth();

  if (!session?.user?.id) return null;

  const isAdmin = (session.user as any).role === "ADMIN" || (session.user as any).role === "SUPER_ADMIN";

  const stats = await getUserLeaderboardStats(session.user.id);
  const teamName = stats?.team || "No Team";
  const points = stats?.points || 0;
  const rank = stats?.rank || "-";
  const flagUrl = stats?.flagUrl || null;

  const { userAwards } = await getTournamentAwards();
  const myAwards = userAwards[session.user.id] || [];
  
  const priority = { "overall": 1, "performance": 2, "stage": 3 };
  const sortedAwards = [...myAwards].sort((a, b) => priority[a.type as keyof typeof priority] - priority[b.type as keyof typeof priority]);
  const visibleAwards = sortedAwards;

  return (
    <TooltipProvider>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-border/40 pb-6 relative z-10 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 w-full md:w-auto justify-between sm:justify-start">
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Digit88Logo className="h-10 w-auto" />
        </Link>
        <HeaderNav isAdmin={isAdmin} />
      </div>
      
      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        <div className="text-left md:text-right flex flex-col items-start md:items-end gap-1">
          <p className="font-bold text-sm flex items-center">
            {flagUrl && <img src={flagUrl} alt={teamName} className="mr-2 w-5 h-3.5 rounded-sm object-cover shadow-sm" />}
            {session.user.name}
          </p>
          {rank === 1 && points > 1 ? (
            <div className="flex items-center text-[11px] uppercase tracking-wider font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
              <span className="mr-1 text-sm">👑</span> Leader
            </div>
          ) : (
            <div className="flex items-center text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              <span className="mr-1">🏆</span> Rank #{rank}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-accent">{points} pts</span>
            {teamName !== "No Team" && (
              <>
                <span className="text-muted-foreground opacity-50">•</span>
                <span className="text-[10px] text-muted-foreground uppercase">{teamName}</span>
              </>
            )}
          </div>
          {myAwards.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {visibleAwards.map((award: any, i: number) => {
                let bgColor = "bg-primary/20 text-primary border-primary/20";
                if (award.badge.includes("🥇") || award.badge.includes("🏆")) bgColor = "bg-amber-500/20 text-amber-500 border-amber-500/20";
                else if (award.badge.includes("🥈")) bgColor = "bg-slate-400/20 text-slate-300 border-slate-400/20";
                else if (award.badge.includes("🥉")) bgColor = "bg-amber-700/20 text-amber-600 border-amber-700/20";
                if (award.type === "performance" && award.badge.includes("🎯")) bgColor = "bg-emerald-500/20 text-emerald-500 border-emerald-500/20";
                if (award.type === "performance" && award.badge.includes("📈")) bgColor = "bg-blue-500/20 text-blue-500 border-blue-500/20";
                if (award.type === "stage") bgColor = "bg-purple-500/20 text-purple-400 border-purple-500/20";

                return (
                  <Tooltip key={i}>
                    <TooltipTrigger>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold cursor-default border ${bgColor}`}>
                        {award.badge}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {award.title}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
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
    </TooltipProvider>
  );
}
