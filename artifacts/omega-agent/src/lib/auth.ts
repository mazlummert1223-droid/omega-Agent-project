/* ─── Local Auth — sunucusuz, otomatik misafir modu ─── */

export interface OmegaUser {
  email: string;
  name: string;
  createdAt: string;
}

const USER_KEY = 'omega_user';

/* Auto-create a guest user on first visit so no login is required */
function ensureGuestUser(): OmegaUser {
  const existing = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  if (existing) return existing;
  const guest: OmegaUser = {
    email: 'user@omega.ai',
    name: 'User',
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(USER_KEY, JSON.stringify(guest));
  return guest;
}

export function getUser(): OmegaUser | null {
  try { return ensureGuestUser(); } catch { return null; }
}

export function saveUser(user: OmegaUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function signOut() {
  localStorage.removeItem(USER_KEY);
  window.location.reload();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
