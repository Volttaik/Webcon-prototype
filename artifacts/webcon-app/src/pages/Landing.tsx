import { useNavigate } from 'react-router-dom';
import { useRef, useMemo, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, BookOpen, Brain, MessageCircle, Zap, Users, Star, Send, Box, PenLine, CalendarCheck, Telescope, Repeat2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/lib/auth-context';

const features = [
  { icon: Brain, title: 'Course-specific agents', desc: 'Create a dedicated AI agent for each subject. Your Bio agent knows your syllabus. Your Calc agent knows your textbook.' },
  { icon: BookOpen, title: 'Study continuity', desc: 'Your agent remembers every session. Pick up exactly where you left off — no re-explaining context.' },
  { icon: MessageCircle, title: 'Ask anything, anytime', desc: 'Your study companion is always available. No office hours, no waiting — get answers the moment you need them.' },
  { icon: Zap, title: 'Instant explanations', desc: 'Struggling with a concept at midnight? Your agent responds with patient, detailed explanations in seconds.' },
  { icon: Users, title: 'Built for students', desc: 'Designed around how students actually learn — with examples, analogies, and step-by-step breakdowns.' },
  { icon: Star, title: 'Exam preparation', desc: 'Practice with generated questions, identify knowledge gaps, and consolidate understanding before every test.' },
];

const demoMessages = [
  { role: 'user', text: "I don't understand how the chain rule works", delay: 0.3 },
  { role: 'assistant', text: "Think of it like peeling an onion 🧅 — work from the outside inward, multiplying derivatives at each layer.", delay: 1.2 },
  { role: 'user', text: 'Show me with sin(x²)?', delay: 2.4 },
  { role: 'assistant', text: "Outer: d/dx[sin(u)] = cos(u) · Inner: d/dx[x²] = 2x · Result: cos(x²) · 2x ✓", delay: 3.3 },
];

/* ─── Network globe (Fibonacci sphere + triangular mesh) ─── */
function NetworkGlobe() {
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

    // Edges: connect points within distance threshold (creates triangular mesh)
    const edges: [number, number][] = [];
    const THRESH = 92;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        if (dx * dx + dy * dy < THRESH * THRESH) edges.push([i, j]);
      }
    }

    // Outer floating particles
    const particles: { x: number; y: number; r: number }[] = [
      { x: CX + R + 44,  y: CY - 100, r: 3.8 },
      { x: CX + R + 72,  y: CY - 42,  r: 2.2 },
      { x: CX + R + 32,  y: CY + 58,  r: 4.5 },
      { x: CX + R + 90,  y: CY + 22,  r: 2.8 },
      { x: CX + R + 55,  y: CY - 148, r: 2.2 },
      { x: CX - R - 40,  y: CY - 78,  r: 3.2 },
      { x: CX - R - 65,  y: CY + 18,  r: 2.5 },
      { x: CX - R - 25,  y: CY + 95,  r: 4.2 },
      { x: CX - R - 90,  y: CY - 28,  r: 2   },
      { x: CX + 22,      y: CY - R - 52, r: 3.2 },
      { x: CX - 62,      y: CY - R - 30, r: 2.6 },
      { x: CX + 95,      y: CY - R - 38, r: 2.2 },
      { x: CX + 75,      y: CY + R + 35, r: 3.8 },
      { x: CX - 52,      y: CY + R + 50, r: 2.2 },
      { x: CX + 125,     y: CY + R + 24, r: 2   },
      { x: CX - R - 110, y: CY + 55,     r: 2.5 },
      { x: CX + R + 108, y: CY - 80,     r: 1.8 },
    ];

    // Connecting lines between close outer particles
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

      {/* Globe border ring */}
      <circle cx="300" cy="300" r="220" stroke="currentColor" strokeWidth="0.8" opacity="0.1" />

      {/* Interior mesh lines */}
      <g clipPath="url(#globe-mesh-clip)">
        {edges.map(([i, j], k) => {
          const avgZ = (pts[i].z + pts[j].z) / 2;
          const op = Math.max(0.04, Math.min(0.17, 0.09 + avgZ * 0.13));
          return (
            <line
              key={k}
              x1={pts[i].x} y1={pts[i].y}
              x2={pts[j].x} y2={pts[j].y}
              stroke="currentColor" strokeWidth="0.55"
              opacity={op}
            />
          );
        })}
      </g>

      {/* Interior vertex dots */}
      <g clipPath="url(#globe-mesh-clip)">
        {pts.map((p, i) => {
          const op = Math.max(0.08, Math.min(0.35, 0.16 + p.z * 0.28));
          return <circle key={i} cx={p.x} cy={p.y} r="2.1" fill="currentColor" opacity={op} />;
        })}
      </g>

      {/* Outer particle connecting lines */}
      {outerLines.map(([i, j], k) => (
        <line
          key={k}
          x1={particles[i].x} y1={particles[i].y}
          x2={particles[j].x} y2={particles[j].y}
          stroke="currentColor" strokeWidth="0.5" opacity="0.09"
        />
      ))}

      {/* Outer floating particles */}
      {particles.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="currentColor" opacity="0.13" />
      ))}
    </svg>
  );
}

