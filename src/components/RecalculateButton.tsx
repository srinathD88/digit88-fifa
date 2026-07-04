"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recalculateAllScoresAction } from "@/actions/admin";

export function RecalculateButton({ unscoredCount }: { unscoredCount: number }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const run = (force: boolean) => {
    if (force) {
      const ok = window.confirm(
        "Force re-score ALL finished matches?\n\n" +
        "This rewrites every existing score. Scoring rules protect old matches from earning new points, " +
        "but the database values will be overwritten.\n\n" +
        "Only do this if you changed a scoring config value and need to back-fill."
      );
      if (!ok) return;
    }

    startTransition(async () => {
      await recalculateAllScoresAction(force);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="font-bold border-accent text-accent hover:bg-accent/10"
        disabled={isPending || unscoredCount === 0}
        onClick={() => run(false)}
      >
        {isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scoring…</>
        ) : done ? (
          "✓ Done"
        ) : (
          <>🔄 Score New ({unscoredCount})</>
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        disabled={isPending}
        onClick={() => run(true)}
        title="Force re-score all finished matches"
      >
        Force All
      </Button>
    </div>
  );
}
