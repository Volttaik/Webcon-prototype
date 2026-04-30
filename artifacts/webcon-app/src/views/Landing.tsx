import { useNavigate } from 'react-router-dom';
import { useRef, useMemo, useState, useEffect } from 'react';
import { useInView } from 'framer-motion';
import {
  ArrowRight,
  Store,
  MessageCircle,
  ShieldCheck,
  Zap,
  Wallet,
  Star,
  Send,
  Search,
  Tag,
  Package,
  Truck,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import AuthModal from '@/components/AuthModal';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth-context';

const features = [
  {
    icon: Store,
    title: 'One marketplace, two sides',
    desc: 'Students browse and buy. Business owners list and sell. Everyone meets in one place — no swapping apps to close a deal.',
  },
  {
    icon: MessageCircle,
    title: 'Built-in chat',
    desc: 'Talk to any seller or buyer instantly. No phone numbers, no separate chat app, no awkward back-and-forth.',
  },
  {
    icon: ShieldCheck,
    title: 'Safer transactions',
    desc: 'Verified sellers, clear listings, dispute support. Buy and sell with confidence — not in someone’s DMs.',
  },
  {
    icon: Zap,
    title: 'Lightning fast',
    desc: 'Find what you need in seconds, not minutes. Cleaner search, smarter filters, no endless scrolling.',
  },
  {
    icon: Wallet,
    title: 'Pay your way',
    desc: 'Card, transfer or wallet — checkout in one tap. Sellers get paid fast and keep more of every sale.',
  },
  {
    icon: TrendingUp,
    title: 'Grow your hustle',
    desc: 'Real insights, real reach. Turn your side hustle into a real business with tools made for the way you actually sell.',
  },
];

const demoMessages = [
  { role: 'user', text: 'Hi, is the laptop still available?', delay: 0.3 },
  { role: 'assistant', text: 'Yes! Available now — ₦185,000. I can deliver to your campus today.', delay: 1.2 },
  { role: 'user', text: 'Great. Sending payment via Fimihub now.', delay: 2.4 },
  { role: 'assistant', text: 'Payment received ✓ Packing it up — see you in 2 hours.', delay: 3.3 },
];

/* ─── Marketplace orbit graphic (people + storefronts connected) ─── */
function MarketOrbit() {
  const { pts, edges, particles, outerLines } = useMemo(() => {
    const CX = 300, CY = 300, R = 218;
    type Pt = { x: number; y: number; z: number };
    const pts: Pt[] = [];

    const N = 85;
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < N; i++) {
      const y3 = 1 - (i / (N - 1)) * 2;
      const r3 = Math.sqrt(Math.max(0, 1 - y3 * y3));
      const theta = golden * i;
      const x3 = r3 * Math.cos(theta);
      const z3 = r3 * Math.sin(theta);
      pts.push({ x: CX + x3 * R, y: CY - y3 * R, z: z3 });
    }

    const edges: [number, number][] = [];
    const THRESH = 92;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        if (dx * dx + dy * dy < THRESH * THRESH) edges.push([i, j]);
      }
    }

    const particles: { x: number; y: number; r: number }[] = [
      { x: CX + R + 44, y: CY - 100, r: 3.8 },
      { x: CX + R + 72, y: CY - 42, r: 2.2 },
      { x: CX + R + 32, y: CY + 58, r: 4.5 },
      { x: CX + R + 90, y: CY + 22, r: 2.8 },
      { x: CX + R + 55, y: CY - 148, r: 2.2 },
      { x: CX - R - 40, y: CY - 78, r: 3.2 },
      { x: CX - R - 65, y: CY + 18, r: 2.5 },
      { x: CX - R - 25, y: CY + 95, r: 4.2 },
      { x: CX - R - 90, y: CY - 28, r: 2 },
      { x: CX + 22, y: CY - R - 52, r: 3.2 },
      { x: CX - 62, y: CY - R - 30, r: 2.6 },
      { x: CX + 95, y: CY - R - 38, r: 2.2 },
      { x: CX + 75, y: CY + R + 35, r: 3.8 },
      { x: CX - 52, y: CY + R + 50, r: 2.2 },
      { x: CX + 125, y: CY + R + 24, r: 2 },
      { x: CX - R - 110, y: CY + 55, r: 2.5 },
      { x: CX + R + 108, y: CY - 80, r: 1.8 },
    ];

    const outerLines: [number, number][] = [];
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        if (dx * dx + dy * dy < 82 * 82) outerLines.push([i, j]);
      }
    }

    return { pts, edges, particles, outerLines };
  }, []);

  return (
    <svg viewBox="0 0 600 600" className="w-full h-full text-foreground" fill="none">
      <defs>
        <clipPath id="globe-mesh-clip">
          <circle cx="300" cy="300" r="220" />
        </clipPath>
      </defs>

      <circle cx="300" cy="300" r="220" stroke="currentColor" strokeWidth="0.8" opacity="0.1" />

      <g clipPath="url(#globe-mesh-clip)">
        {edges.map(([i, j], k) => {
          const avgZ = (pts[i].z + pts[j].z) / 2;
          const op = Math.max(0.04, Math.min(0.17, 0.09 + avgZ * 0.13));
          return (
            <line
              key={k}
              x1={pts[i].x} y1={pts[i].y}
              x2={pts[j].x} y2={pts[j].y}
              stroke="currentColor"
              strokeWidth={0.5}
              opacity={op}
            />
          );
        })}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y}
            r={1.4 + Math.max(0, p.z) * 0.8}
            fill="currentColor"
            opacity={Math.max(0.18, Math.min(0.55, 0.3 + p.z * 0.25))}
          />
        ))}
      </g>

      {outerLines.map(([i, j], k) => (
        <line
          key={`ol-${k}`}
          x1={particles[i].x} y1={particles[i].y}
          x2={particles[j].x} y2={particles[j].y}
          stroke="currentColor"
          strokeWidth={0.45}
          opacity={0.09}
        />
      ))}

      {particles.map((p, i) => (
        <circle key={`pt-${i}`} cx={p.x} cy={p.y} r={p.r} fill="currentColor" opacity={0.22} />
      ))}
    </svg>
  );
}

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
      }}
    >
      {children}
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: typeof features[number]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const Icon = feature.icon;
  return (
    <div
      ref={ref}
      className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm hover:shadow-elevation-md hover:border-foreground/20 transition-shadow"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 500ms ease ${index * 60}ms, transform 500ms ease ${index * 60}ms`,
      }}
    >
      <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center mb-4">
        <Icon className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.6} />
      </div>
      <h3 className="text-sm font-semibold tracking-tight mb-1.5">{feature.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
    </div>
  );
}

