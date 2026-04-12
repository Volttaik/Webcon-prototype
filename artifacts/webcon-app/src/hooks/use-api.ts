import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/auth-context';

export interface Agent {
  id: number;
  userId: number;
  name: string;
  subject: string;
  level: string;
  tone: string;
  systemPrompt: string | null;
  conversationCount: number;
  createdAt: string;
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
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  verb: string | null;
  thinkMs: number | null;
  createdAt: string;
}

export interface WorkspaceItem {
  id: number;
  userId: number;
  agentId: number | null;
  conversationId: number | null;
  type: string;
  title: string;
  content: string;
  pinned: boolean;
  starred: boolean;
  subject: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleSession {
  id: number;
  userId: number;
  agentId: number | null;
  agentName: string | null;
  title: string;
  subject: string | null;
  date: string;
  duration: number;
  type: string;
  completed: boolean;
  notes: string | null;
  createdAt: string;
}

export interface Project {
  id: number;
  userId: number;
  agentId: number | null;
  agentName: string | null;
  title: string;
  subject: string | null;
  type: string;
  status: string;
  dueDate: string | null;
  tasks: ProjectTask[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: number;
  projectId: number;
  title: string;
  completed: boolean;
  dueDate: string | null;
  createdAt: string;
}

export interface Analytics {
  totalMessages: number;
  totalConversations: number;
  totalAgents: number;
  totalWorkspaceItems: number;
  creditsUsed: number;
  creditsBalance: number;
  messagesByDay: { date: string; count: number }[];
  topAgents: { agentId: number; agentName: string; subject: string; messageCount: number }[];
  streakDays: number;
}

// ─── Agents ───
export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: () => apiFetch<Agent[]>('/api/agents') });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; subject: string; level: string; tone?: string; systemPrompt?: string }) =>
      apiFetch<Agent>('/api/agents', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/agents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; name?: string; subject?: string; level?: string; tone?: string; systemPrompt?: string }) =>
      apiFetch<Agent>(`/api/agents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

// ─── Conversations ───
export function useConversations(agentId?: number) {
  return useQuery({
    queryKey: ['conversations', agentId],
    queryFn: () => apiFetch<Conversation[]>(`/api/chat/conversations${agentId ? `?agentId=${agentId}` : ''}`),
  });
}

export function useConversation(id: number | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => apiFetch<{ id: number; agentId: number | null; agentName: string | null; agentSubject: string | null; title: string; messages: ChatMessage[] }>(`/api/chat/conversations/${id}`),
    enabled: id != null,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { agentId: number; title?: string }) =>
      apiFetch<Conversation>('/api/chat/conversations', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/chat/conversations/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

// ─── Credits ───
export function useCreditBalance() {
  return useQuery({ queryKey: ['credits'], queryFn: () => apiFetch<{ balance: number; updatedAt: string }>('/api/credits/balance') });
}

export function useCreditHistory() {
  return useQuery({ queryKey: ['credit-history'], queryFn: () => apiFetch<{ id: number; amount: number; type: string; description: string; reference: string | null; createdAt: string }[]>('/api/credits/history') });
}

export function useBuyCredits() {
  return useMutation({
    mutationFn: (body: { packageId: string; email: string }) =>
      apiFetch<{ authorizationUrl: string; reference: string; amount: number; credits: number }>('/api/credits/buy', { method: 'POST', body: JSON.stringify(body) }),
  });
}

// ─── Workspace ───
export function useWorkspaceItems(type?: string, agentId?: number) {
  return useQuery({
    queryKey: ['workspace', type, agentId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (agentId) params.set('agentId', String(agentId));
      return apiFetch<WorkspaceItem[]>(`/api/workspace${params.toString() ? '?' + params.toString() : ''}`);
    },
  });
}

export function useCreateWorkspaceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { type: string; title: string; content?: string; agentId?: number; subject?: string; pinned?: boolean; starred?: boolean }) =>
      apiFetch<WorkspaceItem>('/api/workspace', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  });
}

export function useUpdateWorkspaceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; title?: string; content?: string; pinned?: boolean; starred?: boolean }) =>
      apiFetch<WorkspaceItem>(`/api/workspace/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  });
}

export function useDeleteWorkspaceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/workspace/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  });
}

// ─── Schedule ───
export function useScheduleSessions() {
  return useQuery({ queryKey: ['schedule'], queryFn: () => apiFetch<ScheduleSession[]>('/api/schedule') });
}

export function useCreateScheduleSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; date: string; agentId?: number; subject?: string; duration?: number; type?: string; notes?: string }) =>
      apiFetch<ScheduleSession>('/api/schedule', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });
}

export function useUpdateScheduleSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; title?: string; completed?: boolean; date?: string; duration?: number; type?: string; notes?: string }) =>
      apiFetch<ScheduleSession>(`/api/schedule/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });
}

export function useDeleteScheduleSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/schedule/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });
}

// ─── Projects ───
export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: () => apiFetch<Project[]>('/api/projects') });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; agentId?: number; subject?: string; type?: string; dueDate?: string }) =>
      apiFetch<Project>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; title?: string; subject?: string; type?: string; status?: string; dueDate?: string }) =>
      apiFetch<Project>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useCreateProjectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...body }: { projectId: number; title: string; dueDate?: string }) =>
      apiFetch<ProjectTask>(`/api/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProjectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId, ...body }: { projectId: number; taskId: number; title?: string; completed?: boolean }) =>
      apiFetch<ProjectTask>(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

// ─── WhatsApp ───
export function useWhatsappStatus() {
  return useQuery({
    queryKey: ['whatsapp'],
    queryFn: () => apiFetch<{
      connected: boolean;
      initCode: string;
      initMessage: string;
      whatsappLink: string;
      phoneNumber: string | null;
      connectedAt: string | null;
    }>('/api/whatsapp'),
  });
}

// ─── Analytics ───
export function useAnalytics() {
  return useQuery({ queryKey: ['analytics'], queryFn: () => apiFetch<Analytics>('/api/analytics') });
}
