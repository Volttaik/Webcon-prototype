import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import SplashScreen from '@/components/SplashScreen';
import Landing from '@/views/Landing';
import Dashboard from '@/views/Dashboard';
import ChatPage from '@/views/ChatPage';
import Settings from '@/views/Settings';
import LearningHub from '@/views/LearningHub';
import Schedule from '@/views/Schedule';
import Analytics from '@/views/Analytics';
import Billing from '@/views/Billing';
import Projects from '@/views/Projects';
import Workspace from '@/views/Workspace';
import AuthCallback from '@/views/AuthCallback';
import AdminDeployment from '@/views/AdminDeployment';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <SplashScreen />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/chat/:id" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/learning-hub" element={<ProtectedRoute><LearningHub /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
      <Route path="/admin/deployment" element={<AdminDeployment />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {mounted ? (
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          ) : (
            <SplashScreen />
          )}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
