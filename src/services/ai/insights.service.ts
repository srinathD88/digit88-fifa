import { prisma } from "@/lib/prisma";
import NodeCache from "node-cache";
import { AIProvider, AIInsightFact } from "./AIProvider";
import { HuggingFaceProvider } from "./HuggingFaceProvider";
import { FactCategory } from "@prisma/client";

// Cache for 30 mins
const cache = new NodeCache({ stdTTL: 1800 });

// Global rate limiting constants
const MAX_GLOBAL_REQUESTS_PER_DAY = 500;
const MAX_USER_REQUESTS_PER_HOUR = 10;
const AI_TIMEOUT_MS = 30000;

export class InsightsService {
  private provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider || new HuggingFaceProvider();
  }

  async getInsights(matchId: string, userId: string, refresh: boolean = false): Promise<AIInsightFact[]> {
    // 1. Check Rate Limits
    await this.checkRateLimits(userId);

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error("Match not found");

    const dbFactCount = await prisma.matchFact.count({ where: { matchId } });

    if (dbFactCount >= 20 && !refresh) {
      await this.logAnalytics(userId, matchId);
      return this.getRandomDbFacts(matchId, 4);
    }

    const context = {
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      date: match.startTime.toISOString(),
      status: match.status,
    };

    try {
      const start = Date.now();
      const facts = await this.withTimeout(this.provider.generateFacts(context), AI_TIMEOUT_MS);

      console.log(`[InsightsService] AI Time: ${Date.now() - start}ms`);

      await prisma.matchFact.createMany({
        data: facts.map(f => ({
          matchId,
          fact: f.fact,
          category: f.category,
        })),
        skipDuplicates: true
      });

      await this.logRequest(userId, matchId);
      await this.logAnalytics(userId, matchId);

      return facts;
    } catch (error: any) {
      console.log(`[InsightsService] AI Generation Exception: ${error.message}. Falling back to historical facts.`);
      return this.getRandomDbFacts(matchId, 4);
    }
  }

  private async checkRateLimits(userId: string) {
    // Check Global
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metric = await prisma.systemMetric.findUnique({ where: { key: "AI_REQUEST_COUNT" } });
    if (metric && metric.updatedAt >= today && metric.value >= MAX_GLOBAL_REQUESTS_PER_DAY) {
      throw new Error("Global AI Limit Reached");
    }

    // Check User
    const oneHourAgo = new Date(Date.now() - 3600000);
    const userCount = await prisma.factRequestLog.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo }
      }
    });

    if (userCount >= MAX_USER_REQUESTS_PER_HOUR) {
      throw new Error("Rate limit exceeded");
    }
  }

  private async logRequest(userId: string, matchId: string) {
    await prisma.factRequestLog.create({
      data: { userId, matchId }
    });

    await prisma.systemMetric.upsert({
      where: { key: "AI_REQUEST_COUNT" },
      update: { value: { increment: 1 }, updatedAt: new Date() },
      create: { key: "AI_REQUEST_COUNT", value: 1 }
    });
  }

  private async logAnalytics(userId: string, matchId: string) {
    await prisma.matchInsightEvent.create({
      data: { userId, matchId }
    });
  }

  private async getRandomDbFacts(matchId: string, limit: number): Promise<AIInsightFact[]> {
    const dbFacts = await prisma.matchFact.findMany({
      where: { matchId },
    });

    if (dbFacts.length > 0) {
      const shuffled = dbFacts.sort(() => 0.5 - Math.random()).slice(0, limit);
      return shuffled.map(f => ({ fact: f.fact, category: f.category }));
    }

    return [
      { fact: "Football is played by 250 million players in over 200 countries.", category: FactCategory.HISTORY },
      { fact: "The World Cup is the most prestigious association football tournament in the world.", category: FactCategory.RECORD },
      { fact: "Brazil is the most successful national team in World Cup history.", category: FactCategory.TEAM },
    ];
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("AI Generation Timeout")), ms)
      )
    ]);
  }
}
