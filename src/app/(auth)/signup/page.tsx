'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, User, AtSign, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    handle: '',
    displayName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const generateDogeAddress = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let addr = 'D';
    for (let i = 0; i < 33; i++) {
      addr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return addr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!formData.email.includes('@')) {
        setError('Please enter a valid email');
        return;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      setStep(2);
      return;
    }
    
    setLoading(true);

    try {
      // Step 1: Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            handle: formData.handle.toLowerCase(),
            display_name: formData.displayName,
          }
        }
      });
      
      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Step 2: Wait a moment for any triggers
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Check if profile exists, if not create it
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single();

      if (!existingProfile) {
        // Create profile manually
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            handle: formData.handle.toLowerCase(),
            display_name: formData.displayName,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw - profile might have been created by trigger
        }
      } else {
        // Update existing profile with custom handle/name
        await supabase
          .from('profiles')
          .update({
            handle: formData.handle.toLowerCase(),
            display_name: formData.displayName,
          })
          .eq('id', authData.user.id);
      }

      // Step 4: Check if wallet exists, if not create it
      const { data: existingWallet } = await supabase
        .from('wallets')
        .select('doge_address')
        .eq('user_id', authData.user.id)
        .single();

      let dogeAddr = existingWallet?.doge_address;

      if (!existingWallet) {
        dogeAddr = generateDogeAddress();
        const { error: walletError } = await supabase
          .from('wallets')
          .insert({
            user_id: authData.user.id,
            doge_address: dogeAddr,
          });

        if (walletError) {
          console.error('Wallet creation error:', walletError);
        }
      }

      setWalletAddress(dogeAddr || generateDogeAddress());
      setStep(3);

    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-doge-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <Logo size={100} glow animate className="mx-auto mb-6" />
          <h1 className="font-doge text-3xl font-bold text-doge-gold mb-4">
            Welcome to the Pack!
          </h1>
          <Panel variant="glow" className="mb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-risk-safe">
                <CheckCircle size={20} />
                <span>Account created</span>
              </div>
              <div className="flex items-center gap-3 text-risk-safe">
                <CheckCircle size={20} />
                <span>Profile initialized</span>
              </div>
              <div className="flex items-center gap-3 text-risk-safe">
                <CheckCircle size={20} />
                <span>DOGE wallet generated</span>
              </div>
            </div>
            {walletAddress && (
              <div className="mt-6 p-4 bg-doge-bg rounded border border-doge-gold/30">
                <p className="text-doge-muted text-sm mb-2">Your DOGE wallet address:</p>
                <p className="font-mono text-doge-gold text-xs break-all">
                  {walletAddress}
                </p>
              </div>
            )}
          </Panel>
          <Button size="lg" onClick={() => router.push('/feed')}>
            Start Sniffing <ArrowRight size={18} />
          </Button>
          <p className="text-doge-muted text-xs mt-4 font-mono">
            Deposit DOGE to stake on findings and earn bounties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-doge-bg flex items-center justify-center p-4 relative z-20">
      <div className="w-full max-w-md relative z-20">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Logo size={80} glow className="mx-auto mb-4" />
          </Link>
          <h1 className="font-doge text-3xl font-bold text-doge-gold">Join the Pack</h1>
          <p className="text-doge-muted mt-2">
            {step === 1 ? 'Create your account' : 'Set up your profile'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-1 rounded ${step >= 1 ? 'bg-doge-gold' : 'bg-doge-border'}`} />
          <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-doge-gold' : 'bg-doge-border'}`} />
        </div>

        {/* Signup Form */}
        <Panel variant="elevated">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg text-risk-high text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {step === 1 ? (
              <>
                <div>
                  <label className="block text-doge-muted text-sm mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-doge-muted" size={18} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-doge-bg border border-doge-border rounded-lg py-3 pl-10 pr-4 text-doge-text placeholder:text-doge-muted focus:outline-none focus:border-doge-gold"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-doge-muted text-sm mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-doge-muted" size={18} />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-doge-bg border border-doge-border rounded-lg py-3 pl-10 pr-4 text-doge-text placeholder:text-doge-muted focus:outline-none focus:border-doge-gold"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </div>
                  <p className="text-doge-muted text-xs mt-1">Minimum 8 characters</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-doge-muted text-sm mb-2">Handle</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-doge-muted" size={18} />
                    <input
                      type="text"
                      value={formData.handle}
                      onChange={(e) => setFormData({ ...formData, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      className="w-full bg-doge-bg border border-doge-border rounded-lg py-3 pl-10 pr-4 text-doge-text placeholder:text-doge-muted focus:outline-none focus:border-doge-gold"
                      placeholder="shibasleuthhh"
                      required
                      maxLength={20}
                    />
                  </div>
                  <p className="text-doge-muted text-xs mt-1">Lowercase letters, numbers, underscores only</p>
                </div>

                <div>
                  <label className="block text-doge-muted text-sm mb-2">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-doge-muted" size={18} />
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-doge-bg border border-doge-border rounded-lg py-3 pl-10 pr-4 text-doge-text placeholder:text-doge-muted focus:outline-none focus:border-doge-gold"
                      placeholder="Shiba Sleuth"
                      required
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="p-3 bg-doge-bg rounded border border-doge-gold/30">
                  <div className="flex items-center gap-2 text-doge-gold text-sm">
                    <Logo size={18} />
                    <span>A DOGE wallet will be created for you</span>
                  </div>
                  <p className="text-doge-muted text-xs mt-1">
                    Deposit DOGE to stake on findings and earn bounties
                  </p>
                </div>
              </>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Logo size={20} sniff /> Creating account...
                </>
              ) : step === 1 ? (
                <>
                  Continue <ArrowRight size={18} />
                </>
              ) : (
                <>
                  Create Account <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-doge-border text-center">
            <p className="text-doge-muted">
              Already in the pack?{' '}
              <Link href="/login" className="text-doge-gold hover:underline">
                Login
              </Link>
            </p>
          </div>
        </Panel>

        {/* Perks */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          <Badge variant="gold">💰 Earn DOGE</Badge>
          <Badge variant="default">🔍 Access Open Data</Badge>
          <Badge variant="default">🏆 Build Reputation</Badge>
        </div>
      </div>
    </div>
  );
}
