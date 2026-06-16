import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMatchProvider } from '@/services/providers';

export async function GET() {
  try {
    const count = await prisma.team.count();
    if (count > 0) {
      return NextResponse.json({ message: 'Teams already seeded', count });
    }

    // Call the new WorldCup26 provider to fetch teams directly from the API
    const provider = getMatchProvider();
    if (provider.syncTeams) {
      await provider.syncTeams();
    }

    const newCount = await prisma.team.count();
    
    if (newCount === 0) {
      const lastJob = await prisma.syncJob.findFirst({ orderBy: { startedAt: 'desc' } });
      return NextResponse.json({ message: 'Teams sync failed or processed 0 items', count: 0, job: lastJob });
    }

    return NextResponse.json({ message: 'Teams seeded successfully!', count: newCount });
  } catch (err: any) {
    console.error("[Seed API]", err);
    return NextResponse.json({ error: err.message || "Failed to seed teams" }, { status: 500 });
  }
}
