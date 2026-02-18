import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MIN_STAKE = 1; // Minimum 1 DOGE to vote

/**
 * POST - Cast a verification vote
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, voterId, vote, stakeAmount, comment } = body;

    // Validation
    if (!caseId || !voterId || !vote) {
      return NextResponse.json(
        { error: 'caseId, voterId, and vote are required' },
        { status: 400 }
      );
    }

    if (!['valid', 'invalid'].includes(vote)) {
      return NextResponse.json(
        { error: 'vote must be "valid" or "invalid"' },
        { status: 400 }
      );
    }

    const stake = parseFloat(stakeAmount) || MIN_STAKE;
    if (stake < MIN_STAKE) {
      return NextResponse.json(
        { error: `Minimum stake is ${MIN_STAKE} DOGE` },
        { status: 400 }
      );
    }

    // Check case exists and is open
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (caseData.status !== 'open') {
      return NextResponse.json(
        { error: 'Case is no longer open for voting' },
        { status: 400 }
      );
    }

    // Check voting window
    if (new Date(caseData.verification_closes_at) < new Date()) {
      return NextResponse.json(
        { error: 'Voting window has closed' },
        { status: 400 }
      );
    }

    // Can't vote on own case
    if (caseData.submitter_id === voterId) {
      return NextResponse.json(
        { error: "You can't vote on your own case" },
        { status: 400 }
      );
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from('verification_votes')
      .select('id')
      .eq('case_id', caseId)
      .eq('voter_id', voterId)
      .single();

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted on this case' },
        { status: 400 }
      );
    }

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', voterId)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (wallet.balance < stake) {
      return NextResponse.json(
        { error: 'Insufficient balance for stake' },
        { status: 402 }
      );
    }

    // Deduct stake from wallet
    const { error: deductError } = await supabase
      .from('wallets')
      .update({
        balance: wallet.balance - stake,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', voterId);

    if (deductError) {
      return NextResponse.json(
        { error: 'Failed to process stake' },
        { status: 500 }
      );
    }

    // Record vote
    const { data: newVote, error: voteError } = await supabase
      .from('verification_votes')
      .insert({
        case_id: caseId,
        voter_id: voterId,
        vote,
        stake_amount: stake,
        comment: comment || null,
      })
      .select()
      .single();

    if (voteError) {
      // Refund stake if vote failed
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance })
        .eq('user_id', voterId);

      console.error('[Vote] Error:', voteError);
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }

    // Log transaction
    await supabase.from('wallet_transactions').insert({
      user_id: voterId,
      type: 'stake',
      amount: -stake,
      description: `Verification stake on case: ${caseData.title.slice(0, 30)}...`,
      reference_id: newVote.id,
    });

    return NextResponse.json({
      success: true,
      vote: newVote,
    });

  } catch (err: any) {
    console.error('[Vote] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET - Get votes for a case
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('caseId');
  const voterId = searchParams.get('voterId');

  if (!caseId && !voterId) {
    return NextResponse.json(
      { error: 'caseId or voterId required' },
      { status: 400 }
    );
  }

  let query = supabase
    .from('verification_votes')
    .select(`
      *,
      voter:profiles!voter_id(handle, display_name, avatar_emoji, tier)
    `)
    .order('created_at', { ascending: false });

  if (caseId) {
    query = query.eq('case_id', caseId);
  }

  if (voterId) {
    query = query.eq('voter_id', voterId);
  }

  const { data: votes, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ votes });
}
