import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated', user: null }, { status: 401 });
    }

    // Fetch wallet using service role to bypass RLS
    const serviceSupabase = (await import('@supabase/supabase-js')).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let { data: wallet, error: walletError } = await serviceSupabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Auto-create wallet if doesn't exist
    if (walletError && walletError.code === 'PGRST116') {
      const { data: newWallet, error: createError } = await serviceSupabase
        .from('wallets')
        .insert({
          user_id: user.id,
          balance: 0,
          total_earned: 0,
          total_spent: 0,
        })
        .select()
        .single();

      if (!createError && newWallet) {
        wallet = newWallet;
      }
    }

    // Also fetch profile
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      wallet,
      profile,
    });

  } catch (err) {
    console.error('[Wallet/Me] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
