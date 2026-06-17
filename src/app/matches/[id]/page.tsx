import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitPrediction } from "@/actions/prediction";
import { MatchPredictionForm } from "./MatchPredictionForm";

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
    include: { homeTeam: true, awayTeam: true, stadium: true }
  });
  if (!match) return <div className="p-10 text-center text-xl text-muted-foreground">Match not found</div>;

  const prediction = session?.user?.id ? await prisma.prediction.findUnique({
    where: { userId_matchId: { userId: session.user.id, matchId } }
  }) : null;

  const isLocked = new Date() >= match.startTime || match.status !== 'SCHEDULED';

  return (
    <div className="container mx-auto py-12 px-4 relative z-10">
      <Header />
      <div className="max-w-3xl mx-auto">
        <MatchPredictionForm match={match} prediction={prediction} isLocked={isLocked} />
      </div>
    </div>
  );
}
