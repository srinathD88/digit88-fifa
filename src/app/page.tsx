import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Header } from "@/components/Header";
import { MatchInsightsButton } from "@/components/MatchInsightsButton";
import { DailyHighlights } from "@/components/DailyHighlights";

import { Digit88Logo } from "@/components/Digit88Logo";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) {
    // If we have no session, we show a beautiful landing page with sign-in
    return (
      <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <Card className="glass-card w-[400px] p-8 text-center relative z-10">
          <CardHeader>
            <div className="flex justify-center mb-6">
              <Digit88Logo className="h-16 w-auto" />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mt-4">
              Predictor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-8 text-lg">Predict the world's greatest tournament.</p>
            <form action={async () => {
              "use server"
              const { signIn } = await import("@/auth");
              await signIn("google");
            }}>
              <Button type="submit" className="w-full text-lg h-12 shadow-[0_0_20px_rgba(200,50,200,0.3)] hover:shadow-[0_0_30px_rgba(200,50,200,0.5)] transition-shadow">
                Sign in with Google
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!(session.user as any).teamId) {
    redirect("/team-selection");
  }

  // Dashboard View
  const matches = await prisma.match.findMany({
    orderBy: { startTime: 'asc' },
    include: { homeTeam: true, awayTeam: true }
  });

  const userPredictions = await prisma.prediction.findMany({
    where: { userId: session.user!.id }
  });

  const predMap = userPredictions.reduce((acc, p) => {
    acc[p.matchId] = p;
    return acc;
  }, {} as Record<string, any>);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const todaysMatches = matches.filter(m => m.startTime >= todayStart && m.startTime < tomorrowStart);
  const upcomingMatches = matches.filter(m => m.startTime >= tomorrowStart);
  const completedMatches = matches.filter(m => m.status === 'FINISHED');

  const renderMatches = (matchList: typeof matches, allowPrediction: boolean = true) => {
    if (matchList.length === 0) {
      return (
        <div className="text-center py-20 text-muted-foreground glass-card rounded-2xl mt-6">
          <p className="text-xl">No matches found in this category.</p>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 mt-6">
        {matchList.map(match => {
          const prediction = predMap[match.id];
          const isLocked = new Date() >= match.startTime || match.status !== 'SCHEDULED';

          return (
            <Card key={match.id} className="glass-card transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(150,50,150,0.15)] flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xl">
                  <div className="flex items-center justify-end gap-2 text-right">
                    <span className="font-bold line-clamp-2 leading-tight">{match.homeTeamName}</span>
                    <img src={match.homeTeam?.flagUrl || undefined} alt="" className="w-8 h-6 rounded shadow-sm object-cover shrink-0" />
                  </div>
                  <span className="text-muted-foreground px-2 text-sm uppercase tracking-widest font-black shrink-0 text-center">vs</span>
                  <div className="flex items-center justify-start gap-2 text-left">
                    <img src={match.awayTeam?.flagUrl || undefined} alt="" className="w-8 h-6 rounded shadow-sm object-cover shrink-0" />
                    <span className="font-bold line-clamp-2 leading-tight">{match.awayTeamName}</span>
                  </div>
                </CardTitle>
                <p className="text-sm font-medium text-accent text-center pt-4">
                  {new Date(match.startTime).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-center px-4 py-3 bg-secondary/50 rounded-lg">
                    <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Status</span>
                    <span className={`font-bold ${match.status === 'IN_PLAY' ? 'text-accent animate-pulse' : 'text-primary'}`}>{match.status}</span>
                  </div>
                  
                  {match.status === 'FINISHED' && (
                    <div className="text-center py-2 bg-gradient-to-r from-transparent via-primary/20 to-transparent">
                      <p className="text-3xl font-black">{match.homeScore} - {match.awayScore}</p>
                    </div>
                  )}

                  {prediction ? (
                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl mt-2 relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                      <div>
                        <p className="text-xs text-primary uppercase font-bold tracking-widest mb-1">Your Prediction</p>
                        <p className="text-xl font-bold">{prediction.predictedHomeGoals} - {prediction.predictedAwayGoals}</p>
                      </div>
                      {isLocked ? (
                        prediction.pointsAwarded !== null && (
                          <p className="text-accent font-extrabold mt-2 text-lg">+{prediction.pointsAwarded} pts</p>
                        )
                      ) : (
                        <Link href={`/matches/${match.id}`} className="block mt-3">
                          <Button size="sm" className="w-full font-bold tracking-wider" variant="secondary">
                            Update Prediction
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    isLocked ? (
                      <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl mt-2 flex items-center justify-center h-[88px]">
                        <p className="text-sm font-medium">No prediction submitted.</p>
                      </div>
                    ) : allowPrediction ? (
                      <Link href={`/matches/${match.id}`} className="block mt-4">
                        <Button className="w-full h-12 text-md font-bold tracking-wider shadow-[0_0_15px_rgba(200,50,200,0.2)] hover:shadow-[0_0_25px_rgba(200,50,200,0.4)] transition-shadow">
                          ⚽ Submit Prediction
                        </Button>
                      </Link>
                    ) : (
                      <div className="bg-secondary/30 text-muted-foreground p-4 rounded-xl mt-2 flex items-center justify-center h-[88px]">
                        <p className="text-sm font-medium">Prediction opens on match day.</p>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <MatchInsightsButton matchId={match.id} />
                </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-12 px-4 relative z-10 overflow-hidden">
      <Header />
      
      <DailyHighlights userId={session.user?.id || ""} />

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-14 bg-black/40 border border-border/50 rounded-xl p-1">
          <TabsTrigger value="today" className="text-md font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Today's Matches</TabsTrigger>
          <TabsTrigger value="upcoming" className="text-md font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Upcoming</TabsTrigger>
          <TabsTrigger value="completed" className="text-md font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Completed</TabsTrigger>
          <TabsTrigger value="all" className="text-md font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All Matches</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          {renderMatches(todaysMatches, true)}
        </TabsContent>
        <TabsContent value="upcoming">
          {renderMatches(upcomingMatches, false)}
        </TabsContent>
        <TabsContent value="completed">
          {renderMatches(completedMatches, false)}
        </TabsContent>
        <TabsContent value="all">
          {renderMatches(matches, false)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
