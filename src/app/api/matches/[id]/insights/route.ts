import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { InsightsService } from '@/services/ai/insights.service';

const insightsService = new InsightsService();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get('refresh') === 'true';

    const facts = await insightsService.getInsights(id, session.user.id, refresh);
    return NextResponse.json({ facts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
