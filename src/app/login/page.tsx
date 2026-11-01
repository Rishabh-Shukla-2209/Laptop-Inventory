import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-6 animate-fade-in">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-6">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-text-heading tracking-tight">Laptop Inventory</h1>
          <p className="text-text-muted mt-2 text-sm">Sign in to manage your laptop fleet</p>
        </div>

        {/* Login Form wrapped in Suspense for useSearchParams() */}
        <Suspense fallback={
          <div className="glass-card p-8 space-y-6">
            <div className="h-12 skeleton rounded-lg" />
            <div className="h-12 skeleton rounded-lg" />
            <div className="h-12 skeleton rounded-lg" />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
