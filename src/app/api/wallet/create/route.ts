import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for wallet creation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Check if wallet already exists
    const { data: existing } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Wallet already exists', walletId: existing.id });
    }

    // Create wallet
    const { data: wallet, error } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        balance: 0,
        total_earned: 0,
        total_spent: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[Wallet Create] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wallet });
  } catch (err) {
    console.error('[Wallet Create] Exception:', err);
    return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 });
  }
}
