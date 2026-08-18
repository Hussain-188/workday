import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// The Spring Boot backend. Override with VITE_API_BASE_URL when it is not local.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 means the token is missing, expired or forged: drop the session.
    // 403 is a live session that may not touch this record, so it is left
    // to the calling view to surface as a message.
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Roles ────────────────────────────────────────────────────────────────────
// The API speaks SYSTEM_ADMIN/HR_MANAGER/MANAGER/WORKER; the UI is written
// against admin/hr/manager/worker. Translate once, here, so no component has
// to care which vocabulary it is holding.
export type UiRole = 'admin' | 'hr' | 'manager' | 'worker';

const ROLE_FROM_API: Record<string, UiRole> = {
  SYSTEM_ADMIN: 'admin',
  HR_MANAGER: 'hr',
  MANAGER: 'manager',
  WORKER: 'worker',
};

export const toUiRole = (apiRole: string): UiRole => ROLE_FROM_API[apiRole] ?? 'worker';

/** Pulls a readable message out of the backend's ApiError envelope. */
export const apiError = (e: any): string =>
  e?.response?.data?.message ||
  e?.response?.data?.fieldErrors?.[0]?.message ||
  e?.message ||
  'Something went wrong';

// ── Auth ─────────────────────────────────────────────────────────────────────
const toUiUser = (data: any) => ({
  id: data.userId,
  name: data.name,
  email: data.email,
  role: toUiRole(data.role),
  is_active: true,
  organization_id: data.organizationId,
  organization_name: data.organizationName,
  worker_id: data.workerId ?? null,
});

export const authApi = {
  /** The backend returns a flat payload; the UI wants {user, access_token}. */
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }).then((r) => ({
      user: toUiUser(r.data),
      access_token: r.data.accessToken,
      expires_in: r.data.expiresInSeconds,
    })),

  /** Confirms a restored token is still good; 401 clears the session. */
  me: () => api.get('/api/auth/me').then((r) => toUiUser(r.data)),

  /** Used to populate the manager picker when creating a team. */
  listUsers: (role?: 'SYSTEM_ADMIN' | 'HR_MANAGER' | 'MANAGER' | 'WORKER') =>
    api
      .get('/api/users', { params: role ? { role } : undefined })
      .then((r) =>
        r.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: toUiRole(u.role),
          is_active: u.status === 'ACTIVE',
        }))
      ),
};
