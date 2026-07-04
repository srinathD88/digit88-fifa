"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitPrediction } from "@/actions/prediction";
import { SubmitButton } from "@/components/SubmitButton";
import { stageLabel } from "@/lib/utils";
import Link from "next/link";

export function MatchPredictionForm({ match, prediction, isLocked }: any) {
  const [homeGoals, setHomeGoals] = useState<string>(prediction ? prediction.predictedHomeGoals.toString() : "");
  const [awayGoals, setAwayGoals] = useState<string>(prediction ? prediction.predictedAwayGoals.toString() : "");
  const [maxGoals, setMaxGoals] = useState<string>(prediction ? prediction.predictedMaxGoals?.toString() ?? "" : "");
  const [penaltyHomeGoals, setPenaltyHomeGoals] = useState<string>(
    prediction?.predictedPenaltyHomeScore != null ? prediction.predictedPenaltyHomeScore.toString() : ""
  );
  const [penaltyAwayGoals, setPenaltyAwayGoals] = useState<string>(
    prediction?.predictedPenaltyAwayScore != null ? prediction.predictedPenaltyAwayScore.toString() : ""
  );

  const hG = parseInt(homeGoals) || 0;
  const aG = parseInt(awayGoals) || 0;
  const isDraw = homeGoals !== "" && awayGoals !== "" && hG === aG;

  // Derived logic
  let winner = "DRAW";
  let winningGoals = hG;
  let losingGoals = aG;

  if (hG > aG) {
    winner = match.homeTeamName;
    winningGoals = hG;
    losingGoals = aG;
  } else if (aG > hG) {
    winner = match.awayTeamName;
    winningGoals = aG;
    losingGoals = hG;
  } else {
    winner = "DRAW";
    winningGoals = hG;
    losingGoals = aG;
  }

  return (
      <Card className="glass-card shadow-2xl overflow-hidden border-border/50">
        <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary background-animate" />
        
        {/* Match Header with Big Flags */}
        <div className="p-8 pb-4 text-center">
          <div className="flex items-center justify-center gap-12 mb-6">
            <div className="flex flex-col items-center gap-4">
              {match.homeTeam?.flagUrl ? (
                <img src={match.homeTeam.flagUrl || undefined} alt={match.homeTeamName} className="w-24 h-16 object-cover rounded-md shadow-lg" />
              ) : (
                <div className="w-24 h-16 bg-white/10 rounded-md flex items-center justify-center text-3xl">⚽</div>
              )}
              <h2 className="text-3xl font-black tracking-tight">{match.homeTeamName}</h2>
            </div>
            
            <div className="text-muted-foreground font-black text-2xl uppercase tracking-widest">VS</div>
            
            <div className="flex flex-col items-center gap-4">
              {match.awayTeam?.flagUrl ? (
                <img src={match.awayTeam.flagUrl || undefined} alt={match.awayTeamName} className="w-24 h-16 object-cover rounded-md shadow-lg" />
              ) : (
                <div className="w-24 h-16 bg-white/10 rounded-md flex items-center justify-center text-3xl">⚽</div>
              )}
              <h2 className="text-3xl font-black tracking-tight">{match.awayTeamName}</h2>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-muted-foreground bg-black/20 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <span>🏟️</span> {match.stadium?.name || "TBD"}
            </div>
            <div className="flex items-center gap-2">
              <span>📍</span> {match.stadium?.city || "TBD"}
            </div>
            <div className="flex items-center gap-2">
              <span>⏰</span> {new Date(match.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} IST
            </div>
            <div className="flex items-center gap-2 px-2 py-1 bg-primary/20 text-primary rounded text-xs font-bold uppercase">
              {stageLabel(match.stage)}
            </div>
          </div>
        </div>

        <CardContent className="pt-6">
          <form action={submitPrediction} className="space-y-10">
            <input type="hidden" name="matchId" value={match.id} />
            
            {/* Section 1: Predict Score */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold border-b border-border/50 pb-2">Section 1: Predict Score</h3>
              <div className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-6">
                
                <div className="flex items-center justify-between max-w-md mx-auto">
                  <Label htmlFor="homeGoals" className="text-2xl font-bold flex-1">{match.homeTeamName}</Label>
                  <Input 
                    id="homeGoals"
                    name="homeGoals"
                    type="number" 
                    min="0" 
                    max="30" 
                    required
                    disabled={isLocked}
                    value={homeGoals}
                    onChange={(e) => setHomeGoals(e.target.value)}
                    placeholder="0"
                    className="w-24 text-center text-3xl h-16 font-black bg-black/40 border-2 border-white/10 focus-visible:ring-primary focus-visible:border-primary shadow-inner rounded-xl placeholder:text-muted-foreground/30"
                  />
                </div>

                <div className="flex items-center justify-between max-w-md mx-auto">
                  <Label htmlFor="awayGoals" className="text-2xl font-bold flex-1">{match.awayTeamName}</Label>
                  <Input 
                    id="awayGoals"
                    name="awayGoals"
                    type="number" 
                    min="0" 
                    max="30" 
                    required
                    disabled={isLocked}
                    value={awayGoals}
                    onChange={(e) => setAwayGoals(e.target.value)}
                    placeholder="0"
                    className="w-24 text-center text-3xl h-16 font-black bg-black/40 border-2 border-white/10 focus-visible:ring-primary focus-visible:border-primary shadow-inner rounded-xl placeholder:text-muted-foreground/30"
                  />
                </div>
                
              </div>
            </div>

            {/* Section 2: Max Goals */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold border-b border-border/50 pb-2">Section 2: Max Goals By Single Player</h3>
              <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between max-w-md mx-auto">
                  <Label htmlFor="maxGoals" className="text-lg font-bold flex-1">Max Goals (Any Player)</Label>
                  <Input 
                    id="maxGoals"
                    name="maxGoals"
                    type="number" 
                    min="0" 
                    max="10" 
                    required
                    disabled={isLocked}
                    value={maxGoals}
                    onChange={(e) => setMaxGoals(e.target.value)}
                    placeholder="0"
                    className="w-24 text-center text-3xl h-16 font-black bg-black/40 border-2 border-white/10 focus-visible:ring-accent focus-visible:border-accent shadow-inner rounded-xl placeholder:text-muted-foreground/30"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Penalty Shootout — only visible when predicting a draw */}
            {isDraw && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold border-b border-amber-500/50 pb-2 text-amber-400">Section 3: Penalty Shootout Prediction</h3>
                <div className="bg-amber-500/5 p-6 rounded-2xl border border-amber-500/20 space-y-6">
                  <p className="text-sm text-amber-400/80 text-center font-medium">
                    You predicted a draw — predict the penalty shootout score now.
                  </p>
                  <div className="flex items-center justify-between max-w-md mx-auto">
                    <Label className="text-2xl font-bold flex-1">{match.homeTeamName}</Label>
                    <Input
                      name="penaltyHomeGoals"
                      type="number"
                      min="0"
                      max="20"
                      disabled={isLocked}
                      value={penaltyHomeGoals}
                      onChange={(e) => setPenaltyHomeGoals(e.target.value)}
                      placeholder="0"
                      className="w-24 text-center text-3xl h-16 font-black bg-black/40 border-2 border-amber-500/30 focus-visible:ring-amber-500 focus-visible:border-amber-500 shadow-inner rounded-xl placeholder:text-muted-foreground/30"
                    />
                  </div>
                  <div className="flex items-center justify-between max-w-md mx-auto">
                    <Label className="text-2xl font-bold flex-1">{match.awayTeamName}</Label>
                    <Input
                      name="penaltyAwayGoals"
                      type="number"
                      min="0"
                      max="20"
                      disabled={isLocked}
                      value={penaltyAwayGoals}
                      onChange={(e) => setPenaltyAwayGoals(e.target.value)}
                      placeholder="0"
                      className="w-24 text-center text-3xl h-16 font-black bg-black/40 border-2 border-amber-500/30 focus-visible:ring-amber-500 focus-visible:border-amber-500 shadow-inner rounded-xl placeholder:text-muted-foreground/30"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Read-only Derived */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold border-b border-border/50 pb-2 text-primary">Section 4: Derived Prediction</h3>
              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-2">Winner</p>
                    <p className="text-2xl font-black text-primary">{winner}</p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-2">Winning Goals</p>
                    <p className="text-2xl font-black text-white">{winningGoals}</p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-2">Losing Goals</p>
                    <p className="text-2xl font-black text-muted-foreground">{losingGoals}</p>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  This data will be automatically computed and used by the scoring engine based on your score prediction above.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <SubmitButton 
                disabled={isLocked} 
                className="w-full h-16 text-xl font-bold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300 shadow-[0_0_20px_rgba(200,50,200,0.3)] hover:shadow-[0_0_40px_rgba(200,50,200,0.6)] rounded-xl"
              >
                {isLocked ? "Predictions Locked" : "Save Prediction"}
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
  );
}
