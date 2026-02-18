'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo, LogoWordmark } from '@/components/ui/Logo';
import { WalletBadge } from '@/components/wallet/WalletBadge';
import { useAuth } from '@/lib/auth/AuthProvider';
import { 
  Home, 
  Search, 
  Dog, 
  FolderOpen, 
  Trophy, 
  Wallet, 
  User,
  LogOut,
  Menu,
  X,
  Heart,
  Stamp
} from 'lucide-react';
import { useState } from 'react';
import { TipJarButton } from '@/components/tips';
import { Disclaimer } from '@/components/legal/Disclaimer';

const navItems = [
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/sniffer', label: 'The Sniffer', icon: Search },
  { href: '/bloodhound', label: 'Bloodhound AI', icon: Dog },
  { href: '/cases', label: 'Case Files', icon: FolderOpen },
  { href: '/inscription', label: 'Inscribe', icon: Stamp },
  { href: '/pack', label: 'Pack Rank', icon: Trophy },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/devhouse', label: 'Dev House', icon: Heart },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, wallet, signOut, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Public pages that don't require auth (sniffer is public for SEO/sharing)
  const isPublicPage = pathname.startsWith('/sniffer');

  const handleSignOut = async () => {
    console.log('[Layout] Sign out clicked');
    try {
      await signOut();
      console.log('[Layout] Sign out successful, redirecting...');
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('[Layout] Sign out error:', err);
      // Force redirect anyway
      window.location.href = '/';
    }
  };

  // Show loading only for protected pages
  if (loading && !isPublicPage) {
    return (
      <div className="min-h-screen bg-doge-bg flex items-center justify-center">
        <Logo size={60} sniff />
      </div>
    );
  }
  
  // For public pages without auth, show simplified layout
  if (!user && isPublicPage) {
    return (
      <div className="min-h-screen bg-doge-bg">
        {/* Simple header for public pages */}
        <header className="sticky top-0 z-40 bg-doge-panel/90 backdrop-blur-sm border-b border-doge-border">
          <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
            <Link href="/">
              <LogoWordmark size={28} glow />
            </Link>
            <div className="flex items-center gap-3">
              <Link 
                href="/login" 
                className="px-4 py-2 text-sm font-medium text-doge-muted hover:text-doge-gold transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/signup" 
                className="px-4 py-2 text-sm font-medium bg-doge-gold text-doge-bg rounded-lg hover:bg-doge-gold/90 transition-colors"
              >
                Join the Pack
              </Link>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6">
          {children}
        </main>
        <Disclaimer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex relative z-10">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-doge-border bg-doge-panel/95 backdrop-blur-sm relative z-20">
        {/* Logo */}
        <div className="p-4 border-b border-doge-border">
          <Link href="/">
            <LogoWordmark size={28} glow />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-doge-gold/20 text-doge-gold border border-doge-gold/30'
                    : 'text-doge-muted hover:text-doge-text hover:bg-doge-border/50'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Support */}
        <div className="px-4 mb-2">
          <TipJarButton variant="ghost" size="sm" className="w-full justify-start text-doge-muted hover:text-doge-gold" />
        </div>

        {/* User section */}
        <div className="p-4 border-t border-doge-border space-y-2">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-doge-muted hover:text-risk-high hover:bg-risk-high/10 transition-colors w-full"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen relative z-20">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-doge-panel/90 backdrop-blur-sm border-b border-doge-border">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-doge-muted hover:text-doge-gold"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile logo */}
            <Link href="/" className="md:hidden">
              <Logo size={36} glow />
            </Link>

            {/* Page title for desktop */}
            <div className="hidden md:block">
              <h1 className="text-doge-muted text-sm font-mono">
                {navItems.find(item => pathname.startsWith(item.href))?.label || 'DogeWatch'}
              </h1>
            </div>

            {/* Header right - Support + Wallet Badge */}
            <div className="flex items-center gap-3">
              <TipJarButton variant="secondary" size="sm" />
              <WalletBadge 
                balance={wallet?.balance || 0} 
                onClick={() => router.push('/wallet')} 
              />
            </div>
          </div>
        </header>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-doge-bg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-doge-border">
              <LogoWordmark size={24} />
              <button
                className="p-2 text-doge-muted hover:text-doge-gold"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={24} />
              </button>
            </div>
            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-doge-gold/20 text-doge-gold'
                        : 'text-doge-muted hover:text-doge-text hover:bg-doge-border/50'
                    }`}
                  >
                    <Icon size={24} />
                    <span className="font-medium text-lg">{item.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-doge-muted hover:text-risk-high hover:bg-risk-high/10 transition-colors w-full mt-4"
              >
                <LogOut size={24} />
                <span className="font-medium text-lg">Sign Out</span>
              </button>
            </nav>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 bg-transparent">
          {children}
        </main>

        {/* Legal Disclaimer Footer */}
        <Disclaimer />
      </div>
    </div>
  );
}
