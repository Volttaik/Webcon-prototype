import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * EduBridge brand mark — a stylized bridge (arch + deck + pillars)
 * Uses currentColor so it inherits from text color, matching the app's minimal aesthetic.
 */
export function Logo({ className, size, strokeWidth = 1.4 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      width={size}
      height={size}
      aria-hidden="true"
    >
      {/* Arch — the bridge */}
      <path d="M2.5 11.5 V8.5 Q2.5 4 8 4 Q13.5 4 13.5 8.5 V11.5" />
      {/* Bridge deck */}
      <path d="M1 12 H15" />
      {/* Pillars */}
      <path d="M5 12 V14" />
      <path d="M11 12 V14" />
    </svg>
  );
}

/**
 * Filled badge variant — used when we want a contained brand mark on hero/landing.
 */
export function LogoBadge({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-foreground flex items-center justify-center shadow-elevation-md',
        className
      )}
      style={{ width: size, height: size }}
    >
      <span className="text-background flex" style={{ width: size * 0.55, height: size * 0.55 }}>
        <Logo strokeWidth={1.6} className="w-full h-full" />
      </span>
    </div>
  );
}

export default Logo;
