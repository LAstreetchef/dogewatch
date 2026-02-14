'use client';

// Using regular img to bypass Next.js image cache

interface LogoProps {
  size?: number;
  glow?: boolean;
  animate?: boolean;
  sniff?: boolean;
  className?: string;
}

export function Logo({ 
  size = 32, 
  glow = false, 
  animate = false, 
  sniff = false,
  className = '' 
}: LogoProps) {
  // Pick appropriate size variant for optimization
  const getSrc = () => {
    if (size <= 64) return '/logo/watchdog-64.png';
    if (size <= 128) return '/logo/watchdog-128.png';
    if (size <= 256) return '/logo/watchdog-256.png';
    if (size <= 512) return '/logo/watchdog-512.png';
    return '/logo/watchdog.png';
  };

  return (
    <img
      src={getSrc()}
      alt="DogeWatch"
      width={size}
      height={size}
      className={`
        ${glow ? 'drop-shadow-[0_0_20px_#FFD70044]' : ''}
        ${animate ? 'animate-pulse' : ''}
        ${sniff ? 'animate-sniff' : ''}
        ${className}
      `}
    />
  );
}

// Wordmark variant with logo + text
export function LogoWordmark({ 
  size = 28, 
  glow = false,
  className = '' 
}: Omit<LogoProps, 'animate' | 'sniff'>) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo size={size} glow={glow} />
      <span 
        className="font-doge font-bold tracking-wide text-doge-gold"
        style={{ fontSize: size * 0.7 }}
      >
        DOGEWATCH
      </span>
    </div>
  );
}
