'use client';

import Link from 'next/link';

export function Disclaimer() {
  return (
    <div className="border-t border-doge-border bg-doge-bg/50 py-6 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs text-doge-muted mb-3">
          <strong>Disclaimer:</strong> DogeWatch is an independent research platform analyzing publicly 
          available government data. Statistical anomalies do not constitute accusations of fraud or 
          wrongdoing. All data is sourced from CMS public records. Users are responsible for their own 
          conclusions and posts.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs">
          <Link href="/terms" className="text-doge-muted hover:text-doge-gold transition-colors">
            Terms of Service
          </Link>
          <span className="text-doge-border">|</span>
          <Link href="/privacy" className="text-doge-muted hover:text-doge-gold transition-colors">
            Privacy Policy
          </Link>
          <span className="text-doge-border">|</span>
          <span className="text-doge-muted">
            Data Source: CMS Medicare Provider Data
          </span>
        </div>
        <p className="text-xs text-doge-muted/50 mt-3">
          Protected by Section 230 of the Communications Decency Act
        </p>
      </div>
    </div>
  );
}
