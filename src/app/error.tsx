'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-doge-bg flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4">🐕💥</div>
        <h2 className="text-2xl font-doge text-doge-gold mb-4">Something went wrong!</h2>
        <div className="bg-doge-panel border border-doge-border rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-doge-muted font-mono break-all">
            {error.message || 'Unknown error'}
          </p>
          {error.digest && (
            <p className="text-xs text-doge-muted/50 mt-2">
              Digest: {error.digest}
            </p>
          )}
        </div>
        <button
          onClick={reset}
          className="px-6 py-3 bg-doge-gold text-doge-bg font-bold rounded-lg hover:bg-doge-gold-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
