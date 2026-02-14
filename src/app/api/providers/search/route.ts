import { NextRequest, NextResponse } from 'next/server';
import { searchProviders } from '@/lib/supabase/providers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  try {
    const params = {
      query: searchParams.get('q') || undefined,
      state: searchParams.get('state') || undefined,
      specialty: searchParams.get('specialty') || undefined,
      minAnomalyScore: searchParams.get('minScore') ? parseFloat(searchParams.get('minScore')!) : undefined,
      sortBy: (searchParams.get('sortBy') as 'anomaly_score' | 'total_billed' | 'name') || 'anomaly_score',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };
    
    const result = await searchProviders(params);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Provider search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search providers' },
      { status: 500 }
    );
  }
}
