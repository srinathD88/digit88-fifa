import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { getTournamentAwards } from "@/lib/cache/leaderboard";

export default async function AwardsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { awardsList } = await getTournamentAwards();

  // Group awards into Overall, Performance, and Stage
  const overallAwards = awardsList.filter(a => a.type === "overall");
  const performanceAwards = awardsList.filter(a => a.type === "performance");
  const stageAwards = awardsList.filter(a => a.type === "stage");

  const renderAwardSection = (title: string, awards: any[], icon: string) => {
    if (awards.length === 0) return null;

    return (
      <section className="mt-12">
        <h2 className="text-2xl font-black mb-6 uppercase tracking-wider text-muted-foreground flex items-center gap-3 border-b border-border/50 pb-4">
          <span className="text-3xl">{icon}</span> {title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {awards.map(award => (
            <Card key={award.key} className="glass-card relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
              <CardContent className="p-8">
                <p className="text-sm font-bold text-primary uppercase tracking-widest mb-4">{award.title}</p>
                
                <div className="space-y-6 relative z-10">
                  {[
                    { rank: '🥇', label: '1st Place', winners: award.rankings.first },
                    { rank: '🥈', label: '2nd Place', winners: award.rankings.second },
                    { rank: '🥉', label: '3rd Place', winners: award.rankings.third }
                  ].map((tier, i) => (
                    tier.winners.length > 0 && (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{tier.rank}</span>
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{tier.label}</span>
                        </div>
                        <div className="space-y-3 border-l-2 border-primary/20 pl-4 ml-2">
                          {tier.winners.map((w: any) => (
                            <div key={w.id} className="flex flex-col">
                              <span className="font-black text-xl">{w.name}</span>
                              <span className="text-sm font-bold text-accent">
                                {w.score} {award.key === 'mostPerfect' ? 'perfects' : award.key === 'mostConsistent' ? 'preds' : 'pts'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>

                {award.description && (
                  <p className="text-xs text-muted-foreground mt-6 italic relative z-10">{award.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="container mx-auto py-12 px-4 relative z-10">
      <Header />

      <div className="mt-8 mb-12">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-sm">
          Tournament Awards
        </h1>
        <p className="text-muted-foreground mt-3 text-lg font-medium max-w-2xl">
          The Hall of Fame. Recognizing the top predictors, most consistent players, and stage champions across the tournament.
        </p>
        <p className="text-xs text-muted-foreground mt-4 max-w-2xl italic">
          Note: This tournament uses standard competition tie-breaking. If two players tie for 1st place, they both receive Gold and the next highest score receives Bronze (skipping Silver).
        </p>
      </div>

      {awardsList.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <span className="text-6xl mb-4 block">⏳</span>
            <h2 className="text-2xl font-bold mb-2">Awards Pending</h2>
            <p className="text-muted-foreground">The tournament awards have not been calculated yet. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {renderAwardSection("Overall Champions", overallAwards, "🏆")}
          {renderAwardSection("Performance Awards", performanceAwards, "🎯")}
          {renderAwardSection("Stage Winners", stageAwards, "⭐")}
        </>
      )}
    </div>
  );
}
