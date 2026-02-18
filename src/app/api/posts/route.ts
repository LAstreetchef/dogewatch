import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET - Fetch posts
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sort') || 'hot';
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('posts')
    .select('*')
    .range(offset, offset + limit - 1);

  if (type) {
    query = query.eq('type', type);
  }

  // Sort by hot (engagement) or new
  if (sortBy === 'hot') {
    query = query.order('hot_score', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data: posts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch author profiles
  if (posts && posts.length > 0) {
    const authorIds = [...new Set(posts.map(p => p.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_emoji, tier')
      .in('id', authorIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    // Attach author info to posts
    for (const post of posts) {
      post.author = profileMap.get(post.author_id) || null;
    }
  }

  return NextResponse.json({ posts });
}

/**
 * POST - Create a new post
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authorId, type, title, body: content, tags, providerNpi, bountyAmount } = body;

    if (!authorId || !content) {
      return NextResponse.json(
        { error: 'authorId and body are required' },
        { status: 400 }
      );
    }

    const validTypes = ['finding', 'analysis', 'discussion', 'bounty'];
    const postType = validTypes.includes(type) ? type : 'discussion';

    // Handle bounty deduction if applicable
    if (bountyAmount && bountyAmount > 0) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', authorId)
        .single();

      if (!wallet || wallet.balance < bountyAmount) {
        return NextResponse.json(
          { error: 'Insufficient balance for bounty' },
          { status: 402 }
        );
      }

      // Deduct bounty
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance - bountyAmount })
        .eq('user_id', authorId);
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        author_id: authorId,
        type: postType,
        title: title || null,
        body: content,
        tags: tags || [],
        provider_npi: providerNpi || null,
        bounty_amount: bountyAmount || 0,
        hot_score: 0,
        like_count: 0,
        comment_count: 0,
        repost_count: 0,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Posts] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log bounty transaction if applicable
    if (bountyAmount && bountyAmount > 0) {
      await supabase.from('wallet_transactions').insert({
        user_id: authorId,
        type: 'bounty_post',
        amount: -bountyAmount,
        description: `Bounty on post: ${title || content.slice(0, 30)}...`,
        reference_id: post.id,
      });
    }

    return NextResponse.json({ success: true, post });

  } catch (err: any) {
    console.error('[Posts] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
