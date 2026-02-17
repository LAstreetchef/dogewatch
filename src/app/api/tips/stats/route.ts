import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  try {
    // Get platform tip stats using the DB function
    const { data: stats, error: statsError } = await supabase
      .rpc('get_platform_tip_stats', { days });

    if (statsError) {
      // Fallback to manual query if function doesn't exist
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data: tips } = await supabase
        .from('tips')
        .select('amount, platform_fee, from_user_id, to_user_id')
        .gte('created_at', since.toISOString());

      const manualStats = {
        total_tips: tips?.length || 0,
        total_volume: tips?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0,
        total_fees: tips?.reduce((sum, t) => sum + parseFloat(t.platform_fee), 0) || 0,
        unique_tippers: new Set(tips?.map(t => t.from_user_id)).size,
        unique_recipients: new Set(tips?.map(t => t.to_user_id)).size,
      };

      return NextResponse.json({ stats: manualStats, days });
    }

    return NextResponse.json({ 
      stats: stats?.[0] || {
        total_tips: 0,
        total_volume: 0,
        total_fees: 0,
        unique_tippers: 0,
        unique_recipients: 0,
      },
      days 
    });

  } catch (err: any) {
    console.error('[Tips Stats] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
