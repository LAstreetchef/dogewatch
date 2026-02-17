import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deriveAddress } from '@/lib/dogecoin/wallet';
import { getBalanceInDoge } from '@/lib/dogecoin/transactions';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MASTER_MNEMONIC = process.env.DOGE_MASTER_MNEMONIC
  ?.replace(/\\n/g, '')
  ?.replace(/\n/g, '')
  ?.trim();

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dogewatch-admin';
const PLATFORM_USER_ID = '00000000-0000-0000-0000-000000000000'; // Reserved UUID
const TREASURY_INDEX = 999999; // High index reserved for treasury (avoids conflict with early users)

function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${ADMIN_SECRET}`;
}

/**
 * GET - Get treasury wallet info
 */
export async function GET(request: NextRequest) {
  try {
    // Get treasury wallet from DB
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', PLATFORM_USER_ID)
      .single();

    if (!wallet) {
      return NextResponse.json({
        initialized: false,
        message: 'Treasury wallet not initialized. POST to create.',
      });
    }

    // Get on-chain balance
    let onChainBalance = 0;
    try {
      onChainBalance = await getBalanceInDoge(wallet.doge_address);
    } catch (e) {
      console.error('[Treasury] Failed to fetch on-chain balance:', e);
    }

    // Get total fees collected from tips
    const { data: feeStats } = await supabase
      .from('tips')
      .select('platform_fee')
      .neq('tip_type', 'platform_support');

    const totalFeesCollected = feeStats?.reduce(
      (sum, t) => sum + parseFloat(t.platform_fee || '0'), 
      0
    ) || 0;

    // Get tip jar donations
    const { data: jarStats } = await supabase
      .from('tips')
      .select('amount')
      .eq('tip_type', 'platform_support');

    const totalDonations = jarStats?.reduce(
      (sum, t) => sum + parseFloat(t.amount || '0'),
      0
    ) || 0;

    return NextResponse.json({
      initialized: true,
      treasury: {
        userId: PLATFORM_USER_ID,
        address: wallet.doge_address,
        derivationIndex: wallet.derivation_index,
        dbBalance: wallet.balance,
        onChainBalance,
        totalEarned: wallet.total_earned,
        totalSpent: wallet.total_spent,
      },
      revenue: {
        totalFeesCollected,
        totalDonations,
        totalRevenue: totalFeesCollected + totalDonations,
      },
    });

  } catch (err: any) {
    console.error('[Treasury] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST - Initialize treasury wallet (admin only, one-time)
 */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!MASTER_MNEMONIC) {
      return NextResponse.json(
        { error: 'DOGE_MASTER_MNEMONIC not configured' },
        { status: 500 }
      );
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('wallets')
      .select('id, doge_address')
      .eq('user_id', PLATFORM_USER_ID)
      .single();

    if (existing) {
      return NextResponse.json({
        message: 'Treasury wallet already initialized',
        address: existing.doge_address,
      });
    }

    // Derive treasury address at index 0
    const derived = deriveAddress(MASTER_MNEMONIC, TREASURY_INDEX);

    console.log(`[Treasury] Creating treasury wallet at index ${TREASURY_INDEX}: ${derived.address}`);

    // Create treasury wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .insert({
        user_id: PLATFORM_USER_ID,
        doge_address: derived.address,
        derivation_index: TREASURY_INDEX,
        balance: 0,
        total_earned: 0,
        total_spent: 0,
      })
      .select()
      .single();

    if (walletError) {
      console.error('[Treasury] Failed to create wallet:', walletError);
      return NextResponse.json({ error: walletError.message }, { status: 500 });
    }

    // Update platform settings
    await supabase
      .from('platform_settings')
      .upsert({
        key: 'platform_wallet_user_id',
        value: JSON.stringify(PLATFORM_USER_ID),
        updated_at: new Date().toISOString(),
      });

    await supabase
      .from('platform_settings')
      .upsert({
        key: 'treasury_address',
        value: JSON.stringify(derived.address),
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'Treasury wallet initialized',
      treasury: {
        userId: PLATFORM_USER_ID,
        address: derived.address,
        derivationIndex: TREASURY_INDEX,
      },
    });

  } catch (err: any) {
    console.error('[Treasury] Init error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
