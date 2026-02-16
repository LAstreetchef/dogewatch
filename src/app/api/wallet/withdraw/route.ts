import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deriveAddress } from '@/lib/dogecoin/wallet';
import { createTransaction, getBalanceInDoge } from '@/lib/dogecoin/transactions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MASTER_MNEMONIC = process.env.DOGE_MASTER_MNEMONIC;
const MIN_WITHDRAWAL = 10; // Minimum 10 DOGE
const NETWORK_FEE = 1; // ~1 DOGE fee

// Simple DOGE address validation
const BASE58_REGEX = /^D[1-9A-HJ-NP-Za-km-z]{33}$/;

export async function POST(request: NextRequest) {
  try {
    if (!MASTER_MNEMONIC) {
      return NextResponse.json({ error: 'Wallet system not configured' }, { status: 500 });
    }

    const { userId, toAddress, amount } = await request.json();

    if (!userId || !toAddress || !amount) {
      return NextResponse.json({ error: 'userId, toAddress, and amount required' }, { status: 400 });
    }

    // Validate destination address
    if (!BASE58_REGEX.test(toAddress)) {
      return NextResponse.json({ error: 'Invalid DOGE address format' }, { status: 400 });
    }

    const amountDoge = parseFloat(amount);
    if (isNaN(amountDoge) || amountDoge < MIN_WITHDRAWAL) {
      return NextResponse.json({ error: `Minimum withdrawal is ${MIN_WITHDRAWAL} DOGE` }, { status: 400 });
    }

    // Get wallet from DB
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (wallet.derivation_index === null || wallet.derivation_index === undefined) {
      return NextResponse.json({ error: 'Wallet not properly initialized' }, { status: 400 });
    }

    // Check blockchain balance (not just DB)
    const blockchainBalance = await getBalanceInDoge(wallet.doge_address);
    const totalRequired = amountDoge + NETWORK_FEE;

    if (blockchainBalance < totalRequired) {
      return NextResponse.json({ 
        error: `Insufficient balance. Have ${blockchainBalance.toFixed(2)} DOGE, need ${totalRequired.toFixed(2)} DOGE (including ~${NETWORK_FEE} DOGE fee)` 
      }, { status: 400 });
    }

    // Derive private key for this wallet
    const derived = deriveAddress(MASTER_MNEMONIC, wallet.derivation_index);

    console.log(`[Withdraw] Sending ${amountDoge} DOGE from ${wallet.doge_address} to ${toAddress}`);

    // Create, sign, and broadcast transaction
    const { txHash } = await createTransaction(
      wallet.doge_address,
      toAddress,
      amountDoge,
      derived.privateKeyWIF
    );

    console.log(`[Withdraw] Transaction broadcast: ${txHash}`);

    // Record transaction in DB
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'withdrawal',
        amount: -amountDoge,
        doge_tx_hash: txHash,
        description: `Withdrawal to ${toAddress.slice(0, 8)}...${toAddress.slice(-4)}`,
        status: 'pending',
      });

    if (txError) {
      console.error('[Withdraw] Failed to record transaction:', txError);
      // Transaction was sent, just failed to record - don't error out
    }

    // Update wallet balance in DB (will be synced accurately later)
    const newBalance = blockchainBalance - totalRequired;
    await supabase
      .from('wallets')
      .update({ 
        balance: Math.max(0, newBalance),
        total_spent: (wallet.total_spent || 0) + amountDoge,
      })
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      txHash,
      amount: amountDoge,
      fee: NETWORK_FEE,
      to: toAddress,
      explorerUrl: `https://dogechain.info/tx/${txHash}`,
    });

  } catch (err: any) {
    console.error('[Withdraw] Error:', err);
    return NextResponse.json({ 
      error: err.message || 'Withdrawal failed' 
    }, { status: 500 });
  }
}
