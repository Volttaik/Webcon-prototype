export interface Conversation {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  messages: Message[];
  agentName?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thinkMs?: number; // ms spent thinking before this assistant reply
}

export const mockConversations: Conversation[] = [
  {
    id: '1',
    title: 'Explain the Krebs cycle',
    preview: 'Can you break down each step of the Krebs cycle with what happens to ATP?',
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
    agentName: 'Bio 201 Agent',
    messages: [
      { id: 'm1', role: 'user', content: 'Can you break down each step of the Krebs cycle and explain what happens to ATP at each stage?', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
      { id: 'm2', role: 'assistant', content: "Great question! The Krebs cycle (citric acid cycle) is central to cellular respiration. Here's a step-by-step breakdown:\n\n**Step 1 — Acetyl-CoA Entry**\nAcetyl-CoA (2 carbons) combines with oxaloacetate (4C) to form citrate (6C). No ATP is produced here.\n\n**Step 2 — Isomerization**\nCitrate → Isocitrate via aconitase. Still no ATP yet.\n\n**Step 3 — First CO₂ release**\nIsocitrate → α-ketoglutarate. One CO₂ released, one **NADH** produced.\n\n**Step 4 — Second CO₂ release**\nα-ketoglutarate → Succinyl-CoA. Another CO₂ released, another **NADH** produced.\n\n**Step 5 — Substrate-level phosphorylation**\nSuccinyl-CoA → Succinate. This produces **1 ATP** (or GTP) directly!\n\n**Step 6–8 — Regeneration**\nSuccinate → Fumarate → Malate → Oxaloacetate\nProduces **1 FADH₂** and **1 NADH**\n\n**Per cycle total:** 3 NADH, 1 FADH₂, 1 ATP, 2 CO₂\n\nRemember: one glucose goes through **two** cycles, so double everything!", timestamp: new Date(Date.now() - 1000 * 60 * 28) },
      { id: 'm3', role: 'user', content: 'How does NADH from the Krebs cycle contribute to the electron transport chain?', timestamp: new Date(Date.now() - 1000 * 60 * 10) },
      { id: 'm4', role: 'assistant', content: "Excellent follow-up! NADH is the crucial link between the Krebs cycle and the ETC.\n\n**The handoff:**\nEach NADH carries high-energy electrons (as a hydride ion H⁻) to **Complex I** (NADH dehydrogenase) in the inner mitochondrial membrane.\n\n**What happens:**\n- Complex I accepts electrons from NADH → NAD⁺ is regenerated (goes back to the Krebs cycle!)\n- The energy released pumps **4 H⁺ protons** across the membrane\n- Electrons pass through the chain: Complex I → CoQ → Complex III → Cytochrome c → Complex IV\n- At Complex IV, electrons finally reduce O₂ to H₂O\n\n**ATP synthesis:**\nThe proton gradient drives ATP synthase → each NADH ultimately yields approximately **2.5 ATP**\n\nSo from one glucose: 10 NADH × 2.5 = 25 ATP from NADH alone!", timestamp: new Date(Date.now() - 1000 * 60 * 8) },
    ],
  },
  {
    id: '2',
    title: 'Derivatives of composite functions',
    preview: 'I need help understanding chain rule with nested functions',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    agentName: 'Calc II Agent',
    messages: [
      { id: 'm5', role: 'user', content: 'I keep getting confused with the chain rule when there are multiple nested functions. Can you explain with examples?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4) },
      { id: 'm6', role: 'assistant', content: "The chain rule is all about peeling back layers! Here's the core idea:\n\n**The rule:** If y = f(g(x)), then dy/dx = f'(g(x)) · g'(x)\n\n**Example 1 — Single nesting:**\ny = sin(x²)\n- Outer: f(u) = sin(u), so f'(u) = cos(u)\n- Inner: g(x) = x², so g'(x) = 2x\n- Result: cos(x²) · 2x\n\n**Example 2 — Double nesting:**\ny = e^(sin(x²))\n- Layer 1 (outermost): f(u) = eᵘ → stays as eᵘ\n- Layer 2: g(u) = sin(u) → cos(u)\n- Layer 3 (innermost): h(x) = x² → 2x\n- Result: e^(sin(x²)) · cos(x²) · 2x\n\n**Mental model:** Work outside→in, multiply each derivative as you go.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3) },
    ],
  },
  {
    id: '3',
    title: 'World War I causes analysis',
    preview: 'Essay outline for MAIN causes - Militarism, Alliances...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    agentName: 'History 101 Agent',
    messages: [
      { id: 'm7', role: 'user', content: 'Help me write an essay outline on the causes of World War I using the MAIN acronym.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25) },
      { id: 'm8', role: 'assistant', content: "Here's a strong essay outline using the MAIN framework:\n\n**Introduction**\n- Hook: The assassination of Franz Ferdinand as spark, not cause\n- Thesis: WWI resulted from decades of accumulated tension across four interconnected dimensions\n\n**Body 1 — Militarism**\n- European arms race (1870–1914)\n- Germany's naval expansion challenging British supremacy\n- Military planning as self-fulfilling prophecy (Schlieffen Plan)\n\n**Body 2 — Alliance Systems**\n- Triple Alliance vs Triple Entente\n- How alliances turned a regional conflict global\n- The \"blank check\" given to Austria-Hungary\n\n**Body 3 — Imperialism**\n- Competition for African and Asian colonies\n- Morocco Crises (1905, 1911)\n- Economic rivalries feeding nationalism\n\n**Body 4 — Nationalism**\n- Pan-Slavism and Austro-Hungarian tensions\n- Ethnic minorities seeking self-determination\n- The Black Hand and Serbian nationalism\n\n**Conclusion**\n- Synthesis of how MAIN factors created a powder keg\n- Sarajevo as the spark, not the fuel", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
    ],
  },
  {
    id: '4',
    title: 'Python recursion and memoization',
    preview: 'Fibonacci with dynamic programming approach',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    agentName: 'CS 301 Agent',
    messages: [
      { id: 'm9', role: 'user', content: 'Can you show me how to optimize recursive Fibonacci using memoization in Python?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 49) },
      { id: 'm10', role: 'assistant', content: "Great topic! Here's the progression from naive recursion to optimized DP:\n\n**Naive recursion (exponential time O(2ⁿ)):**\n```python\ndef fib_naive(n):\n    if n <= 1:\n        return n\n    return fib_naive(n-1) + fib_naive(n-2)\n```\n\n**With memoization (O(n) time, O(n) space):**\n```python\ndef fib_memo(n, memo={}):\n    if n in memo:\n        return memo[n]\n    if n <= 1:\n        return n\n    memo[n] = fib_memo(n-1, memo) + fib_memo(n-2, memo)\n    return memo[n]\n```\n\n**Using @lru_cache (cleanest approach):**\n```python\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n```\n\nThe key insight: memoization trades time for space by caching subproblem results.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48) },
    ],
  },
];

export const mockAgents = [
  { id: 'a1', name: 'Bio 201 Agent', subject: 'Biology', color: 'bg-secondary', lastActive: new Date(Date.now() - 1000 * 60 * 8), conversations: 12, connected: ['whatsapp'] },
  { id: 'a2', name: 'Calc II Agent', subject: 'Mathematics', color: 'bg-secondary', lastActive: new Date(Date.now() - 1000 * 60 * 60 * 3), conversations: 8, connected: ['telegram'] },
  { id: 'a3', name: 'History 101 Agent', subject: 'History', color: 'bg-secondary', lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24), conversations: 5, connected: [] },
  { id: 'a4', name: 'CS 301 Agent', subject: 'Computer Science', color: 'bg-secondary', lastActive: new Date(Date.now() - 1000 * 60 * 60 * 48), conversations: 19, connected: ['whatsapp', 'telegram'] },
];
