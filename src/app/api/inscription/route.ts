import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadToIPFS, getIPFSPublicUrl } from '@/lib/inscription/ipfs';
import { inscribeOnDogecoin } from '@/lib/inscription/dogecoin';

// Initialize Supabase client with service role for writes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Inscription fee in DOGE
const INSCRIPTION_FEE_DOGE = 0.1;

interface InscriptionRequest {
  tipId: string;
  providerNpi: string;
  providerName?: string;
  anomalyScore: number;
  findings: string;
  evidence?: string[];
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: InscriptionRequest = await request.json();
    
    // Validate required fields
    if (!body.tipId || !body.providerNpi || !body.findings || !body.userId) {
      return NextResponse.json(
        { error: 'Missing required fields: tipId, providerNpi, findings, userId' },
        { status: 400 }
      );
    }

    // Check if already inscribed
    const { data: existingInscription } = await supabase
      .from('inscriptions')
      .select('id')
      .eq('tip_id', body.tipId)
      .single();

    if (existingInscription) {
      return NextResponse.json(
        { error: 'This tip has already been inscribed' },
        { status: 409 }
      );
    }

    // Check user's wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', body.userId)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: 'Wallet not found. Please set up your wallet first.' },
        { status: 400 }
      );
    }

    if (wallet.balance < INSCRIPTION_FEE_DOGE) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance',
          required: INSCRIPTION_FEE_DOGE,
          current: wallet.balance,
          message: `Inscription requires ${INSCRIPTION_FEE_DOGE} DOGE. Your balance: ${wallet.balance} DOGE`
        },
        { status: 402 } // Payment Required
      );
    }

    // Deduct inscription fee from user's wallet
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ 
        balance: wallet.balance - INSCRIPTION_FEE_DOGE,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', body.userId);

    if (deductError) {
      console.error('[Inscription] Failed to deduct fee:', deductError);
      return NextResponse.json(
        { error: 'Failed to process payment' },
        { status: 500 }
      );
    }

    // Log the transaction
    await supabase.from('wallet_transactions').insert({
      user_id: body.userId,
      type: 'inscription_fee',
      amount: -INSCRIPTION_FEE_DOGE,
      description: `Inscription fee for tip ${body.tipId}`,
      tip_id: body.tipId,
    });

    // Step 1: Upload to IPFS
    console.log(`[Inscription] Uploading tip ${body.tipId} to IPFS...`);
    
    const ipfsHash = await uploadToIPFS({
      tipId: body.tipId,
      providerNpi: body.providerNpi,
      providerName: body.providerName,
      anomalyScore: body.anomalyScore,
      findings: body.findings,
      evidence: body.evidence,
      submittedBy: body.userId,
      submittedAt: new Date().toISOString(),
    });

    console.log(`[Inscription] IPFS hash: ${ipfsHash}`);

    // Step 2: Inscribe on Dogecoin blockchain
    console.log(`[Inscription] Inscribing on Dogecoin...`);
    
    let txId: string;
    let explorerUrl: string;

    try {
      const result = await inscribeOnDogecoin(ipfsHash, body.tipId);
      txId = result.txId;
      explorerUrl = result.explorerUrl;
    } catch (dogeError) {
      // If Dogecoin inscription fails, we still have IPFS - save partial result
      console.error('[Inscription] Dogecoin inscription failed:', dogeError);
      
      // Save IPFS-only inscription for later retry
      await supabase.from('inscriptions').insert({
        tip_id: body.tipId,
        provider_npi: body.providerNpi,
        provider_name: body.providerName,
        anomaly_score: body.anomalyScore,
        ipfs_hash: ipfsHash,
        tx_id: null,
        status: 'ipfs_only',
        user_id: body.userId,
        error: String(dogeError),
      });

      return NextResponse.json({
        success: true,
        partial: true,
        ipfsHash,
        ipfsUrl: getIPFSPublicUrl(ipfsHash),
        message: 'Uploaded to IPFS but Dogecoin inscription pending',
      });
    }

    console.log(`[Inscription] Transaction ID: ${txId}`);

    // Step 3: Save inscription record
    const { error: dbError } = await supabase.from('inscriptions').insert({
      tip_id: body.tipId,
      provider_npi: body.providerNpi,
      provider_name: body.providerName,
      anomaly_score: body.anomalyScore,
      ipfs_hash: ipfsHash,
      tx_id: txId,
      status: 'confirmed',
      user_id: body.userId,
    });

    if (dbError) {
      console.error('[Inscription] Database error:', dbError);
      // Transaction succeeded, just failed to save - return success anyway
    }

    // Step 4: Award points/badge to user
    await awardInscriptionBadge(body.userId);

    return NextResponse.json({
      success: true,
      inscription: {
        tipId: body.tipId,
        ipfsHash,
        ipfsUrl: getIPFSPublicUrl(ipfsHash),
        txId,
        explorerUrl,
        timestamp: new Date().toISOString(),
        providerNpi: body.providerNpi,
        providerName: body.providerName,
        anomalyScore: body.anomalyScore,
      },
    });

  } catch (error) {
    console.error('[Inscription] Error:', error);
    
    // Refund the user if we already deducted the fee
    if (body?.userId) {
      try {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', body.userId)
          .single();
        
        if (wallet) {
          await supabase
            .from('wallets')
            .update({ balance: wallet.balance + INSCRIPTION_FEE_DOGE })
            .eq('user_id', body.userId);
          
          await supabase.from('wallet_transactions').insert({
            user_id: body.userId,
            type: 'inscription_refund',
            amount: INSCRIPTION_FEE_DOGE,
            description: `Refund for failed inscription ${body.tipId}`,
            tip_id: body.tipId,
          });
        }
      } catch (refundError) {
        console.error('[Inscription] Refund failed:', refundError);
      }
    }
    
    return NextResponse.json(
      { error: 'Inscription failed', details: String(error) },
      { status: 500 }
    );
  }
}

async function awardInscriptionBadge(userId: string) {
  try {
    // Check if user already has the badge
    const { data: existingBadge } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_type', 'chain_witness')
      .single();

    if (!existingBadge) {
      // Award the badge
      await supabase.from('user_badges').insert({
        user_id: userId,
        badge_type: 'chain_witness',
        awarded_at: new Date().toISOString(),
      });

      // Update user profile with badge count
      await supabase.rpc('increment_badge_count', { uid: userId });
    }

    // Award points for inscription
    await supabase.rpc('add_user_points', { 
      uid: userId, 
      points: 100,
      reason: 'blockchain_inscription'
    });

  } catch (error) {
    console.error('[Inscription] Failed to award badge:', error);
    // Don't fail the inscription for badge errors
  }
}

// GET endpoint to check inscription status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tipId = searchParams.get('tipId');

  if (!tipId) {
    return NextResponse.json(
      { error: 'Missing tipId parameter' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('inscriptions')
    .select('*')
    .eq('tip_id', tipId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { inscribed: false },
      { status: 200 }
    );
  }

  return NextResponse.json({
    inscribed: true,
    inscription: {
      tipId: data.tip_id,
      ipfsHash: data.ipfs_hash,
      ipfsUrl: getIPFSPublicUrl(data.ipfs_hash),
      txId: data.tx_id,
      explorerUrl: data.tx_id ? `https://dogechain.info/tx/${data.tx_id}` : null,
      status: data.status,
      timestamp: data.created_at,
    },
  });
}
