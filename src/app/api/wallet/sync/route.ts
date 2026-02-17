import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for wallet operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BLOCKCYPHER_BASE = 'https://api.blockcypher.com/v1/doge/main';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Get wallet from DB
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet?.doge_address) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Fetch balance from BlockCypher
    const bcRes = await fetch(`${BLOCKCYPHER_BASE}/addrs/${wallet.doge_address}`);
    
    if (!bcRes.ok) {
      console.error('[Wallet Sync] BlockCypher error:', bcRes.status);
      return NextResponse.json({ error: 'Blockchain API error' }, { status: 502 });
    }

    const bcData = await bcRes.json();
    
    // BlockCypher returns balance in satoshis (1 DOGE = 100,000,000 satoshis)
    // Use final_balance to include unconfirmed transactions
    const balanceDoge = bcData.final_balance / 100000000;
    const totalReceivedDoge = bcData.total_received / 100000000;
    const totalSentDoge = bcData.total_sent / 100000000;

    // Update wallet in DB
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        balance: balanceDoge,
        total_earned: totalReceivedDoge,
        total_spent: totalSentDoge,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Wallet Sync] DB update error:', updateError);
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    console.log(`[Wallet Sync] Updated ${wallet.doge_address}: ${balanceDoge} DOGE`);

    return NextResponse.json({
      success: true,
      address: wallet.doge_address,
      balance: balanceDoge,
      total_received: totalReceivedDoge,
      total_sent: totalSentDoge,
      tx_count: bcData.n_tx,
    });

  } catch (err) {
    console.error('[Wallet Sync] Error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
