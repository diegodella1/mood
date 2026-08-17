'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/admin/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip auth check on login page
    if (pathname === '/admin/login') {
      setIsAuthenticated(true);
      return;
    }

    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/session');
        if (!response.ok) {
          router.replace('/admin/login');
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.replace('/admin/login');
      }
    };

    void checkSession();
  }, [pathname, router]);

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  // Login page renders without sidebar
  if (pathname === '/admin/login') {
    return <div className="min-h-screen bg-zinc-950">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
