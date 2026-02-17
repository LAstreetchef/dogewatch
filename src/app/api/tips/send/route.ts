import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default fee percentage (can be overridden by platform_settings)
const DEFAULT_FEE_PERCENTAGE = 10;
const MIN_TIP_AMOUNT = 1; // Minimum 1 DOGE
const PLATFORM_USER_ID = '00000000-0000-0000-0000-000000000000'; // Treasury wallet

interface TipRequest {
  fromUserId: string;
  toUserId: string;
  amount: number;
  tipType?: 'fraud_tip' | 'comment' | 'profile' | 'general';
  referenceId?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TipRequest = await request.json();
    const { fromUserId, toUserId, amount, tipType = 'general', referenceId, message } = body;

    // Validation
    if (!fromUserId || !toUserId || !amount) {
      return NextResponse.json(
        { error: 'fromUserId, toUserId, and amount are required' },
        { status: 400 }
      );
    }

    if (fromUserId === toUserId) {
      return NextResponse.json(
        { error: "You can't tip yourself" },
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

    // Get platform fee percentage from settings
    let feePercentage = DEFAULT_FEE_PERCENTAGE;
    const { data: feeSetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'tip_fee_percentage')
      .single();
    
    if (feeSetting?.value) {
      feePercentage = parseFloat(feeSetting.value);
    }

    // Calculate fee and net amount
    const platformFee = tipAmount * (feePercentage / 100);
    const netAmount = tipAmount - platformFee;

    // Get sender's wallet
    const { data: senderWallet, error: senderError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', fromUserId)
      .single();

    if (senderError || !senderWallet) {
      return NextResponse.json(
        { error: 'Sender wallet not found' },
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

    // Get recipient's wallet (create if doesn't exist)
    let { data: recipientWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', toUserId)
      .single();

    if (!recipientWallet) {
      // Create wallet for recipient
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: toUserId,
          balance: 0,
          total_earned: 0,
          total_spent: 0,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create recipient wallet' },
          { status: 500 }
        );
      }
      recipientWallet = newWallet;
    }

    // Use treasury wallet for platform fees
    const platformWalletUserId = PLATFORM_USER_ID;

    // Start transaction-like operations
    // 1. Deduct from sender
    const { error: deductError } = await supabase
      .from('wallets')
      .update({
        balance: senderWallet.balance - tipAmount,
        total_spent: (senderWallet.total_spent || 0) + tipAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', fromUserId);

    if (deductError) {
      console.error('[Tips] Failed to deduct from sender:', deductError);
      return NextResponse.json(
        { error: 'Failed to process tip' },
        { status: 500 }
      );
    }

    // 2. Credit recipient (net amount after fee)
    const { error: creditError } = await supabase
      .from('wallets')
      .update({
        balance: (recipientWallet.balance || 0) + netAmount,
        total_earned: (recipientWallet.total_earned || 0) + netAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', toUserId);

    if (creditError) {
      // Rollback sender deduction
      console.error('[Tips] Failed to credit recipient, rolling back:', creditError);
      await supabase
        .from('wallets')
        .update({
          balance: senderWallet.balance,
          total_spent: senderWallet.total_spent || 0,
        })
        .eq('user_id', fromUserId);

      return NextResponse.json(
        { error: 'Failed to process tip' },
        { status: 500 }
      );
    }

    // 3. Credit platform fee to treasury (stored in platform_settings)
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
        value: JSON.stringify(currentBalance + platformFee),
        updated_at: new Date().toISOString(),
      });

    // 4. Record the tip
    const { data: tip, error: tipError } = await supabase
      .from('tips')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount: tipAmount,
        platform_fee: platformFee,
        net_amount: netAmount,
        fee_percentage: feePercentage,
        tip_type: tipType,
        reference_id: referenceId || null,
        message: message || null,
      })
      .select()
      .single();

    if (tipError) {
      console.error('[Tips] Failed to record tip:', tipError);
      // Tip went through, just failed to log - continue
    }

    // 5. Log transactions for both parties
    await supabase.from('wallet_transactions').insert([
      {
        user_id: fromUserId,
        type: 'tip_sent',
        amount: -tipAmount,
        description: `Tip sent${referenceId ? ` for ${tipType}` : ''}`,
        reference_id: tip?.id,
      },
      {
        user_id: toUserId,
        type: 'tip_received',
        amount: netAmount,
        description: `Tip received${referenceId ? ` for ${tipType}` : ''} (${feePercentage}% fee)`,
        reference_id: tip?.id,
      },
    ]);

    // 6. Award points for tipping activity
    try {
      await supabase.rpc('add_user_points', { uid: fromUserId, points: 10, reason: 'tip_sent' });
      await supabase.rpc('add_user_points', { uid: toUserId, points: 5, reason: 'tip_received' });
    } catch {
      // Points are optional, don't fail the tip
    }

    return NextResponse.json({
      success: true,
      tip: {
        id: tip?.id,
        amount: tipAmount,
        platformFee,
        netAmount,
        feePercentage,
        from: fromUserId,
        to: toUserId,
        tipType,
        referenceId,
      },
    });

  } catch (err: any) {
    console.error('[Tips] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process tip' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch tip history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const direction = searchParams.get('direction'); // 'sent' | 'received' | 'all'
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!userId) {
    return NextResponse.json(
      { error: 'userId parameter required' },
      { status: 400 }
    );
  }

  let query = supabase
    .from('tips')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (direction === 'sent') {
    query = query.eq('from_user_id', userId);
  } else if (direction === 'received') {
    query = query.eq('to_user_id', userId);
  } else {
    query = query.or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
  }

  const { data: tips, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tips' },
      { status: 500 }
    );
  }

  return NextResponse.json({ tips });
}
