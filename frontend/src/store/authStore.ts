import { create } from 'zustand';

export type AuthMode = 'guest' | 'user';

export interface User {
  email: string;
  passwordHash: string; // simple base64 for demo
}

interface AuthState {
  isAuthenticated: boolean;
  mode: AuthMode;
  user: User | null;

  login: (email: string, password: string) => { ok: boolean; error?: string };
  loginAsGuest: () => void;
  logout: () => void;
  changePassword: (oldPw: string, newPw: string) => { ok: boolean; error?: string };
  deleteAccount: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'bms_auth';
const USERS_KEY   = 'bms_users';

function hashPw(pw: string) { return btoa(pw); }

function loadUsers(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
  catch { return {}; }
}
function saveUsers(u: Record<string, string>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  mode: 'guest',
  user: null,

  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const { mode, user } = JSON.parse(raw);
      set({ isAuthenticated: true, mode, user: user ?? null });
    } catch { /* ignore */ }
  },

  login: (email, password) => {
    const users = loadUsers();
    const hash = hashPw(password);

    if (users[email]) {
      // existing user — verify
      if (users[email] !== hash) return { ok: false, error: 'Incorrect password' };
    } else {
      // new user — register on first login
      users[email] = hash;
      saveUsers(users);
    }

    const user: User = { email, passwordHash: hash };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'user', user }));
    set({ isAuthenticated: true, mode: 'user', user });
    return { ok: true };
  },

  loginAsGuest: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'guest', user: null }));
    set({ isAuthenticated: true, mode: 'guest', user: null });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ isAuthenticated: false, mode: 'guest', user: null });
  },

  changePassword: (oldPw, newPw) => {
    const { user } = get();
    if (!user) return { ok: false, error: 'Not logged in' };
    if (hashPw(oldPw) !== user.passwordHash) return { ok: false, error: 'Current password is incorrect' };
    if (newPw.length < 6) return { ok: false, error: 'New password must be at least 6 characters' };

    const users = loadUsers();
    const newHash = hashPw(newPw);
    users[user.email] = newHash;
    saveUsers(users);

    const updated = { ...user, passwordHash: newHash };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'user', user: updated }));
    set({ user: updated });
    return { ok: true };
  },

  deleteAccount: () => {
    const { user } = get();
    if (user) {
      const users = loadUsers();
      delete users[user.email];
      saveUsers(users);
    }
    localStorage.removeItem(STORAGE_KEY);
    set({ isAuthenticated: false, mode: 'guest', user: null });
  },
}));
