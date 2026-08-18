import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UiRole } from '../api/client';

/**
 * The signed-in identity. Deliberately independent of ../types, which belongs
 * to the older vendor-management screens and uses a different role vocabulary.
 */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UiRole;
  is_active: boolean;
  organization_id?: number;
  organization_name?: string;
  worker_id?: number | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'workday-auth' }
  )
);
