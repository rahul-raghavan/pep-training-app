'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type AuthUser = {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  name: string | null;
  traineeId: string | null;
  isActive: boolean;
};

export function useAuth(requiredRole?: 'admin' | 'super_admin') {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        const authUser: AuthUser = data.user;

        // Check role requirement
        if (requiredRole === 'super_admin' && authUser.role !== 'super_admin') {
          router.push('/login?error=access_denied');
          return;
        }
        if (requiredRole === 'admin' && authUser.role !== 'admin' && authUser.role !== 'super_admin') {
          router.push('/login?error=access_denied');
          return;
        }

        setUser(authUser);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [router, requiredRole]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return { user, loading, logout };
}
