import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();
  const [message, setMessage] = useState('Verifying your account...');

  useEffect(() => {
    const error = searchParams.get('error');

    if (error === 'invalid-token') {
      setMessage('Invalid or expired verification link.');
      setTimeout(() => navigate('/?error=invalid-token', { replace: true }), 2000);
      return;
    }

    if (error === 'missing-token') {
      setMessage('Verification link is missing. Please check your email.');
      setTimeout(() => navigate('/', { replace: true }), 2000);
      return;
    }

    if (error) {
      setMessage('Verification failed. Please try again.');
      setTimeout(() => navigate('/', { replace: true }), 2000);
      return;
    }

    // No error means the server already verified and set the cookie.
    // Refresh profile to pick up the new session.
    refreshProfile().then(() => {
      navigate('/chat', { replace: true });
    });
  }, [navigate, searchParams, refreshProfile]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
