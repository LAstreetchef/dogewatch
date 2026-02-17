import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deriveAddress, isValidAddress } from '@/lib/dogecoin/wallet';

// Use service role for wallet operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Master mnemonic for HD wallet derivation - MUST be set in env vars
const MASTER_MNEMONIC = process.env.DOGE_MASTER_MNEMONIC?.replace(/\\n/g, '')?.replace(/\n/g, '')?.trim();

// Reserved IDs and indices
const PLATFORM_USER_ID = '00000000-0000-0000-0000-000000000000';
const TREASURY_INDEX = 0; // Index 0 reserved for treasury
const USER_START_INDEX = 1; // User wallets start at index 1

export async function POST(request: NextRequest) {
  try {
    if (!MASTER_MNEMONIC) {
      console.error('[Wallet Generate] DOGE_MASTER_MNEMONIC not configured');
      return NextResponse.json(
        { error: 'Wallet system not configured' },
        { status: 500 }
      );
    }

    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Check if wallet already exists
    const { data: existing } = await supabase
      .from('wallets')
      .select('id, doge_address')
      .eq('user_id', userId)
      .single();

    if (existing?.doge_address && isValidAddress(existing.doge_address)) {
      return NextResponse.json({
        message: 'Wallet already exists',
        address: existing.doge_address,
      });
    }

    // Get the next derivation index (skip index 0, reserved for treasury)
    const { count } = await supabase
      .from('wallets')
      .select('*', { count: 'exact', head: true })
      .neq('user_id', PLATFORM_USER_ID); // Don't count treasury wallet

    // User wallets start at index 1 (index 0 = treasury)
    const index = (count || 0) + USER_START_INDEX;

    // Derive real Dogecoin address
    const derived = deriveAddress(MASTER_MNEMONIC, index);
    
    console.log(`[Wallet Generate] Created address ${derived.address} for user ${userId} at index ${index}`);

    // Update or insert wallet with real address
    if (existing) {
      // Update existing wallet with real address
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          doge_address: derived.address,
          derivation_index: index,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Wallet Generate] Update error:', updateError);
        throw updateError;
      }
    } else {
      // Create new wallet
      const { error: insertError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          doge_address: derived.address,
          derivation_index: index,
          balance: 0,
          total_earned: 0,
          total_spent: 0,
        });

      if (insertError) {
        console.error('[Wallet Generate] Insert error:', insertError);
        throw insertError;
      }
    }

    // Note: We store the derivation index, NOT the private key
    // Private keys are derived on-demand from master mnemonic + index

    return NextResponse.json({
      success: true,
      address: derived.address,
      index,
    });

  } catch (err) {
    console.error('[Wallet Generate] Error:', err);
    return NextResponse.json({ error: 'Failed to generate wallet' }, { status: 500 });
  }
}
