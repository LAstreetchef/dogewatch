'use client';

import { useEffect } from 'react';

/**
 * Suppresses AbortError from unhandled promise rejections.
 * These are caused by React StrictMode + Supabase auth double-mounting.
 */
export function ErrorSuppressor() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'AbortError') {
        event.preventDefault();
      }
    };
    
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);
  
  return null;
}
