'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_emoji: string;
  tier: string;
  xp: number;
  verified_reports: number;
  x_handle?: string;
}

interface Wallet {
  id: string;
  doge_address: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  wallet: Wallet | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileData && !profileError) {
        setProfile(profileData);
      }

      let { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      // Auto-create wallet if it doesn't exist
      if (walletError && walletError.code === 'PGRST116') {
        console.log('[Auth] No wallet found, creating via API for user:', userId);
        try {
          const res = await fetch('/api/wallet/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
          const result = await res.json();
          
          if (result.wallet) {
            console.log('[Auth] Wallet created successfully:', result.wallet);
            walletData = result.wallet;
            walletError = null;
          } else {
            console.error('[Auth] Wallet creation failed:', result.error);
          }
        } catch (apiErr) {
          console.error('[Auth] Wallet API error:', apiErr);
        }
      }
      
      if (walletData && !walletError) {
        setWallet(walletData);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth loading timeout - forcing completion');
        setLoading(false);
      }
    }, 5000);

    const getSession = async () => {
      try {
        console.log('[Auth] Getting session via API...');
        
        // Use server-side API to get authenticated user data
        const res = await fetch('/api/wallet/me');
        const data = await res.json();
        
        console.log('[Auth] API response:', data.user ? `User ${data.user.id}` : 'No user');
        
        if (!mounted) return;
        
        if (data.user) {
          setUser(data.user);
          setSession({ user: data.user } as any);
          
          if (data.profile) {
            console.log('[Auth] Profile loaded:', data.profile.handle);
            setProfile(data.profile);
          }
          
          if (data.wallet) {
            console.log('[Auth] Wallet loaded:', data.wallet.id);
            setWallet(data.wallet);
          }
        } else {
          console.log('[Auth] No authenticated user');
          setUser(null);
          setSession(null);
        }
      } catch (err: any) {
        // Ignore AbortError - happens with React StrictMode double-mount
        if (err?.name === 'AbortError') return;
        console.error('[Auth] Error getting session:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setWallet(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setWallet(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        wallet,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
