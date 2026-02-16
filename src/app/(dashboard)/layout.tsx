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
  X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/sniffer', label: 'The Sniffer', icon: Search },
  { href: '/bloodhound', label: 'Bloodhound AI', icon: Dog },
  { href: '/cases', label: 'Case Files', icon: FolderOpen },
  { href: '/pack', label: 'Pack Rank', icon: Trophy },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
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

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-doge-bg flex items-center justify-center">
        <Logo size={60} sniff />
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

        {/* User section */}
        <div className="p-4 border-t border-doge-border space-y-2">
          {profile && (
            <Link
              href={`/profile/${profile.handle}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-doge-muted hover:text-doge-text hover:bg-doge-border/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-doge-border flex items-center justify-center text-lg">
                {profile.avatar_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-doge-text truncate">
                  {profile.display_name}
                </div>
                <div className="text-xs text-doge-muted truncate">
                  @{profile.handle}
                </div>
              </div>
            </Link>
          )}
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

            {/* Header right - Wallet Badge */}
            <div className="flex items-center gap-4">
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
      </div>
    </div>
  );
}
