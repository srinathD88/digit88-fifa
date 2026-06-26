import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMatchById } from "@/lib/cache/matches";
import { getMatchPredictions } from "@/lib/cache/users";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitPrediction } from "@/actions/prediction";
import { MatchPredictionForm } from "./MatchPredictionForm";
import Link from "next/link";

import { Header } from "@/components/Header";

export default async function MatchPredictionPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const matchId = params.id;
  const session = await auth();
  if (!session?.user) redirect("/");

  if (!(session.user as any).teamId) {
    redirect("/team-selection");
  }

  const [match, prediction] = await Promise.all([
    getMatchById(matchId),
    session?.user?.id ? prisma.prediction.findUnique({
      where: { userId_matchId: { userId: session.user.id, matchId } }
    }) : Promise.resolve(null)
  ]);

  if (!match) return <div className="p-10 text-center text-xl text-muted-foreground">Match not found</div>;

  const isLocked = new Date() >= new Date(new Date(match.startTime).getTime() - 5 * 60 * 1000) || match.status !== 'SCHEDULED';
  const hasFacts = match.matchFacts && match.matchFacts.length > 0;

  const allPredictions = match.status === 'FINISHED' ? await getMatchPredictions(matchId) : [];

  return (
    <div className="container mx-auto py-12 px-4 relative z-10">
      <Header />
      <div className={`mx-auto ${hasFacts ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="glass-card hover:bg-white/10 transition-colors">&larr; Back to Dashboard</Button>
          </Link>
        </div>
        <div className={`grid gap-8 ${hasFacts ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          <div className={`${hasFacts ? 'lg:col-span-2' : ''}`}>
            <MatchPredictionForm match={match} prediction={prediction} isLocked={isLocked} />
          </div>
          
          {hasFacts && (
            <div className="lg:col-span-1 space-y-6">
              <Card className="glass-card sticky top-24">
                <CardHeader className="bg-white/5 border-b border-border/20 pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                    <span className="text-2xl">🧠</span> Match Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/20 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {match.matchFacts.map((fact, idx) => (
                      <div key={fact.id || idx} className="p-4 hover:bg-white/5 transition-colors">
                        <span className="inline-block px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded uppercase tracking-wider mb-2">
                          {fact.category.replace('_', ' ')}
                        </span>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {fact.fact}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        
        {match.status === 'FINISHED' && allPredictions.length > 0 && (
          <div className="mt-12">
            <Card className="glass-card shadow-2xl">
              <CardHeader className="bg-white/5 border-b border-border/20 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                  <span className="text-2xl">🏆</span> Match Results & User Predictions
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Actual Score: <strong className="text-white">{match.homeScore} - {match.awayScore}</strong> &bull; 
                  Winner: <strong className="text-white">{match.winner}</strong> &bull; 
                  Max Goals (Player): <strong className="text-white">{match.actualMaxGoals ?? '-'}</strong>
                </p>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-black/20 text-muted-foreground uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Player</th>
                      <th className="px-4 py-3">Team</th>
                      <th className="px-4 py-3 text-center">Predicted Score</th>
                      <th className="px-4 py-3 text-center">Winner</th>
                      <th className="px-4 py-3 text-center">Max Goals</th>
                      <th className="px-4 py-3 text-right text-accent">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {allPredictions.map(p => (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4 font-bold flex items-center gap-2">
                          {p.user?.image ? (
                            <img src={p.user.image} className="w-6 h-6 rounded-full object-cover shadow-sm" alt="" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">👤</div>
                          )}
                          {p.user?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {p.user?.team?.flagUrl && <img src={p.user.team.flagUrl} className="w-4 h-3 rounded-sm object-cover shadow-sm" alt="" />}
                            <span className="text-xs font-bold text-muted-foreground uppercase">{p.user?.team?.name || 'None'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-bold">
                          {p.predictedHomeGoals} - {p.predictedAwayGoals}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="px-2 py-1 bg-black/40 border border-white/5 rounded text-xs font-bold">{p.predictedWinner}</span>
                        </td>
                        <td className="px-4 py-4 text-center font-bold">
                          {p.predictedMaxGoals ?? '-'}
                        </td>
                        <td className="px-4 py-4 text-right font-black text-accent text-lg">
                          +{p.pointsAwarded ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
