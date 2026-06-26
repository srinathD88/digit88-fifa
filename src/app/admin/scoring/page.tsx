import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/SubmitButton";
import { updateScoringConfigAction, recalculateAllScoresAction } from "@/actions/admin";

export default async function ScoringPage() {
  const config = await prisma.scoringConfig.findUnique({ where: { id: 1 } });
  
  // Default values if no config exists yet
  const c = config || {
    winnerPoints: 10,
    exactScorePoints: 25,
    maxGoalsPoints: 5,
    perfectPredictionBonus: 20
  };

  const fields = [
    { name: "winnerPoints", label: "Match Winner", value: c.winnerPoints },
    { name: "exactScorePoints", label: "Exact Score", value: c.exactScorePoints },
    { name: "maxGoalsPoints", label: "Max Goals Match", value: c.maxGoalsPoints },
    { name: "perfectPredictionBonus", label: "Perfect Prediction Bonus", value: c.perfectPredictionBonus },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Scoring Configuration</h1>
          <p className="text-muted-foreground">Adjust points awarded for various prediction outcomes.</p>
        </div>
        
        <form action={recalculateAllScoresAction}>
          <SubmitButton type="submit" variant="outline" className="font-bold border-accent text-accent hover:bg-accent/10" loadingText="Recalculating...">
            🔄 Recalculate All Scores
          </SubmitButton>
        </form>
      </div>

      <Card className="glass-card max-w-3xl">
        <CardContent className="p-0">
          <form action={updateScoringConfigAction}>
            <table className="w-full text-left">
              <thead className="bg-secondary/20">
                <tr className="border-b border-border/40 text-sm text-muted-foreground">
                  <th className="p-4">Rule Name</th>
                  <th className="p-4">Points Value</th>
                </tr>
              </thead>
              <tbody>
                {fields.map(f => (
                  <tr key={f.name} className="border-b border-border/20">
                    <td className="p-4 font-bold font-mono text-sm tracking-wide text-white">{f.label}</td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        name={f.name}
                        defaultValue={f.value} 
                        className="bg-black/40 border border-border/50 rounded-lg px-3 py-2 w-24 text-accent font-black text-lg focus:outline-none focus:ring-2 focus:ring-primary" 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-6 flex justify-end gap-4 bg-secondary/10 rounded-b-xl border-t border-border/40">
              <SubmitButton type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold" loadingText="Saving...">Save Configuration</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
