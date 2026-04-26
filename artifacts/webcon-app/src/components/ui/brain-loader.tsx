import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrainLoaderProps = {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  showDots?: boolean;
  className?: string;
};

const SIZE_MAP = {
  xs: { wrap: 'w-7 h-7', icon: 'h-3 w-3', radius: '0.55rem', pad: '2px' },
  sm: { wrap: 'w-10 h-10', icon: 'h-4 w-4', radius: '0.7rem', pad: '2px' },
  md: { wrap: 'w-14 h-14', icon: 'h-6 w-6', radius: '0.9rem', pad: '2.5px' },
  lg: { wrap: 'w-20 h-20', icon: 'h-9 w-9', radius: '1.25rem', pad: '3px' },
} as const;

export function BrainLoader({ size = 'sm', label, showDots = false, className }: BrainLoaderProps) {
  const s = SIZE_MAP[size];
  return (
    <div
      className={cn('inline-flex flex-col items-center gap-2', className)}
      role="status"
      aria-label={label || 'Loading'}
    >
      <div
        className={cn('brain-tracer-outer', s.wrap)}
        style={{ borderRadius: s.radius, padding: s.pad }}
      >
        <div
          className="brain-tracer-inner w-full h-full"
          style={{ borderRadius: `calc(${s.radius} - ${s.pad})` }}
        >
          <Brain className={cn(s.icon, 'text-foreground/80')} strokeWidth={1.4} />
        </div>
      </div>
      {label && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-medium tracking-wide">{label}</span>
          {showDots && (
            <div className="flex items-center gap-0.5">
              <span className="splash-dot block w-1 h-1 rounded-full bg-muted-foreground/60" />
              <span className="splash-dot block w-1 h-1 rounded-full bg-muted-foreground/60" />
              <span className="splash-dot block w-1 h-1 rounded-full bg-muted-foreground/60" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BrainLoader;
