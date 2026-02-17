import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MIN_TIP_AMOUNT = 1;
const PLATFORM_USER_ID = '00000000-0000-0000-0000-000000000000'; // Treasury wallet

interface TipJarRequest {
  fromUserId: string;
  amount: number;
  message?: string;
}

/**
 * Tip Jar - Direct tips to support the platform
 * No fee taken (it's already going to the platform)
 */
export async function POST(request: NextRequest) {
  try {
    const body: TipJarRequest = await request.json();
    const { fromUserId, amount, message } = body;

    if (!fromUserId || !amount) {
      return NextResponse.json(
        { error: 'fromUserId and amount are required' },
        { status: 400 }
      );
    }

    const tipAmount = parseFloat(String(amount));
    if (isNaN(tipAmount) || tipAmount < MIN_TIP_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum tip is ${MIN_TIP_AMOUNT} DOGE` },
        { status: 400 }
      );
    }

    // Get sender's wallet
    const { data: senderWallet, error: senderError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', fromUserId)
      .single();

    if (senderError || !senderWallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    if (senderWallet.balance < tipAmount) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance',
          required: tipAmount,
          current: senderWallet.balance 
        },
        { status: 402 }
      );
    }

    // Deduct from sender
    const { error: deductError } = await supabase
      .from('wallets')
      .update({
        balance: senderWallet.balance - tipAmount,
        total_spent: (senderWallet.total_spent || 0) + tipAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', fromUserId);

    if (deductError) {
      console.error('[Tip Jar] Failed to deduct:', deductError);
      return NextResponse.json(
        { error: 'Failed to process tip' },
        { status: 500 }
      );
    }

    // Credit treasury (stored in platform_settings)
    const { data: balanceSetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'treasury_balance')
      .single();

    const currentBalance = balanceSetting?.value ? JSON.parse(balanceSetting.value) : 0;
    
    await supabase
      .from('platform_settings')
      .upsert({
        key: 'treasury_balance',
        value: JSON.stringify(currentBalance + tipAmount),
        updated_at: new Date().toISOString(),
      });

    // Record as a tip with platform as recipient
    const { data: tip } = await supabase
      .from('tips')
      .insert({
        from_user_id: fromUserId,
        to_user_id: PLATFORM_USER_ID,
        amount: tipAmount,
        platform_fee: tipAmount, // Entire amount is platform revenue
        net_amount: 0, // No one else receives
        fee_percentage: 100,
        tip_type: 'platform_support',
        message: message || 'Support DogeWatch',
      })
      .select()
      .single();

    // Log transaction
    await supabase.from('wallet_transactions').insert({
      user_id: fromUserId,
      type: 'tip_sent',
      amount: -tipAmount,
      description: 'Tip jar - Support DogeWatch',
      reference_id: tip?.id,
    });

    // Award extra points for platform support
    try {
      await supabase.rpc('add_user_points', { 
        uid: fromUserId, 
        points: 50, 
        reason: 'platform_support' 
      });
    } catch {
      // Points are optional
    }

    return NextResponse.json({
      success: true,
      tip: {
        id: tip?.id,
        amount: tipAmount,
        message: message || 'Support DogeWatch',
      },
      message: 'Thank you for supporting DogeWatch! 🐕',
    });

  } catch (err: any) {
    console.error('[Tip Jar] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process tip' },
      { status: 500 }
    );
  }
}

// GET: Tip jar stats (total raised, recent supporters)
export async function GET() {
  try {
    const { data: tips } = await supabase
      .from('tips')
      .select('amount, from_user_id, message, created_at')
      .eq('tip_type', 'platform_support')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: totalData } = await supabase
      .from('tips')
      .select('amount, from_user_id')
      .eq('tip_type', 'platform_support');

    const totalRaised = totalData?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const supporterCount = new Set(totalData?.map(t => t.from_user_id)).size;

    return NextResponse.json({
      totalRaised,
      supporterCount,
      recentSupporters: tips || [],
    });

  } catch (err: any) {
    console.error('[Tip Jar] Stats error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch tip jar stats' },
      { status: 500 }
    );
  }
}
