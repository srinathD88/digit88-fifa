import { getHighlights } from "@/lib/cache/highlights";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HighlightsCarousel } from "./HighlightsCarousel";
import { prisma } from "@/lib/prisma";

export async function DailyHighlights({ userId }: { userId: string }) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let allHighlights = await getHighlights(50);
  let highlights = allHighlights.filter((h: any) => h.date >= todayStart);

  if (highlights.length === 0) return null;

  // Shuffle and pick 5
  highlights = highlights.sort(() => Math.random() - 0.5).slice(0, 5);

  // Track impressions without blocking the render
  if (userId) {
    Promise.all(highlights.map(h => 
      prisma.highlightView.upsert({
        where: { userId_highlightId: { userId, highlightId: h.id } },
        update: { viewedAt: new Date() },
        create: { userId, highlightId: h.id }
      })
    )).catch(e => console.error("Failed to log views", e));
  }

  const getEmoji = (type: string) => {
    switch (type) {
      case 'PLAYER': return '⭐';
      case 'TEAM': return '🏆';
      case 'VENUE': return '🏟';
      case 'MATCH': return '⚽';
      case 'RECAP': return '🌙';
      case 'DAILY': return '🌅';
      default: return '📊';
    }
  };

  const lastGenerated = highlights[0].createdAt;
  const hoursAgo = Math.floor((now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60));

  return (
    <div className="mb-10 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold tracking-tight">🔥 AI Highlights Today</h2>
        <span className="text-xs text-muted-foreground font-medium px-3 py-1 bg-secondary/50 rounded-full border border-border">
          Last Generated: {hoursAgo === 0 ? 'Just now' : `${hoursAgo} hours ago`}
        </span>
      </div>

      <HighlightsCarousel highlights={highlights} />
    </div>
  );
}
