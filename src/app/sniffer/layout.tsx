import Link from 'next/link';

export default function SnifferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-doge-bg">
      {/* Simple header */}
      <header className="sticky top-0 z-40 bg-doge-panel/90 backdrop-blur-sm border-b border-doge-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo/doge-v2-64.png" alt="DogeWatch" width={32} height={32} />
            <span className="font-doge text-xl font-bold text-doge-gold">DogeWatch</span>
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
      <main className="p-4 md:p-6 max-w-6xl mx-auto">
        {children}
      </main>
      <footer className="text-center text-xs text-doge-muted py-8 border-t border-doge-border">
        <p>DogeWatch is for educational and informational purposes only.</p>
        <p className="mt-1">Data source: CMS Medicare Provider Data</p>
      </footer>
    </div>
  );
}
