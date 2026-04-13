import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface CurrentUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  institution: string | null;
  creditBalance: number;
  createdAt: string;
}

export interface Profile {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  institution: string | null;
  created_at: string;
}

export interface CreditBalance {
  user_id: number;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

interface AuthContextValue {
  user: CurrentUser | null;
  profile: Profile | null;
  creditBalance: CreditBalance | null;
  session: null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    institution?: string;
    avatarFile?: File;
  }) => Promise<{ error?: string; needsVerification?: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>;
  uploadAvatar: (file: File) => Promise<{ url?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function userToProfile(user: CurrentUser): Profile {
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    avatar_url: null,
    institution: user.institution,
    created_at: user.createdAt,
  };
}

function userToCreditBalance(user: CurrentUser): CreditBalance {
  return {
    user_id: user.id,
    balance: user.creditBalance,
    lifetime_earned: user.creditBalance,
    lifetime_spent: 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async (): Promise<CurrentUser | null> => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return null;
      return (await res.json()) as CurrentUser;
    } catch {
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
  }, [fetchMe]);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, [fetchMe]);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Login failed' };
      setUser(data.user as CurrentUser);
      return {};
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    institution?: string;
    avatarFile?: File;
  }): Promise<{ error?: string; needsVerification?: boolean }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          institution: data.institution,
        }),
      });
      const json = await res.json();
      if (!res.ok) return { error: json.error || 'Registration failed' };
      return { needsVerification: true };
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error?: string }> => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: updates.first_name,
          lastName: updates.last_name,
          institution: updates.institution,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Update failed' };
      setUser(data as CurrentUser);
      return {};
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  };

  const uploadAvatar = async (_file: File): Promise<{ url?: string; error?: string }> => {
    return { error: 'Avatar upload is not available yet' };
  };

  const profile = user ? userToProfile(user) : null;
  const creditBalance = user ? userToCreditBalance(user) : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        creditBalance,
        session: null,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
