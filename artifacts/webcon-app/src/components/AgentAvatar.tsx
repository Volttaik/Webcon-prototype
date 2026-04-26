import { cn } from '@/lib/utils';

const PALETTE: Array<[string, string]> = [
  ['hsl(230 60% 22%)', 'hsl(230 75% 76%)'],
  ['hsl(260 60% 22%)', 'hsl(260 75% 78%)'],
  ['hsl(200 60% 20%)', 'hsl(200 70% 72%)'],
  ['hsl(340 55% 22%)', 'hsl(340 70% 76%)'],
  ['hsl(160 50% 18%)', 'hsl(160 60% 68%)'],
  ['hsl(25 55% 20%)', 'hsl(25 70% 72%)'],
  ['hsl(45 60% 20%)', 'hsl(45 70% 72%)'],
  ['hsl(290 50% 22%)', 'hsl(290 65% 76%)'],
  ['hsl(180 50% 18%)', 'hsl(180 60% 68%)'],
  ['hsl(0 55% 22%)', 'hsl(0 70% 76%)'],
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function agentColors(seed: string | number | null | undefined): { bg: string; fg: string } {
  const key = String(seed ?? 'agent');
  const idx = hashString(key) % PALETTE.length;
  const [bg, fg] = PALETTE[idx];
  return { bg, fg };
}

function initialsFor(name: string, subject?: string): string {
  const cleaned = (name || '').replace(/\s*\bby\b\s+.*$/i, '').trim();
  if (cleaned) {
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (subject || 'AG').slice(0, 2).toUpperCase();
}

interface Props {
  id: number | string;
  name: string;
  subject?: string;
  size?: number;
  className?: string;
}

export default function AgentAvatar({ id, name, subject, size = 36, className }: Props) {
  const { bg, fg } = agentColors(`${id}:${subject ?? ''}`);
  const initials = initialsFor(name, subject);
  const fontSize = Math.round(size * 0.4);
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-xl border border-border shadow-elevation-sm shrink-0 select-none', className)}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize,
        fontWeight: 600,
        letterSpacing: '-0.5px',
        lineHeight: 1,
      }}
      aria-label={name}
    >
      {initials}
    </span>
  );
}
