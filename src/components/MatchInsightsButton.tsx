"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Fact {
  fact: string;
  category: string;
}

export function MatchInsightsButton({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchInsights = async (refresh: boolean = false) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/matches/${matchId}/insights${refresh ? '?refresh=true' : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load insights");
      setFacts(data.facts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && facts.length === 0) {
      fetchInsights();
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "TEAM": return "🏆";
      case "PLAYER": return "⭐";
      case "VENUE": return "🏟";
      case "RECORD": return "📈";
      case "HISTORY": return "📚";
      case "AI_INSIGHT": return "📊";
      default: return "💡";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger className="text-accent hover:text-accent/80 p-2 h-8 text-sm hover:bg-accent/10 rounded-md transition-colors flex items-center justify-center font-medium" title="Match Insights">
        ⚽ Match Insights
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-[#0f0f13] border border-accent/40 shadow-2xl text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            AI Match Insights
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-muted-foreground animate-pulse font-medium">Analyzing millions of football data points...</p>
            </div>
          )}
          
          {error && !loading && (
            <div className="text-destructive p-4 bg-destructive/10 rounded-xl border border-destructive/20">
              <p className="font-semibold">{error}</p>
              <Button variant="outline" className="mt-4 w-full" onClick={fetchInsights}>Try Again</Button>
            </div>
          )}

          {!loading && !error && facts.length > 0 && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              {facts.map((f, i) => (
                <div key={i} className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3 hover:bg-white/5 transition-colors">
                  <span className="text-2xl">{getCategoryIcon(f.category)}</span>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold block mb-1">
                      {f.category.replace('_', ' ')}
                    </span>
                    <p className="text-sm leading-relaxed text-white/90 font-medium">{f.fact}</p>
                  </div>
                </div>
              ))}
              <div className="mt-6 text-center pt-2">
                <Button variant="ghost" size="sm" onClick={() => fetchInsights(true)} className="text-muted-foreground hover:text-primary transition-colors">
                  ↻ Generate Different Facts
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
