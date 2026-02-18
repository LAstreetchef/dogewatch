'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ 
        backgroundColor: '#0d0a04', 
        color: '#e8dcc8',
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🐕💥</div>
          <h2 style={{ color: '#FFD700', fontSize: '1.5rem', marginBottom: '1rem' }}>
            DogeWatch crashed!
          </h2>
          <div style={{
            backgroundColor: '#1a1207',
            border: '1px solid #2a2215',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'left',
          }}>
            <p style={{ 
              fontSize: '0.875rem', 
              fontFamily: 'monospace',
              color: '#8a7a5a',
              wordBreak: 'break-all',
            }}>
              {error.message || 'Unknown error'}
            </p>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', color: '#5a4a3a', marginTop: '0.5rem' }}>
                Digest: {error.digest}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            style={{
              backgroundColor: '#FFD700',
              color: '#0d0a04',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
