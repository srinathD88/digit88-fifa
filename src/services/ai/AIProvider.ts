import { FactCategory } from "@prisma/client";

export interface AIInsightFact {
  fact: string;
  category: FactCategory;
}

export interface MatchContext {
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  status: string;
}

export interface AIProvider {
  generateFacts(context: MatchContext): Promise<AIInsightFact[]>;
}
