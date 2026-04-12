export interface Agent {
  id: number;
  userId: number;
  name: string;
  subject: string;
  level: string;
  tone: string;
  domain?: string;
  personalityDescription?: string | null;
  soulMd?: string | null;
  systemPrompt: string | null;
  learningHubId?: number | null;
  conversationCount?: number;
  subscription?: {
    active: boolean;
    expiresAt: string;
    creditsCost: number;
  } | null;
  createdAt: string;
  updatedAt: string;
  // Legacy compat
  user_id?: number;
  is_active?: boolean;
  connected_platforms?: string[];
  description?: string | null;
  system_prompt?: string | null;
  conversation_count?: number;
  last_active?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Conversation {
  id: number;
  userId: number;
  agentId: number | null;
  agentName: string | null;
  agentSubject: string | null;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  // Legacy compat
  user_id?: number;
  agent_id?: number | null;
  message_count?: number;
  created_at?: string;
  updated_at?: string;
  preview?: string | null;
  agent?: { id: number; name: string; subject: string } | null;
}

export interface Message {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinkMs: number | null;
  createdAt: string;
  // Legacy compat
  conversation_id?: number;
  think_ms?: number | null;
  created_at?: string;
}

export interface DashboardStats {
  activeAgents: number;
  totalAgents: number;
  maxAgents: number;
  totalConversations: number;
  messagesThisMonth: number;
  maxMessagesPerMonth: number;
  studyStreak: number;
}

// Agents
export async function fetchAgents(_userId?: string | number): Promise<Agent[]> {
  try {
    const res = await fetch('/api/agents');
    if (!res.ok) return [];
    const data = await res.json() as Agent[];
    return data.map((a) => ({
      ...a,
      user_id: a.userId,
      is_active: true,
      connected_platforms: [],
      description: null,
      system_prompt: a.systemPrompt,
      conversation_count: a.conversationCount ?? 0,
      last_active: a.updatedAt,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    }));
  } catch {
    return [];
  }
}

export async function createAgent(agent: {
  user_id?: string | number;
  name: string;
  subject: string;
  level?: string;
  tone?: string;
  domain?: string;
  personalityDescription?: string;
  description?: string;
  system_prompt?: string;
  systemPrompt?: string;
  learningHubId?: number;
  skipCredits?: boolean;
}): Promise<Agent | null> {
  try {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: agent.name,
        subject: agent.subject,
        level: agent.level || 'Undergraduate',
        tone: agent.tone || 'patient',
        domain: agent.domain || 'education',
        personalityDescription: agent.personalityDescription || agent.description || '',
        systemPrompt: agent.systemPrompt || agent.system_prompt || null,
        learningHubId: agent.learningHubId,
        skipCredits: agent.skipCredits,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || 'Failed to create agent');
    }
    const data = await res.json() as Agent;
    return {
      ...data,
      user_id: data.userId,
      is_active: true,
      connected_platforms: [],
      description: null,
      system_prompt: data.systemPrompt,
      conversation_count: 0,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function updateAgent(agentId: string | number, updates: Partial<{
  name: string;
  subject: string;
  level: string;
  tone: string;
  systemPrompt: string;
}>): Promise<Agent | null> {
  try {
    const res = await fetch(`/api/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    return await res.json() as Agent;
  } catch {
    return null;
  }
}

export async function deleteAgent(agentId: string | number): Promise<boolean> {
  try {
    const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

// Conversations
export async function fetchConversations(_userId?: string | number, _limit = 10): Promise<Conversation[]> {
  try {
    const res = await fetch('/api/chat/conversations');
    if (!res.ok) return [];
    const data = await res.json() as Conversation[];
    return data.map((c) => ({
      ...c,
      user_id: c.userId,
      agent_id: c.agentId,
      message_count: c.messageCount,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      preview: (c as any).preview ?? null,
      agent: c.agentId ? { id: c.agentId, name: c.agentName ?? '', subject: c.agentSubject ?? '' } : null,
    }));
  } catch {
    return [];
  }
}

export async function createConversation(data: {
  user_id?: string | number;
  agent_id?: string | number;
  agentId?: string | number;
  title?: string;
}): Promise<Conversation | null> {
  try {
    const agentId = data.agentId ?? data.agent_id;
    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, title: data.title }),
    });
    if (!res.ok) return null;
    const c = await res.json() as Conversation;
    return {
      ...c,
      user_id: c.userId,
      agent_id: c.agentId,
      message_count: c.messageCount,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      preview: null,
    };
  } catch {
    return null;
  }
}

export async function fetchConversationWithMessages(conversationId: string | number): Promise<{
  conversation: Conversation | null;
  messages: Message[];
}> {
  try {
    const [convRes, msgRes] = await Promise.all([
      fetch(`/api/chat/conversations/${conversationId}`),
      fetch(`/api/chat/conversations/${conversationId}/messages`),
    ]);

    if (!convRes.ok) return { conversation: null, messages: [] };
    const conversation = await convRes.json() as Conversation;

    const msgs: Message[] = msgRes.ok ? await msgRes.json() : [];
    return {
      conversation: {
        ...conversation,
        user_id: conversation.userId,
        agent_id: conversation.agentId,
        message_count: conversation.messageCount,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
      },
      messages: msgs.map((m) => ({
        ...m,
        conversation_id: m.conversationId,
        think_ms: m.thinkMs,
        created_at: m.createdAt,
      })),
    };
  } catch {
    return { conversation: null, messages: [] };
  }
}

export async function addMessage(data: {
  conversation_id: string | number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  think_ms?: number;
}): Promise<Message | null> {
  return null;
}

// Dashboard Stats
export async function fetchDashboardStats(_userId?: string | number): Promise<DashboardStats> {
  try {
    const res = await fetch('/api/analytics');
    if (!res.ok) {
      return {
        activeAgents: 0,
        totalAgents: 0,
        maxAgents: 5,
        totalConversations: 0,
        messagesThisMonth: 0,
        maxMessagesPerMonth: 100,
        studyStreak: 0,
      };
    }
    const data = await res.json();
    return {
      activeAgents: data.totalAgents ?? 0,
      totalAgents: data.totalAgents ?? 0,
      maxAgents: 5,
      totalConversations: data.totalConversations ?? 0,
      messagesThisMonth: data.totalMessages ?? 0,
      maxMessagesPerMonth: 100,
      studyStreak: data.streakDays ?? 0,
    };
  } catch {
    return {
      activeAgents: 0,
      totalAgents: 0,
      maxAgents: 5,
      totalConversations: 0,
      messagesThisMonth: 0,
      maxMessagesPerMonth: 100,
      studyStreak: 0,
    };
  }
}
