'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
      {error && (
        <div className="bg-danger-muted border border-danger/30 rounded-lg px-4 py-3 text-danger text-sm flex items-center gap-2 animate-fade-in">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-text-secondary">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@laptopinventory.com"
          required
          className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border-primary text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent input-glow transition-all duration-200 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border-primary text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent input-glow transition-all duration-200 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
      >
        <span className={loading ? 'opacity-0' : ''}>Sign In</span>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
      </button>

      <p className="text-xs text-text-muted text-center mt-4">
        Contact your administrator for account access
      </p>
    </form>
  );
}
