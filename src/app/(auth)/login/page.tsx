'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/feed';
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(redirect);
    }
  };

  return (
    <Panel variant="elevated">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg text-risk-high text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div>
          <label className="block text-doge-muted text-sm mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-doge-muted" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-doge-bg border border-doge-border rounded-lg py-3 pl-10 pr-4 text-doge-text placeholder:text-doge-muted focus:outline-none focus:border-doge-gold"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={loading}
        >
          {loading ? (
            <>
              <Logo size={20} sniff /> Sniffing credentials...
            </>
          ) : (
            <>
              Login <ArrowRight size={18} />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-doge-border text-center">
        <p className="text-doge-muted">
          New to the pack?{' '}
          <Link href="/signup" className="text-doge-gold hover:underline">
            Join DogeWatch
          </Link>
        </p>
      </div>
    </Panel>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-doge-bg flex items-center justify-center p-4 relative z-20">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Logo size={80} glow className="mx-auto mb-4" />
          </Link>
          <h1 className="font-doge text-3xl font-bold text-doge-gold">Welcome Back</h1>
          <p className="text-doge-muted mt-2">The pack is waiting</p>
        </div>

        {/* Login Form with Suspense */}
        <Suspense fallback={
          <Panel variant="elevated">
            <div className="flex justify-center py-8">
              <Logo size={40} sniff />
            </div>
          </Panel>
        }>
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <p className="text-center text-doge-muted text-xs mt-6 font-mono">
          🐕 All bounties paid in DOGE
        </p>
      </div>
    </div>
  );
}
