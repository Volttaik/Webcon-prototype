import { Box } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * EduBridge brand mark — uses the lucide `Box` cube icon.
 * Bumped stroke width gives it a confident, premium look while keeping
 * perfect alignment with the rest of the lucide icon set.
 * Inherits color via `currentColor`.
 */
export function Logo({ className, size, strokeWidth = 1.9 }: LogoProps) {
  return (
    <Box
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      width={size}
      height={size}
      aria-hidden
    />
  );
}

/**
 * Filled badge variant — a polished container around the cube for hero
 * placement. Solid surface, subtle elevation, no glass effects.
 */
export function LogoBadge({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-foreground flex items-center justify-center shadow-elevation-md',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Box
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-background"
        width={size * 0.55}
        height={size * 0.55}
      />
    </div>
  );
}

export default Logo;
