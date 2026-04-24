import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * EduBridge brand mark — a refined isometric cube.
 * A clean 3D cube wireframe (hexagon outline + Y-shaped internal edges)
 * that reads as a structured, geometric "knowledge block".
 * Uses currentColor so it inherits from text color.
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
      {/* Hexagon — the cube's silhouette */}
      <path d="M8 1.5 L13.6 4.75 L13.6 11.25 L8 14.5 L2.4 11.25 L2.4 4.75 Z" />
      {/* Three internal edges meeting at the front-top vertex (the cube's "Y") */}
      <path d="M8 8 L8 1.5" />
      <path d="M8 8 L13.6 4.75" />
      <path d="M8 8 L2.4 4.75" />
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
