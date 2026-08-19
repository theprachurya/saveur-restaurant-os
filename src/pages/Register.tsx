import { useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'customer' | 'owner'>('customer');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            full_name: name,
            role: role,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      setMessage('Registration started! Check your email for the magic link to complete sign up.');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg border border-[var(--color-border)]">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">Create account</h1>
          <p className="text-[var(--color-muted)]">Join Saveur today — it's free</p>
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

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-muted)]">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your full name"
              className="w-full rounded-lg border-2 border-[var(--color-border)] p-3 outline-none transition-colors focus:border-[var(--color-rust)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-muted)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
              className="w-full rounded-lg border-2 border-[var(--color-border)] p-3 outline-none transition-colors focus:border-[var(--color-rust)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">I want to...</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`rounded-xl border-2 p-4 text-center transition-all ${
                  role === 'customer'
                    ? 'border-[var(--color-rust)] bg-[var(--color-rust-light)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-rust)]'
                }`}
              >
                <div className="mb-2 text-2xl">🍽</div>
                <div className="font-medium text-[var(--color-ink)]">Order Food</div>
                <div className="text-xs text-[var(--color-muted)]">I'm a customer</div>
              </button>
              
              <button
                type="button"
                onClick={() => setRole('owner')}
                className={`rounded-xl border-2 p-4 text-center transition-all ${
                  role === 'owner'
                    ? 'border-[var(--color-rust)] bg-[var(--color-rust-light)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-rust)]'
                }`}
              >
                <div className="mb-2 text-2xl">🏪</div>
                <div className="font-medium text-[var(--color-ink)]">Manage Restaurant</div>
                <div className="text-xs text-[var(--color-muted)]">I'm an owner</div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[var(--color-rust)] p-3 font-medium text-white transition-colors hover:bg-[var(--color-rust-dark)] disabled:opacity-50"
          >
            {loading ? 'Sending link...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
          Have an account?{' '}
          <Link to="/login" className="font-medium text-[var(--color-rust)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
