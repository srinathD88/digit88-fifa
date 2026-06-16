import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateScoresForMatch } from '../src/services/scoring.service';
import { prisma } from '../src/lib/prisma';

// Mock Prisma
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    matchProcessing: { update: vi.fn(), findMany: vi.fn() },
    match: { findUnique: vi.fn(), update: vi.fn() },
    scoringConfig: { findMany: vi.fn() },
    prediction: { findMany: vi.fn(), update: vi.fn() },
    team: { findMany: vi.fn(), update: vi.fn() },
    user: { findMany: vi.fn() }
  }
}));

describe('Idempotent Scoring Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process match and calculate scores idempotently', async () => {
    // Setup Mocks
    (prisma.match.findUnique as any).mockResolvedValue({
      id: 'match-1',
      status: 'FINISHED',
      homeScore: 2,
      awayScore: 1,
      homeTeam: 'Brazil',
      awayTeam: 'France'
    });

    (prisma.scoringConfig.findMany as any).mockResolvedValue([
      { key: 'EXACT_SCORE', value: 5 },
      { key: 'WINNER', value: 3 },
      { key: 'GOAL_DIFF', value: 1 },
    ]);

    // First call (Mocking previous prediction state as null or different points)
    (prisma.prediction.findMany as any).mockResolvedValue([
      { id: 'pred-1', userId: 'user-1', matchId: 'match-1', predictedHomeGoals: 2, predictedAwayGoals: 1, predictedWinner: 'Brazil' },
      { id: 'pred-2', userId: 'user-2', matchId: 'match-1', predictedHomeGoals: 3, predictedAwayGoals: 0, predictedWinner: 'Brazil' }
    ]);

    (prisma.team.findMany as any).mockResolvedValue([]);

    await calculateScoresForMatch('match-1');

    // Assert Processing State was marked PROCESSING
    expect(prisma.matchProcessing.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { matchId: 'match-1' },
      data: expect.objectContaining({ status: 'PROCESSING' })
    }));

    // Assert points awarded (Exact Score = 5)
    expect(prisma.prediction.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'pred-1' },
      data: { pointsAwarded: 5 }
    }));

    // Assert points awarded (Winner = 3)
    expect(prisma.prediction.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'pred-2' },
      data: { pointsAwarded: 3 }
    }));

    // Assert Processing State was marked COMPLETED
    expect(prisma.matchProcessing.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { matchId: 'match-1' },
      data: expect.objectContaining({ status: 'COMPLETED', lastError: null })
    }));
  });
});
