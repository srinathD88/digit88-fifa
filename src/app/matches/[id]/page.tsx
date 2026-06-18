import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

  const match = await prisma.match.findUnique({ 
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true, stadium: true, matchFacts: true }
  });
  if (!match) return <div className="p-10 text-center text-xl text-muted-foreground">Match not found</div>;

  const prediction = session?.user?.id ? await prisma.prediction.findUnique({
    where: { userId_matchId: { userId: session.user.id, matchId } }
  }) : null;

  const isLocked = new Date() >= match.startTime || match.status !== 'SCHEDULED';
  const hasFacts = match.matchFacts && match.matchFacts.length > 0;

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
      </div>
    </div>
  );
}
