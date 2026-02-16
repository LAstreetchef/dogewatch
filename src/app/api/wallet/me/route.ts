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

    // Auto-create wallet with real DOGE address if doesn't exist
    if (walletError && walletError.code === 'PGRST116') {
      // Generate real Dogecoin address
      const generateRes = await fetch(new URL('/api/wallet/generate', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (generateRes.ok) {
        // Fetch the newly created wallet
        const { data: newWallet } = await serviceSupabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (newWallet) {
          wallet = newWallet;
        }
      }
    }
    
    // If wallet exists but has no real address, generate one
    if (wallet && (!wallet.doge_address || !wallet.doge_address.startsWith('D') || wallet.doge_address.length !== 34)) {
      const generateRes = await fetch(new URL('/api/wallet/generate', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (generateRes.ok) {
        // Refetch wallet with new address
        const { data: updatedWallet } = await serviceSupabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (updatedWallet) {
          wallet = updatedWallet;
        }
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