/* ─── Animated section wrapper ─── */
function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const { icon: Icon } = feature;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className="border border-border rounded-2xl p-6 bg-card shadow-elevation-sm hover:shadow-elevation-md hover:border-foreground/25 transition-shadow cursor-default"
    >
      <div className="mb-4 w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center">
        <Icon className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-medium mb-2">{feature.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
    </motion.div>
  );
}

/* ─── Demo chat ─── */
function LiveDemoChat() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <div ref={ref} className="border border-border rounded-2xl overflow-hidden bg-card shadow-elevation-md">
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center shrink-0">
          <span className="text-background text-[10px] font-semibold">W</span>
        </div>
        <div>
          <p className="text-xs font-medium">Calc II Agent</p>
          <p className="text-[11px] text-muted-foreground">ready to help</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
          <span className="text-[11px] text-muted-foreground">online</span>
        </div>
      </div>
      <div className="p-4 space-y-3 min-h-[196px]">
        {demoMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: msg.delay, ease: 'easeOut' }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed border border-border ${msg.role === 'user' ? 'bg-secondary' : 'bg-muted'}`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-3 flex items-center gap-2">
        <span className="flex-1 text-xs text-muted-foreground">Ask your agent anything...</span>
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
    if (!isLoading && user) navigate('/dashboard', { replace: true });
  }, [user, isLoading, navigate]);

  const openLogin = () => setAuthModal({ open: true, tab: 'login' });
  const openRegister = () => setAuthModal({ open: true, tab: 'register' });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {authModal.open && <AuthModal initialTab={authModal.tab} onClose={() => setAuthModal({ open: false, tab: 'login' })} />}
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md shadow-elevation-sm">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-sm font-semibold tracking-tight">WebCon</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              {['How it works', 'Subjects', 'Pricing'].map(item => (
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
        {/* Network globe — centered large background */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[680px] h-[680px] shrink-0">
            <NetworkGlobe />
          </div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5 mb-10 shadow-elevation-sm bg-card/80 backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-pulse" />
            Your personal AI study companion
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-5xl md:text-[58px] font-semibold tracking-tight text-balance mb-6 leading-[1.08]"
          >
            Study smarter with<br />
            <span className="text-foreground/55">your personal AI agent</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed"
          >
            Create course-specific AI agents that know your syllabus, remember every session, and help you truly understand — not just memorize.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button size="lg" className="h-11 px-7 text-sm shadow-elevation-md" onClick={openRegister}>
              Create your agent <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="h-11 px-7 text-sm shadow-elevation-sm bg-background/70 backdrop-blur-sm" onClick={openLogin}>
              Sign in
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Verb cards */}
      <section className="px-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="mb-6 text-center">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">What students do with WebCon</p>
          </AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { verb: 'Study',    icon: Brain,        anim: 'icon-pulse',  desc: 'Deep sessions with your agent' },
              { verb: 'Plan',     icon: CalendarCheck,anim: 'icon-bounce', desc: 'Organise your study week' },
              { verb: 'Write',    icon: PenLine,      anim: 'icon-wiggle', desc: 'Draft essays with guidance' },
              { verb: 'Research', icon: Telescope,    anim: 'icon-zoom',   desc: 'Explore topics in depth' },
              { verb: 'Practice', icon: Repeat2,      anim: 'icon-spin',   desc: 'Drill with generated questions' },
              { verb: 'Reach',    icon: Target,       anim: 'icon-expand', desc: 'Hit your academic goals' },
            ].map(({ verb, icon: Icon, anim, desc }, i) => (
              <motion.div
                key={verb}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="border border-border rounded-2xl p-4 bg-card shadow-elevation-sm hover:shadow-elevation-md hover:border-foreground/20 transition-shadow cursor-default flex flex-col items-center text-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center">
                  <Icon className={`h-[18px] w-[18px] text-muted-foreground ${anim}`} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">{verb}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI + Teacher section */}
      <section className="px-6 pb-16 pt-4">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-elevation-md flex flex-col md:flex-row items-stretch">
              {/* Image side */}
              <div className="relative md:w-2/5 min-h-[280px] bg-secondary flex items-end justify-center overflow-hidden">
                <img
                  src="https://images.fillout.com/orgid-650815/flowpublicid-p2yrnhhcua/widgetid-default/oGdmwEieJr27DCHqPvXeQF/pasted-image-1775910610841.jpg"
                  alt="Student learning with AI"
                  className="w-full h-full object-cover object-top"
                  style={{ maxHeight: 380 }}
                />
                {/* Subtle gradient overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/30 to-transparent" />
              </div>

              {/* Text side */}
              <div className="flex-1 px-8 py-10 flex flex-col justify-center">
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-3">The future of learning</p>
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] mb-4">
                    Learn with AI,<br />
                    <span className="text-foreground/50">taught by teachers.</span>
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-7 max-w-sm">
                    WebCon blends the patience of AI with the wisdom of your teachers — giving you a study companion that knows your curriculum and explains it your way.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['Syllabus-aware', 'Always available', 'Remembers everything'].map(tag => (
                      <span key={tag} className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Live demo */}
      <section className="px-6 pb-24">
        <AnimatedSection>
          <div className="max-w-md mx-auto">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3 text-center">See it in action</p>
            <LiveDemoChat />
          </div>
        </AnimatedSection>
      </section>

      {/* Features */}
      <section className="border-t border-border py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-14">
            <h2 className="text-2xl font-semibold tracking-tight mb-3">Built for how students actually learn</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">Every feature is designed around your study workflow — not a generic chatbot experience.</p>
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
            <p className="text-center text-xs text-muted-foreground font-medium uppercase tracking-wider mb-10">What students say</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { quote: 'My Bio agent explained the Krebs cycle better than my professor. I actually understood it for the first time.', name: 'Priya S.', course: 'Biology 201' },
                { quote: 'My Calc agent walks through every step patiently. I finally understand derivatives instead of just memorizing rules.', name: 'Marcus T.', course: 'Calculus II' },
                { quote: 'I use my CS agent to debug code and understand algorithms at 2am when no one else is available.', name: 'Leila K.', course: 'Data Structures' },
              ].map((t, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm hover:shadow-elevation-md transition-shadow"
                >
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.quote}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-medium">{t.name[0]}</div>
                    <div>
                      <p className="text-xs font-medium">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{t.course}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-24 px-6 text-center">
        <AnimatedSection>
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Start studying with your agent</h2>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">Create your first course agent in under two minutes. No credit card required.</p>
            <Button size="lg" className="h-11 px-8 text-sm shadow-elevation-md" onClick={openRegister}>
              Create your free agent <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Box className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="text-sm font-semibold">WebCon</span>
          </div>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Docs', 'Contact'].map(item => (
              <button key={item} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{item}</button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">© 2025 WebCon</span>
        </div>
      </footer>
    </div>
  );
}
