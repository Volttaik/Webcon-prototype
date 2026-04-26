import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import SplashScreen from '@/components/SplashScreen';
import PageTransition from '@/components/PageTransition';
import Landing from '@/views/Landing';
import Dashboard from '@/views/Dashboard';
import ChatPage from '@/views/ChatPage';
import Settings from '@/views/Settings';
import LearningHub from '@/views/LearningHub';
import LearningHubApply from '@/views/LearningHubApply';
import LearningHubDashboard from '@/views/LearningHubDashboard';
import Schedule from '@/views/Schedule';
import Analytics from '@/views/Analytics';
import Billing from '@/views/Billing';
import Projects from '@/views/Projects';
import Workspace from '@/views/Workspace';
import AuthCallback from '@/views/AuthCallback';
import AdminDeployment from '@/views/AdminDeployment';
import WhatsApp from '@/views/WhatsApp';
import PaymentCallback from '@/views/PaymentCallback';
import ResetPassword from '@/views/ResetPassword';

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
  const location = useLocation();
  // Use only the first path segment as the transition key so things like
  // /chat/123 -> /chat/456 don't re-mount the whole page (no flicker, no lag).
  const segmentKey = '/' + (location.pathname.split('/')[1] ?? '');
  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={segmentKey}>
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/learning-hub" element={<ProtectedRoute><LearningHub /></ProtectedRoute>} />
          <Route path="/learning-hub/apply" element={<ProtectedRoute><LearningHubApply /></ProtectedRoute>} />
          <Route path="/learning-hub/dashboard" element={<ProtectedRoute><LearningHubDashboard /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
          <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
          <Route path="/admin/deployment" element={<AdminDeployment />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/payment/callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />
        </Routes>
      </PageTransition>
    </AnimatePresence>
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
