import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export async function DailyHighlights({ userId }: { userId: string }) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let highlights = await prisma.aIHighlight.findMany({
    where: { date: todayStart }
  });

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

      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory custom-scrollbar px-1">
        {highlights.map((h, i) => (
          <Card key={h.id || i} className="glass-card min-w-[320px] max-w-[320px] shrink-0 snap-center flex flex-col justify-between hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(200,50,200,0.1)] border-accent/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-xl">{getEmoji(h.type)}</span>
                <span className="font-bold text-accent uppercase tracking-wider">{h.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground font-medium text-lg leading-snug">{h.content}</p>
            </CardContent>
          </Card>
        ))}
        {/* Spacer for right edge padding inside scroll area */}
        <div className="w-1 shrink-0"></div>
      </div>
    </div>
  );
}
