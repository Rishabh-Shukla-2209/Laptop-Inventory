import { Suspense } from 'react';
import AuthProvider from '@/components/providers/AuthProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import Sidebar from '@/components/layout/Sidebar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen bg-bg-primary">
          <Suspense fallback={<div className="fixed top-0 left-0 h-screen w-64 bg-bg-secondary border-r border-border-primary hidden lg:block" />}>
            <Sidebar />
          </Suspense>
          <main className="lg:pl-64 min-h-screen transition-all duration-300">
            <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-6">
              {children}
            </div>
          </main>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
