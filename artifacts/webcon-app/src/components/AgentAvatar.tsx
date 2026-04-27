import { cn } from '@/lib/utils';

const PALETTE: Array<{ top: string; left: string; right: string }> = [
  { top: 'hsl(230 70% 64%)', left: 'hsl(230 60% 46%)', right: 'hsl(230 55% 36%)' },
  { top: 'hsl(260 70% 66%)', left: 'hsl(260 60% 48%)', right: 'hsl(260 55% 38%)' },
  { top: 'hsl(200 70% 60%)', left: 'hsl(200 60% 44%)', right: 'hsl(200 55% 34%)' },
  { top: 'hsl(340 70% 64%)', left: 'hsl(340 60% 46%)', right: 'hsl(340 55% 36%)' },
  { top: 'hsl(160 60% 56%)', left: 'hsl(160 50% 40%)', right: 'hsl(160 45% 30%)' },
  { top: 'hsl(25 75% 60%)', left: 'hsl(25 65% 44%)', right: 'hsl(25 60% 34%)' },
  { top: 'hsl(45 80% 60%)', left: 'hsl(45 70% 44%)', right: 'hsl(45 65% 34%)' },
  { top: 'hsl(290 60% 64%)', left: 'hsl(290 50% 46%)', right: 'hsl(290 45% 36%)' },
  { top: 'hsl(180 55% 56%)', left: 'hsl(180 45% 40%)', right: 'hsl(180 40% 30%)' },
  { top: 'hsl(0 70% 62%)', left: 'hsl(0 60% 46%)', right: 'hsl(0 55% 36%)' },
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function agentColors(seed: string | number | null | undefined) {
  const idx = hashString(String(seed ?? 'agent')) % PALETTE.length;
  return PALETTE[idx];
}

interface Props {
  id: number | string;
  name: string;
  subject?: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export default function AgentAvatar({
  id, name, subject, avatarUrl, size = 36, className, onClick, title,
}: Props) {
  const colors = agentColors(`${id}:${subject ?? ''}`);
  const interactive = !!onClick;

  // Image avatar mode
  if (avatarUrl) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        title={title ?? name}
        aria-label={name}
        className={cn(
          'relative shrink-0 overflow-hidden rounded-xl border border-border shadow-elevation-sm',
          interactive && 'cursor-pointer hover:ring-2 hover:ring-foreground/20 transition-all',
          !interactive && 'cursor-default',
          className,
        )}
        style={{ width: size, height: size }}
      >
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </button>
    );
  }

  // Cube mode — isometric three-face cube using CSS transforms
  // Container is square `size`; the cube is inscribed inside with padding.
  const pad = Math.max(2, Math.round(size * 0.12));
  const cubeSide = size - pad * 2;
  const half = cubeSide / 2;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      title={title ?? name}
      aria-label={name}
      className={cn(
        'relative shrink-0 inline-flex items-center justify-center rounded-xl border border-border shadow-elevation-sm select-none',
        interactive && 'cursor-pointer hover:ring-2 hover:ring-foreground/20 transition-all',
        !interactive && 'cursor-default',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: 'transparent',
        perspective: `${size * 4}px`,
      }}
    >
      <div
        style={{
          width: cubeSide,
          height: cubeSide,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateX(-22deg) rotateY(38deg)`,
        }}
      >
        {/* top face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: colors.top,
            transform: `rotateX(90deg) translateZ(${half}px)`,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
            borderRadius: 2,
          }}
        />
        {/* left face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: colors.left,
            transform: `translateZ(${half}px)`,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10)',
            borderRadius: 2,
          }}
        />
        {/* right face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: colors.right,
            transform: `rotateY(90deg) translateZ(${half}px)`,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)',
            borderRadius: 2,
          }}
        />
      </div>
    </button>
  );
}
