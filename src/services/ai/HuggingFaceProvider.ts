import { InferenceClient } from "@huggingface/inference";
import { AIInsightFact, AIProvider, MatchContext } from "./AIProvider";
import { FactCategory } from "@prisma/client";

export class HuggingFaceProvider implements AIProvider {
  private client: InferenceClient;

  constructor() {
    this.client = new InferenceClient(
      process.env.HUGGINGFACE_API_KEY
    );
  }

  async generateFacts(context: MatchContext): Promise<AIInsightFact[]> {
    const prompt = `
You are a football analyst.

Generate exactly 4 interesting and different facts.

Match Context:
- Home Team: ${context.homeTeamName}
- Away Team: ${context.awayTeamName}
- Date: ${context.date}
- Status: ${context.status}

Requirements:
- Short facts
- Maximum 2 sentences each
- Provide specific insights for the current match, standout players, the venue, and previous records/history of these teams and their key players.
- IMPORTANT: Only use well-known football facts. Do not invent statistics, player records, or match outcomes. If uncertain, omit.

Output ONLY a raw JSON array matching this exact format, with no markdown code blocks and no extra text:
[
  {
    "fact": "String",
    "category": "TEAM" | "PLAYER" | "HISTORY" | "RECORD" | "AI_INSIGHT"
  }
]
    `;

    const result = await this.client.chatCompletion({
      model: process.env.AI_MODEL || "meta-llama/Llama-3.1-8B-Instruct",
      provider: "novita", // Explicitly set provider to avoid routing delays
      temperature: 0.7, // Ensures we don't get the exact same facts every time
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const content = result.choices[0]?.message?.content || "";

    try {
      // Clean up markdown formatting if the model still outputs it
      let jsonStr = content.trim();
      if (jsonStr.startsWith('\`\`\`json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('\`\`\`')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('\`\`\`')) jsonStr = jsonStr.slice(0, -3);

      const parsed = JSON.parse(jsonStr.trim());

      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          fact: item.fact,
          category: item.category as FactCategory || FactCategory.AI_INSIGHT
        }));
      }
      throw new Error("Parsed result is not an array");
    } catch (err) {
      console.error("Raw Output:", content);
      throw new Error("Failed to parse AI facts JSON");
    }
  }
}
