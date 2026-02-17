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
export async function GET() {
  try {
    // Get treasury info from platform_settings
    const { data: addrSetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'treasury_address')
      .single();

    const { data: indexSetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'treasury_derivation_index')
      .single();

    const { data: balanceSetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'treasury_balance')
      .single();

    const address = addrSetting?.value ? JSON.parse(addrSetting.value) : null;
    
    if (!address || address === 'null') {
      return NextResponse.json({
        initialized: false,
        message: 'Treasury wallet not initialized. POST to create.',
      });
    }

    const derivationIndex = indexSetting?.value ? JSON.parse(indexSetting.value) : TREASURY_INDEX;
    const dbBalance = balanceSetting?.value ? JSON.parse(balanceSetting.value) : 0;

    // Get on-chain balance
    let onChainBalance = 0;
    try {
      onChainBalance = await getBalanceInDoge(address);
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
        address,
        derivationIndex,
        dbBalance,
        onChainBalance,
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
 * Stores treasury info in platform_settings (not wallets table) to avoid FK issues
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

    // Check if already exists in settings
    const { data: existingAddr } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'treasury_address')
      .single();

    if (existingAddr?.value && existingAddr.value !== 'null') {
      const addr = JSON.parse(existingAddr.value);
      return NextResponse.json({
        message: 'Treasury wallet already initialized',
        address: addr,
      });
    }

    // Derive treasury address at reserved index
    const derived = deriveAddress(MASTER_MNEMONIC, TREASURY_INDEX);

    console.log(`[Treasury] Creating treasury wallet at index ${TREASURY_INDEX}: ${derived.address}`);

    // Store treasury info in platform_settings (avoids FK constraint on wallets table)
    await supabase
      .from('platform_settings')
      .upsert({
        key: 'treasury_address',
        value: JSON.stringify(derived.address),
        updated_at: new Date().toISOString(),
      });

    await supabase
      .from('platform_settings')
      .upsert({
        key: 'treasury_derivation_index',
        value: JSON.stringify(TREASURY_INDEX),
        updated_at: new Date().toISOString(),
      });

    await supabase
      .from('platform_settings')
      .upsert({
        key: 'treasury_balance',
        value: JSON.stringify(0),
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'Treasury wallet initialized',
      treasury: {
        address: derived.address,
        derivationIndex: TREASURY_INDEX,
      },
    });

  } catch (err: any) {
    console.error('[Treasury] Init error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
