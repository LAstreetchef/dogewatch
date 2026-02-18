import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MIN_BOUNTY = 0;
const DEFAULT_VERIFICATION_HOURS = 72;

/**
 * GET - List cases with filters
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'open' | 'verified' | 'rejected' | 'all'
  const submitterId = searchParams.get('submitterId');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (submitterId) {
    query = query.eq('submitter_id', submitterId);
  }

  const { data: cases, error } = await query;

  if (error) {
    console.error('[Cases] List error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cases });
}

/**
 * POST - Create a new case
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      submitterId,
      title,
      summary,
      evidence,
      providerNpi,
      providerName,
      bountyAmount,
      verificationHours,
    } = body;

    // Validation
    if (!submitterId || !title || !summary) {
      return NextResponse.json(
        { error: 'submitterId, title, and summary are required' },
        { status: 400 }
      );
    }

    const hours = verificationHours || DEFAULT_VERIFICATION_HOURS;
    const bounty = parseFloat(bountyAmount) || 0;

    // If bounty > 0, check user has enough balance
    if (bounty > 0) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', submitterId)
        .single();

      if (!wallet || wallet.balance < bounty) {
        return NextResponse.json(
          { error: 'Insufficient balance for bounty' },
          { status: 402 }
        );
      }

      // Deduct bounty from wallet
      await supabase
        .from('wallets')
        .update({ 
          balance: wallet.balance - bounty,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', submitterId);

      // Log transaction
      await supabase.from('wallet_transactions').insert({
        user_id: submitterId,
        type: 'bounty_posted',
        amount: -bounty,
        description: `Bounty for case: ${title.slice(0, 50)}`,
      });
    }

    // Create case
    const { data: newCase, error } = await supabase
      .from('cases')
      .insert({
        submitter_id: submitterId,
        title,
        summary,
        evidence: evidence || null,
        provider_npi: providerNpi || null,
        provider_name: providerName || null,
        bounty_amount: bounty,
        verification_closes_at: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Cases] Create error:', error);
      // Refund bounty if case creation failed
      if (bounty > 0) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', submitterId)
          .single();
        
        if (wallet) {
          await supabase
            .from('wallets')
            .update({ balance: wallet.balance + bounty })
            .eq('user_id', submitterId);
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      case: newCase,
    });

  } catch (err: any) {
    console.error('[Cases] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
