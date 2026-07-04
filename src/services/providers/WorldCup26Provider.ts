import { MatchProvider } from "./MatchProvider";
import { prisma } from "@/lib/prisma";
import { MatchStatus, MatchSource, SyncType, SyncStatus, MatchStage } from "@prisma/client";

export class WorldCup26Provider implements MatchProvider {
  private baseUrl: string = "https://worldcup26.ir/get";

  private async fetchApi(endpoint: string) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      if (!response.ok) throw new Error(`API error: ${response.statusText}`);
      return await response.json();
    } catch (err) {
      console.error(`[WorldCup26Provider] Fetch failed for ${endpoint}:`, err);
      return null;
    }
  }

  private async logSync(type: SyncType, status: SyncStatus, records: number, errorMsg?: string) {
    return prisma.syncJob.create({
      data: {
        type,
        status,
        recordsProcessed: records,
        error: errorMsg,
        completedAt: status !== 'RUNNING' ? new Date() : null,
      }
    });
  }

  private parseScorers(scorerRaw: any): string[] {
    if (!scorerRaw || scorerRaw === "null" || scorerRaw === "") return [];
    
    // Safely cast to string to prevent .trim() failures if API returns arrays/numbers
    let s = typeof scorerRaw === 'string' ? scorerRaw : String(scorerRaw);
    s = s.trim();
    
    if (s.startsWith("{")) s = s.substring(1);
    if (s.endsWith("}")) s = s.substring(0, s.length - 1);
    
    const parts = s.split(",");
    const players: string[] = [];
    for (let part of parts) {
      part = part.replace(/["“”\\]/g, "").trim();
      if (!part) continue;
      const match = part.match(/^(.*?)\s+\d/);
      if (match) {
        players.push(match[1].trim());
      } else {
        players.push(part);
      }
    }
    return players;
  }

  private calculateMaxGoals(homeStr: string | null | undefined, awayStr: string | null | undefined): number {
    const players = [...this.parseScorers(homeStr), ...this.parseScorers(awayStr)];
    if (players.length === 0) return 0;
    
    const counts: Record<string, number> = {};
    let max = 0;
    for (const p of players) {
      if (!p) continue;
      counts[p] = (counts[p] || 0) + 1;
      if (counts[p] > max) max = counts[p];
    }
    return max;
  }

  async syncTeams(): Promise<void> {
    console.log("[WorldCup26Provider] Syncing teams...");
    const job = await this.logSync("TEAMS", "RUNNING", 0);
    
    try {
      const data = await this.fetchApi("/teams");
      if (!data || !data.teams) throw new Error("Invalid teams data from API");

      let count = 0;
      for (const t of data.teams) {
        // Group upsert
        let group = null;
        if (t.groups) {
          const groupName = `Group ${t.groups}`;
          group = await prisma.group.upsert({
            where: { name: groupName },
            update: {},
            create: { name: groupName }
          });
        }

        await prisma.team.upsert({
          where: { fifaId: t.fifa_code },
          update: {
            name: t.name_en,
            code: t.iso2,
            flagUrl: t.flag,
            country: t.name_en,
            groupId: group?.id
          },
          create: {
            id: t.id.toString(), // Use API ID for easy relation mapping later
            fifaId: t.fifa_code,
            name: t.name_en,
            code: t.iso2,
            flagUrl: t.flag,
            country: t.name_en,
            groupId: group?.id
          }
        });
        count++;
      }

      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "SUCCESS", recordsProcessed: count, completedAt: new Date() }
      });
      console.log(`[WorldCup26Provider] Teams sync complete. Processed ${count} teams.`);
    } catch (e: any) {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: e.message, completedAt: new Date() }
      });
    }
  }

  async syncStadiums(): Promise<void> {
    console.log("[WorldCup26Provider] Syncing stadiums...");
    const job = await this.logSync("STADIUMS", "RUNNING", 0);

    try {
      const data = await this.fetchApi("/stadiums");
      if (!data || !data.stadiums) throw new Error("Invalid stadiums data from API");

      let count = 0;
      for (const s of data.stadiums) {
        await prisma.stadium.upsert({
          where: { id: s.id.toString() }, // Using the string API ID directly
          update: {
            name: s.name_en,
            city: s.city_en,
            country: s.country_en,
            capacity: s.capacity
          },
          create: {
            id: s.id.toString(),
            name: s.name_en,
            city: s.city_en,
            country: s.country_en,
            capacity: s.capacity
          }
        });
        count++;
      }

      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "SUCCESS", recordsProcessed: count, completedAt: new Date() }
      });
      console.log(`[WorldCup26Provider] Stadiums sync complete. Processed ${count} stadiums.`);
    } catch (e: any) {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: e.message, completedAt: new Date() }
      });
    }
  }

  async syncFixtures(): Promise<void> {
    await this.processGamesSync();
  }

  async syncResults(): Promise<void> {
    // Both fixtures and results come from /games in WorldCup26 API
    await this.processGamesSync();
  }

  private async processGamesSync(): Promise<void> {
    console.log("[WorldCup26Provider] Syncing games...");
    const job = await this.logSync("MATCHES", "RUNNING", 0);

    try {
      const data = await this.fetchApi("/games");
      if (!data || !data.games) throw new Error("Invalid games data from API");

      let count = 0;
      for (const game of data.games) {
        const externalId = game.id.toString();

        const existingMatch = await prisma.match.findUnique({
          where: { externalMatchId: externalId }
        });

        if (existingMatch && existingMatch.manualOverride) {
          continue; // Skip API update if manually overridden
        }

        // The API local_date is the literal wall-clock time at the stadium.
        // Because the 2026 World Cup spans 4 timezones across North America,
        // we MUST map each stadium to its specific summer UTC offset (EDT, CDT, CST, PDT).
        const stadiumOffsets: Record<string, string> = {
          "1": "-06:00", // Mexico City (No DST)
          "2": "-06:00", // Guadalajara (No DST)
          "3": "-06:00", // Monterrey (No DST)
          "4": "-05:00", // Dallas (CDT)
          "5": "-05:00", // Houston (CDT)
          "6": "-05:00", // Kansas City (CDT)
          "7": "-04:00", // Atlanta (EDT)
          "8": "-04:00", // Miami (EDT)
          "9": "-04:00", // Boston (EDT)
          "10": "-04:00", // Philadelphia (EDT)
          "11": "-04:00", // NY/NJ (EDT)
          "12": "-04:00", // Toronto (EDT)
          "13": "-07:00", // Vancouver (PDT)
          "14": "-07:00", // Seattle (PDT)
          "15": "-07:00", // San Francisco (PDT)
          "16": "-07:00", // Los Angeles (PDT)
        };
        const offset = stadiumOffsets[game.stadium_id?.toString()] || "-04:00";
        let startTime = new Date(game.local_date + " " + offset);
        
        if (isNaN(startTime.getTime())) {
          startTime = new Date(game.local_date); // Fallback
          if (isNaN(startTime.getTime())) startTime = new Date();
        }

        let status: MatchStatus = "SCHEDULED";
        if (game.time_elapsed === "finished" || game.finished === "TRUE") status = "FINISHED";
        else if (game.time_elapsed !== "notstarted") status = "IN_PLAY";

        let stage: MatchStage = "GROUP";
        const typeStr = (game.type || "").toLowerCase();
        if (typeStr === "r32" || typeStr.includes("32")) stage = "ROUND_OF_32";
        else if (typeStr === "r16" || typeStr.includes("16")) stage = "ROUND_OF_16";
        else if (typeStr === "qf" || typeStr.includes("quarter")) stage = "QUARTER_FINAL";
        else if (typeStr === "sf" || typeStr.includes("semi")) stage = "SEMI_FINAL";
        else if (typeStr === "third" || typeStr.includes("third")) stage = "THIRD_PLACE";
        else if (typeStr === "final") stage = "FINAL";

        const homeScore = game.home_score ? parseInt(game.home_score) : null;
        const awayScore = game.away_score ? parseInt(game.away_score) : null;
        const homePenaltyScore = game.home_penalty_score ? parseInt(game.home_penalty_score) : null;
        const awayPenaltyScore = game.away_penalty_score ? parseInt(game.away_penalty_score) : null;
        const isPenaltyShootout = homePenaltyScore !== null && awayPenaltyScore !== null;
        const homeTeamName = game.home_team_name_en || game.home_team_label || "TBD";
        const awayTeamName = game.away_team_name_en || game.away_team_label || "TBD";

        let winner = null;
        if (status === "FINISHED" && homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) winner = homeTeamName;
          else if (awayScore > homeScore) winner = awayTeamName;
          else winner = "DRAW";
        }

        let actualMaxGoals: number | null = null;
        if (status === "FINISHED") {
          actualMaxGoals = this.calculateMaxGoals(game.home_scorers, game.away_scorers);
        }

        const dbMatch = await prisma.match.upsert({
          where: { externalMatchId: externalId },
          update: {
            startTime,
            status,
            stage,
            homeScore: isNaN(homeScore!) ? null : homeScore,
            awayScore: isNaN(awayScore!) ? null : awayScore,
            homePenaltyScore,
            awayPenaltyScore,
            isPenaltyShootout,
            actualMaxGoals,
            winner,
            homeTeamName,
            awayTeamName,
            homeTeamId: !game.home_team_id || game.home_team_id === "0" ? null : game.home_team_id.toString(),
            awayTeamId: !game.away_team_id || game.away_team_id === "0" ? null : game.away_team_id.toString(),
            stadiumId: game.stadium_id ? game.stadium_id.toString() : null
          },
          create: {
            externalMatchId: externalId,
            source: "API",
            sourceProvider: "WORLDCUP26",
            sourceId: externalId,
            homeTeamName: homeTeamName,
            awayTeamName: awayTeamName,
            homeTeamId: !game.home_team_id || game.home_team_id === "0" ? null : game.home_team_id.toString(),
            awayTeamId: !game.away_team_id || game.away_team_id === "0" ? null : game.away_team_id.toString(),
            stadiumId: game.stadium_id ? game.stadium_id.toString() : null,
            startTime,
            status,
            stage,
            homeScore: isNaN(homeScore!) ? null : homeScore,
            awayScore: isNaN(awayScore!) ? null : awayScore,
            homePenaltyScore,
            awayPenaltyScore,
            isPenaltyShootout,
            actualMaxGoals,
            winner
          }
        });

        if (status === 'FINISHED' && !dbMatch.pointsCalculated) {
          await prisma.matchProcessing.upsert({
            where: { matchId: dbMatch.id },
            update: {},
            create: { matchId: dbMatch.id, status: 'PENDING' }
          });
        }
        count++;
      }

      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "SUCCESS", recordsProcessed: count, completedAt: new Date() }
      });
      console.log(`[WorldCup26Provider] Games sync complete. Processed ${count} matches.`);
    } catch (e: any) {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: e.message, completedAt: new Date() }
      });
    }
  }
}
