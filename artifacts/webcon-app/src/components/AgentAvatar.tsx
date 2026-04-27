import { Box } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  name, avatarUrl, size = 36, className, onClick, title,
}: Props) {
  const interactive = !!onClick;
  const radius = Math.max(6, Math.round(size * 0.22));

  if (avatarUrl) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        title={title ?? name}
        aria-label={name}
        className={cn(
          'relative shrink-0 overflow-hidden border border-border shadow-elevation-sm',
          interactive && 'cursor-pointer hover:ring-2 hover:ring-foreground/20 transition-all',
          !interactive && 'cursor-default',
          className,
        )}
        style={{ width: size, height: size, borderRadius: radius }}
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

  // Default: minimal cube icon (no initials, no 3D)
  const iconSize = Math.max(10, Math.round(size * 0.5));

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      title={title ?? (interactive ? `Set profile picture for ${name}` : name)}
      aria-label={name}
      className={cn(
        'relative shrink-0 inline-flex items-center justify-center border border-border bg-secondary/60 text-foreground/70 shadow-elevation-sm select-none',
        interactive && 'cursor-pointer hover:bg-secondary hover:text-foreground hover:border-foreground/25 transition-colors',
        !interactive && 'cursor-default',
        className,
      )}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <Box
        style={{ width: iconSize, height: iconSize }}
        strokeWidth={1.5}
      />
    </button>
  );
}

export function agentColors(_seed: string | number | null | undefined) {
  return { top: 'transparent', left: 'transparent', right: 'transparent' };
}
