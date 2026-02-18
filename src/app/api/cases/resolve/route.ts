import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLATFORM_FEE_PERCENT = 5; // 5% of losing stakes go to platform

/**
 * POST - Resolve a case after voting window closes
 * Can be called by anyone (or cron job) after window closes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId } = body;

    if (!caseId) {
      return NextResponse.json({ error: 'caseId required' }, { status: 400 });
    }

    // Get case
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
        { error: 'Case already resolved', status: caseData.status },
        { status: 400 }
      );
    }

    // Check voting window closed
    if (new Date(caseData.verification_closes_at) > new Date()) {
      return NextResponse.json(
        { error: 'Voting window still open', closes_at: caseData.verification_closes_at },
        { status: 400 }
      );
    }

    // Get all votes
    const { data: votes } = await supabase
      .from('verification_votes')
      .select('*')
      .eq('case_id', caseId);

    if (!votes || votes.length === 0) {
      // No votes - mark as disputed/inconclusive
      await supabase
        .from('cases')
        .update({
          status: 'disputed',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      // Refund bounty to submitter
      if (caseData.bounty_amount > 0) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', caseData.submitter_id)
          .single();

        if (wallet) {
          await supabase
            .from('wallets')
            .update({ balance: wallet.balance + caseData.bounty_amount })
            .eq('user_id', caseData.submitter_id);

          await supabase.from('wallet_transactions').insert({
            user_id: caseData.submitter_id,
            type: 'bounty_refund',
            amount: caseData.bounty_amount,
            description: `Bounty refund - no votes on case`,
          });
        }
      }

      return NextResponse.json({
        success: true,
        result: 'disputed',
        reason: 'No votes cast',
      });
    }

    // Calculate results
    const validStake = votes
      .filter(v => v.vote === 'valid')
      .reduce((sum, v) => sum + parseFloat(v.stake_amount), 0);
    
    const invalidStake = votes
      .filter(v => v.vote === 'invalid')
      .reduce((sum, v) => sum + parseFloat(v.stake_amount), 0);

    const totalStake = validStake + invalidStake;
    const winningVote = validStake >= invalidStake ? 'valid' : 'invalid';
    const losingStake = winningVote === 'valid' ? invalidStake : validStake;
    const winningStake = winningVote === 'valid' ? validStake : invalidStake;

    // Update case status
    const newStatus = winningVote === 'valid' ? 'verified' : 'rejected';
    
    await supabase
      .from('cases')
      .update({
        status: newStatus,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', caseId);

    // Calculate payouts
    const platformCut = losingStake * (PLATFORM_FEE_PERCENT / 100);
    const winnerPool = losingStake - platformCut;

    // Pay out winners
    const winners = votes.filter(v => v.vote === winningVote);
    const losers = votes.filter(v => v.vote !== winningVote);

    for (const winner of winners) {
      // Return stake + proportional share of loser pool
      const winnerStake = parseFloat(winner.stake_amount);
      const shareOfPool = (winnerStake / winningStake) * winnerPool;
      const totalPayout = winnerStake + shareOfPool;

      // Credit wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance, total_earned')
        .eq('user_id', winner.voter_id)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            balance: wallet.balance + totalPayout,
            total_earned: (wallet.total_earned || 0) + shareOfPool,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', winner.voter_id);

        await supabase.from('wallet_transactions').insert({
          user_id: winner.voter_id,
          type: 'stake_return',
          amount: totalPayout,
          description: `Verification win: ${winnerStake} stake + ${shareOfPool.toFixed(2)} reward`,
          reference_id: winner.id,
        });
      }

      // Update vote record
      await supabase
        .from('verification_votes')
        .update({
          payout_amount: totalPayout,
          payout_status: 'won',
        })
        .eq('id', winner.id);
    }

    // Mark losers
    for (const loser of losers) {
      await supabase
        .from('verification_votes')
        .update({
          payout_amount: 0,
          payout_status: 'lost',
        })
        .eq('id', loser.id);
    }

    // Credit platform fee to treasury
    if (platformCut > 0) {
      const { data: treasuryBalance } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'treasury_balance')
        .single();

      const currentBalance = treasuryBalance?.value ? JSON.parse(treasuryBalance.value) : 0;

      await supabase
        .from('platform_settings')
        .upsert({
          key: 'treasury_balance',
          value: JSON.stringify(currentBalance + platformCut),
          updated_at: new Date().toISOString(),
        });
    }

    // If verified, pay bounty to submitter
    if (newStatus === 'verified' && caseData.bounty_amount > 0) {
      const { data: submitterWallet } = await supabase
        .from('wallets')
        .select('balance, total_earned')
        .eq('user_id', caseData.submitter_id)
        .single();

      if (submitterWallet) {
        await supabase
          .from('wallets')
          .update({
            balance: submitterWallet.balance + caseData.bounty_amount,
            total_earned: (submitterWallet.total_earned || 0) + caseData.bounty_amount,
          })
          .eq('user_id', caseData.submitter_id);

        await supabase.from('wallet_transactions').insert({
          user_id: caseData.submitter_id,
          type: 'bounty_payout',
          amount: caseData.bounty_amount,
          description: `Bounty payout - case verified`,
        });
      }
    } else if (newStatus === 'rejected' && caseData.bounty_amount > 0) {
      // Rejected - distribute bounty to winners who voted invalid
      const invalidVoters = votes.filter(v => v.vote === 'invalid');
      const invalidTotal = invalidVoters.reduce((sum, v) => sum + parseFloat(v.stake_amount), 0);

      for (const voter of invalidVoters) {
        const share = (parseFloat(voter.stake_amount) / invalidTotal) * caseData.bounty_amount;
        
        const { data: voterWallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', voter.voter_id)
          .single();

        if (voterWallet) {
          await supabase
            .from('wallets')
            .update({ balance: voterWallet.balance + share })
            .eq('user_id', voter.voter_id);

          await supabase.from('wallet_transactions').insert({
            user_id: voter.voter_id,
            type: 'bounty_payout',
            amount: share,
            description: `Bounty share - correctly rejected case`,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      result: newStatus,
      stats: {
        totalVotes: votes.length,
        validStake,
        invalidStake,
        winnerPool,
        platformFee: platformCut,
      },
    });

  } catch (err: any) {
    console.error('[Resolve] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET - Check which cases need resolution
 */
export async function GET() {
  const { data: pendingCases } = await supabase
    .from('cases')
    .select('id, title, verification_closes_at')
    .eq('status', 'open')
    .lt('verification_closes_at', new Date().toISOString());

  return NextResponse.json({
    pendingResolution: pendingCases || [],
    count: pendingCases?.length || 0,
  });
}
