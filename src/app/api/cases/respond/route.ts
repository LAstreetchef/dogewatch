import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST - Add a response/comment to a case
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, responderId, responseType, content, evidenceUrls } = body;

    if (!caseId || !content) {
      return NextResponse.json(
        { error: 'caseId and content are required' },
        { status: 400 }
      );
    }

    const validTypes = ['comment', 'defense', 'evidence', 'official'];
    const type = validTypes.includes(responseType) ? responseType : 'comment';

    const { data: response, error } = await supabase
      .from('case_responses')
      .insert({
        case_id: caseId,
        responder_id: responderId || null,
        response_type: type,
        content,
        evidence_urls: evidenceUrls || null,
      })
      .select(`
        *,
        responder:profiles!responder_id(handle, display_name, avatar_emoji, tier)
      `)
      .single();

    if (error) {
      console.error('[Response] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, response });

  } catch (err: any) {
    console.error('[Response] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET - Get responses for a case
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('caseId');

  if (!caseId) {
    return NextResponse.json({ error: 'caseId required' }, { status: 400 });
  }

  const { data: responses, error } = await supabase
    .from('case_responses')
    .select(`
      *,
      responder:profiles!responder_id(handle, display_name, avatar_emoji, tier)
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ responses });
}