function LiveDemoChat() {
  const [visibleCount, setVisibleCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    demoMessages.forEach((m, i) => {
      setTimeout(() => {
        if (!cancelled) setVisibleCount(i + 1);
      }, m.delay * 1000);
    });
    return () => { cancelled = true; };
  }, [inView]);

  return (
    <div
      ref={ref}
      className="border border-border rounded-3xl bg-card shadow-elevation-md overflow-hidden"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
      }}
    >
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-[11px] font-semibold">A</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold tracking-tight truncate">Amaka — Tech Plug</p>
          <p className="text-[10px] text-muted-foreground">Verified seller · Online now</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-secondary text-muted-foreground">Chat</span>
      </div>
      <div className="px-4 py-4 min-h-[180px] flex flex-col gap-2">
        {demoMessages.slice(0, visibleCount).map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animation: 'fadeInUp 300ms ease' }}
          >
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed border border-border ${msg.role === 'user' ? 'bg-secondary' : 'bg-muted'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-3 flex items-center gap-2">
        <span className="flex-1 text-xs text-muted-foreground">Message the seller...</span>
        <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
          <Send className="h-3 w-3 text-background" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main export ─── */
export default function Landing() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: 'login' | 'register' }>({ open: false, tab: 'login' });

  useEffect(() => {
    if (!isLoading && user) navigate('/chat', { replace: true });
  }, [user, isLoading, navigate]);

  const openLogin = () => setAuthModal({ open: true, tab: 'login' });
  const openRegister = () => setAuthModal({ open: true, tab: 'register' });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {authModal.open && <AuthModal initialTab={authModal.tab} onClose={() => setAuthModal({ open: false, tab: 'login' })} />}

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 shadow-elevation-sm">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Logo className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-tight">Fimihub</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              {['How it works', 'For sellers', 'Pricing'].map(item => (
                <button key={item} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">{item}</button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="text-sm h-8" onClick={openLogin}>Sign in</Button>
            <Button size="sm" className="text-sm h-8 shadow-elevation-sm" onClick={openRegister}>Get started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center pt-36 pb-20 px-6 text-center overflow-hidden min-h-[560px]">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[680px] h-[680px] shrink-0">
            <MarketOrbit />
          </div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5 mb-10 shadow-elevation-sm bg-card/80">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-pulse" />
            The marketplace for students &amp; business owners
          </div>
          <h1 className="text-5xl md:text-[58px] font-semibold tracking-tight text-balance mb-6 leading-[1.08]">
            Buy. Sell. Chat.<br />
            <span className="text-foreground/55">All in one place.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Fimihub brings students and business owners together — a faster, safer, smarter way to trade than any chat app or marketplace you’ve used before.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="h-11 px-7 text-sm shadow-elevation-md" onClick={openRegister}>
              Join Fimihub <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="h-11 px-7 text-sm shadow-elevation-sm bg-background/70" onClick={openLogin}>
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* Verb cards */}
      <section className="px-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="mb-6 text-center">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">What you can do on Fimihub</p>
          </AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { verb: 'Browse', icon: Search, anim: 'icon-pulse', desc: 'Discover what students need' },
              { verb: 'List', icon: Tag, anim: 'icon-bounce', desc: 'Post products in seconds' },
              { verb: 'Chat', icon: MessageCircle, anim: 'icon-wiggle', desc: 'Message buyers &amp; sellers' },
              { verb: 'Pay', icon: Wallet, anim: 'icon-zoom', desc: 'Checkout in one tap' },
              { verb: 'Ship', icon: Truck, anim: 'icon-spin', desc: 'Send orders with ease' },
              { verb: 'Earn', icon: Package, anim: 'icon-expand', desc: 'Grow your hustle' },
            ].map(({ verb, icon: Icon, anim, desc }) => (
              <div
                key={verb}
                className="border border-border rounded-2xl p-4 bg-card shadow-elevation-sm hover:shadow-elevation-md hover:border-foreground/20 transition-shadow cursor-default flex flex-col items-center text-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center">
                  <Icon className={`h-[18px] w-[18px] text-muted-foreground ${anim}`} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">{verb}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two sides — students + business owners */}
      <section className="px-6 pb-16 pt-4">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-elevation-md flex flex-col md:flex-row items-stretch">
              <div className="relative md:w-2/5 min-h-[280px] bg-secondary flex items-end justify-center overflow-hidden">
                <img
                  src="https://images.fillout.com/orgid-650815/flowpublicid-p2yrnhhcua/widgetid-default/oGdmwEieJr27DCHqPvXeQF/pasted-image-1775910610841.jpg"
                  alt="Students and business owners on Fimihub"
                  className="w-full h-full object-cover object-top"
                  style={{ maxHeight: 380 }}
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/30 to-transparent" />
              </div>

              <div className="flex-1 px-8 py-10 flex flex-col justify-center">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-3">Built for two sides</p>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] mb-4">
                  Students get more.<br />
                  <span className="text-foreground/50">Business owners earn more.</span>
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-7 max-w-sm">
                  Fimihub is where the people who need things and the people who sell them actually meet — without the noise of group chats, the chaos of random posts, or the fees of bigger marketplaces.
                </p>
                <div className="flex flex-wrap gap-3">
                  {['Verified sellers', 'Built-in chat', 'Faster checkout'].map(tag => (
                    <span key={tag} className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Live demo */}
      <section className="px-6 pb-24">
        <AnimatedSection>
          <div className="max-w-md mx-auto">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3 text-center">Chat &amp; close in one place</p>
            <LiveDemoChat />
          </div>
        </AnimatedSection>
      </section>

      {/* Features */}
      <section className="border-t border-border py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-14">
            <h2 className="text-2xl font-semibold tracking-tight mb-3">A better way to buy and sell</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Everything you wish your favourite chat app and your favourite marketplace had — together, redesigned for the people who actually use them.
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border py-20 px-6">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-xs text-muted-foreground font-medium uppercase tracking-wider mb-10">What our community says</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { quote: 'I used to chase sellers across group chats. On Fimihub I find, chat, and pay in one place — done in minutes.', name: 'Priya S.', course: 'Student' },
                { quote: 'My sales doubled the first month. Real buyers, real chats, no random spam — and the payouts are fast.', name: 'Marcus T.', course: 'Business owner' },
                { quote: 'Buying my textbooks and a fan for my hostel on the same app? Yes please. Fimihub just gets it.', name: 'Leila K.', course: 'Student' },
              ].map((t, i) => (
                <div
                  key={i}
                  className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm hover:shadow-elevation-md transition-shadow"
                >
                  <div className="flex items-center gap-1 mb-3 text-foreground/80">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star key={k} className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-medium">{t.name[0]}</div>
                    <div>
                      <p className="text-xs font-medium">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{t.course}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-24 px-6 text-center">
        <AnimatedSection>
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Your next deal is on Fimihub</h2>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">Join free in under a minute. No credit card needed to start buying or selling.</p>
            <Button size="lg" className="h-11 px-8 text-sm shadow-elevation-md" onClick={openRegister}>
              Create your free account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo className="h-3.5 w-3.5" />
            <span className="text-sm font-semibold">Fimihub</span>
          </div>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Sellers', 'Contact'].map(item => (
              <button key={item} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{item}</button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">© 2026 Fimihub</span>
        </div>
      </footer>
    </div>
  );
}
