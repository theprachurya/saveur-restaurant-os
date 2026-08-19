import { useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      setMessage('Check your email for the login link!');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Error with Google login.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg border border-[var(--color-border)]">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">Welcome back</h1>
          <p className="text-[var(--color-muted)]">Sign in to your Saveur account</p>
        </div>

        {message && (
          <div className="mb-6 rounded-lg bg-[var(--color-sage-light)] p-4 text-[var(--color-sage)]">
            {message}
          </div>
        )}
        
        {error && (
          <div className="mb-6 rounded-lg bg-[#FFF0F0] p-4 text-[var(--color-red)]">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-muted)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border-2 border-[var(--color-border)] p-3 outline-none transition-colors focus:border-[var(--color-rust)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-rust)] p-3 font-medium text-white transition-colors hover:bg-[var(--color-rust-dark)] disabled:opacity-50"
          >
            {loading ? 'Sending link...' : 'Sign In with Email'}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center">
          <div className="h-px w-full bg-[var(--color-border)]"></div>
          <span className="px-4 text-sm text-[var(--color-muted)]">or</span>
          <div className="h-px w-full bg-[var(--color-border)]"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[var(--color-border)] bg-transparent p-3 font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-border)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-1 7.28-2.69l-3.57-2.77c-.99.69-2.26 1.11-3.71 1.11-2.87 0-5.3-1.94-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.11c-.22-.69-.35-1.43-.35-2.11s.13-1.42.35-2.11V7.05H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.95l3.68-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.05l3.68 2.84c.87-2.6 3.3-4.51 6.16-4.51z" fill="#EA4335"/>
          </svg>
          Sign In with Google
        </button>

        <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
          No account?{' '}
          <Link to="/register" className="font-medium text-[var(--color-rust)] hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
