import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { getTournamentAwards } from "@/lib/cache/leaderboard";

export default async function AwardsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { awardsList, teamAward } = await getTournamentAwards();

  const overallAwards   = awardsList.filter(a => a.type === "overall");
  const milestoneAwards = awardsList.filter(a => a.type === "milestone");
  const streakAwards    = awardsList.filter(a => a.type === "streak");
  const comebackAwards  = awardsList.filter(a => a.type === "comeback");
  const stageAwards     = awardsList.filter(a => a.type === "stage");

  const getScoreDisplay = (award: any, w: any): string => {
    if (award.calculation?.startsWith("RISING_STAR")) return `#${w.rankBefore} → #${w.rankAfter} (+${w.score})`;
    if (award.calculation === "PENALTY_SHOOTER") return `${w.score} correct`;
    if (award.calculation === "WINNING_STREAK") return `${w.score}-win streak`;
    if (award.calculation === "DOUBLE_JEOPARDY") return "2 back-to-back";
    if (award.calculation === "ROUND_TOP")       return `${w.score} pts`;
    return `${w.score} pts`;
  };

  const getMatchDetail = (award: any, w: any): { home: string; away: string }[] | null => {
    if (award.calculation === "WINNING_STREAK")
      return award.threshold === 5 ? (w.streak5Matches ?? []) : (w.streak10Matches ?? []);
    if (award.calculation === "DOUBLE_JEOPARDY")
      return w.doubleJeopardyMatches ?? [];
    return null;
  };

  const PODIUM_LABELS: Record<number, { label: string; emoji: string }> = {
    1: { label: "Overall Champion",  emoji: "🥇" },
    2: { label: "Runner-up",         emoji: "🥈" },
    3: { label: "Second Runner-up",  emoji: "🥉" },
  };

  const renderAwardCard = (award: any, opts?: { firstLabel?: string; note?: string }) => (
    <Card key={award.key} className="glass-card relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
      <CardContent className="p-8">
        <p className="text-sm font-bold text-primary uppercase tracking-widest mb-4">{award.title}</p>
        {opts?.note && (
          <p className="text-xs text-muted-foreground italic mb-4">{opts.note}</p>
        )}
        <div className="space-y-6 relative z-10">
          {[
            { rankNum: 1, emoji: "🥇", label: opts?.firstLabel || "1st Place", winners: award.rankings.first },
            { rankNum: 2, emoji: "🥈", label: "2nd Place",                      winners: award.rankings.second },
            { rankNum: 3, emoji: "🥉", label: "3rd Place",                      winners: award.rankings.third },
          ].map((tier, i) =>
            tier.winners.length > 0 && (
              <div key={i}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{tier.emoji}</span>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{tier.label}</span>
                </div>
                <div className="space-y-3 border-l-2 border-primary/20 pl-4 ml-2">
                  {tier.winners.map((w: any) => {
                    const matches = getMatchDetail(award, w);
                    return (
                      <div key={w.id} className="flex flex-col gap-1">
                        <span className="font-black text-xl">{w.name}</span>
                        <span className="text-sm font-bold text-accent">{getScoreDisplay(award, w)}</span>
                        <span className="text-xs text-yellow-400 font-mono break-all">DBG calc={award.calculation} matches={JSON.stringify(matches)}</span>
                        {matches && matches.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {matches.map((m, i) => (
                              <span key={i} className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-muted-foreground font-medium">
                                {m.home} vs {m.away}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Special render for Overall Podium with custom rank labels
  const renderPodiumCard = (award: any) => (
    <Card key={award.key} className="glass-card relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
      <CardContent className="p-8">
        <p className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Main Leaderboard</p>
        <div className="space-y-6 relative z-10">
          {[
            { rankNum: 1, winners: award.rankings.first },
            { rankNum: 2, winners: award.rankings.second },
            { rankNum: 3, winners: award.rankings.third },
          ].map((tier, i) => {
            const meta = PODIUM_LABELS[tier.rankNum];
            return tier.winners.length > 0 && (
              <div key={i}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{meta.emoji}</span>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{meta.label}</span>
                </div>
                <div className="space-y-3 border-l-2 border-primary/20 pl-4 ml-2">
                  {tier.winners.map((w: any) => (
                    <div key={w.id} className="flex flex-col">
                      <span className="font-black text-xl">{w.name}</span>
                      <span className="text-sm font-bold text-accent">{w.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderSection = (title: string, icon: string, children: ReactNode) => (
    <section className="mt-12">
      <h2 className="text-2xl font-black mb-6 uppercase tracking-wider text-muted-foreground flex items-center gap-3 border-b border-border/50 pb-4">
        <span className="text-3xl">{icon}</span> {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </section>
  );

  const hasAnyAwards = awardsList.length > 0 || teamAward;

  return (
    <div className="container mx-auto py-12 px-4 relative z-10">
      <Header />

      <div className="mt-8 mb-12">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-sm">
          Tournament Awards
        </h1>
        <p className="text-muted-foreground mt-3 text-lg font-medium max-w-2xl">
          The Hall of Fame. Recognizing the top predictors, stage champions, and precision legends across the tournament.
        </p>
        <p className="text-xs text-muted-foreground mt-4 max-w-2xl italic">
          Note: Standard competition tie-breaking applies. If two players tie for 1st, both receive Gold and the next highest score receives Bronze (Silver is skipped).
        </p>
      </div>

      {!hasAnyAwards ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <span className="text-6xl mb-4 block">⏳</span>
            <h2 className="text-2xl font-bold mb-2">Awards Pending</h2>
            <p className="text-muted-foreground">The tournament awards have not been calculated yet. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* The Podiums */}
          {overallAwards.length > 0 && renderSection("The Podiums", "🏆", overallAwards.map(a => renderPodiumCard(a)))}

          {/* Round-by-Round Milestones */}
          {milestoneAwards.length > 0 && renderSection("Round-by-Round Milestones", "⚽",
            milestoneAwards.map(a =>
              renderAwardCard(a, {
                note: a.calculation === "PENALTY_SHOOTER"
                  ? "Most correct penalty shootout score predictions from R16 onwards."
                  : "Exclusive award — strictly the top scorer in this round (no shared winners).",
              })
            )
          )}

          {/* Team-Based Honors */}
          {teamAward && (
            <section className="mt-12">
              <h2 className="text-2xl font-black mb-6 uppercase tracking-wider text-muted-foreground flex items-center gap-3 border-b border-border/50 pb-4">
                <span className="text-3xl">🏆</span> Team-Based Honors
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card relative overflow-hidden group hover:border-accent/50 transition-colors">
                  <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-accent/5 rounded-full blur-3xl group-hover:bg-accent/10 transition-colors" />
                  <CardContent className="p-8 relative z-10">
                    <p className="text-sm font-bold text-accent uppercase tracking-widest mb-2">Top Winning Team</p>
                    <p className="text-xs text-muted-foreground italic mb-6">Ranked by average points per member (normalised).</p>
                    <div className="flex items-center gap-4 mb-6">
                      {teamAward.flagUrl && (
                        <img src={teamAward.flagUrl} alt="" className="w-12 h-8 rounded object-cover shadow-md" />
                      )}
                      <div>
                        <p className="text-3xl font-black">{teamAward.teamName}</p>
                        <p className="text-accent font-bold text-lg">{Math.round(teamAward.avgPoints)} avg pts · {teamAward.totalPoints} total</p>
                      </div>
                    </div>

                    <div className="border-t border-border/40 pt-4">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Team Members</p>
                      <div className="space-y-2">
                        {teamAward.members.map((m: any, i: number) => (
                          <div key={m.id} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span className="text-muted-foreground w-5 text-right text-xs">#{i + 1}</span>
                              <span className="font-semibold">{m.name}</span>
                            </span>
                            <span className="font-bold text-accent">{m.totalPoints} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}

          {/* Streak & Precision */}
          {streakAwards.length > 0 && renderSection("Streak & Precision Challenges", "✨",
            streakAwards.map(a =>
              renderAwardCard(a, {
                firstLabel: a.calculation === "DOUBLE_JEOPARDY" || a.calculation === "WINNING_STREAK"
                  ? "First 2 to Achieve"
                  : "1st Place",
                note: a.calculation === "DOUBLE_JEOPARDY"
                  ? "Two consecutive predictions with exact score AND exact max goals by a single player."
                  : `First 2 players to correctly predict ${a.threshold} consecutive match winners across the full tournament.`,
              })
            )
          )}

          {/* Comeback & Progression */}
          {comebackAwards.length > 0 && renderSection("Comeback & Progression", "⭐",
            comebackAwards.map(a =>
              renderAwardCard(a, {
                note: "Biggest leaderboard rank jump between any two consecutive rounds (R32→R16, R16→QF, QF→SF).",
              })
            )
          )}

          {/* Stage Winners */}
          {stageAwards.length > 0 && renderSection("Stage Winners", "🏅", stageAwards.map(a => renderAwardCard(a)))}
        </>
      )}
    </div>
  );
}
