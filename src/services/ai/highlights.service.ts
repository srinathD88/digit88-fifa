import { InferenceClient } from "@huggingface/inference";
import { prisma } from "@/lib/prisma";
import { HighlightType, FactCategory } from "@prisma/client";

export async function generateDailyHighlightsService(adminId?: string) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  // Gather context
  const todayMatches = await prisma.match.findMany({
    where: { startTime: { gte: todayStart, lt: tomorrowStart } },
    select: { homeTeamName: true, awayTeamName: true, startTime: true, stage: true, stadium: { select: { name: true, city: true } } }
  });
  
  const upcomingMatches = await prisma.match.findMany({
    where: { startTime: { gte: tomorrowStart } },
    orderBy: { startTime: 'asc' },
    take: 5,
    select: { homeTeamName: true, awayTeamName: true, startTime: true, stage: true, stadium: { select: { name: true } } }
  });
  
  const recentResults = await prisma.match.findMany({
    where: { status: 'FINISHED' },
    orderBy: { startTime: 'desc' },
    take: 5,
    select: { homeTeamName: true, awayTeamName: true, homeScore: true, awayScore: true }
  });

  const prompt = `
You are a top-tier football expert generating 15 engaging, short highlights for a World Cup prediction portal.

Context:
Today's Matches: ${JSON.stringify(todayMatches)}
Upcoming Matches: ${JSON.stringify(upcomingMatches)}
Recent Results: ${JSON.stringify(recentResults)}
Tournament Stage: Group Stage

Requirements:
- Generate 15 distinct football highlights.
- Mix categories: TEAM, PLAYER, VENUE, MATCH, TOURNAMENT.
- Mix types: DAILY, MATCH, PLAYER, VENUE, RECAP.
- Keep content short (1-2 sentences max), highly interesting, and fact-based without speculation.
- Do not invent fake scores for future matches.

Output ONLY a raw JSON array matching this exact format, with absolutely no markdown code blocks:
[
  {
    "title": "String (e.g. 'Venue Spotlight', 'Player to Watch', 'Tactical Insight')",
    "content": "String",
    "category": "TEAM" | "PLAYER" | "VENUE" | "MATCH" | "TOURNAMENT",
    "type": "DAILY" | "MATCH" | "PLAYER" | "VENUE" | "RECAP"
  }
]
`;

  const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);
  const modelUsed = process.env.AI_MODEL || "meta-llama/Llama-3.1-8B-Instruct";
  const promptVersion = "v1-highlights";
  
  const result = await client.chatCompletion({
    model: modelUsed,
    provider: "novita",
    temperature: 0.8,
    messages: [{ role: "user", content: prompt }]
  });

  const content = result.choices[0]?.message?.content || "";
  let parsed = [];
  try {
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    parsed = JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error("Failed to parse highlights:", content);
    throw new Error("Failed to parse AI output");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Parsed highlights array is empty");
  }
  const categoryImages: Record<string, string[]> = {
    TEAM: ["football-01.svg", "football-02.svg"],
    PLAYER: ["player-01.svg", "player-02.svg"],
    VENUE: ["stadium-01.svg", "stadium-02.svg"],
    MATCH: ["pitch-01.svg", "tactical-01.svg"],
    TOURNAMENT: ["trophy-01.svg", "world-01.svg"]
  };

  const getImageForCategory = (category: string) => {
    const images = categoryImages[category] || categoryImages["TOURNAMENT"];
    return images[Math.floor(Math.random() * images.length)];
  };

  // Save to DB
  await prisma.aIHighlight.createMany({
    data: parsed.map((h: any) => {
      const category = h.category as FactCategory || FactCategory.TOURNAMENT;
      return {
        title: h.title || "Insight",
        content: h.content || "An exciting update from the tournament.",
        category,
        type: h.type as HighlightType || HighlightType.DAILY,
        date: todayStart,
        generatedBy: adminId ? `admin_${adminId}` : "cron",
        promptVersion,
        modelUsed,
        imageKey: getImageForCategory(category)
      };
    })
  });

  return parsed.length;
}
