/* ─── Local Auth — e-posta tabanlı, sunucusuz ─── */

export interface OmegaUser {
  email: string;
  name: string;
  createdAt: string;
}

const USER_KEY = 'omega_user';

export function getUser(): OmegaUser | null {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}

export function saveUser(user: OmegaUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function signOut() {
  localStorage.removeItem(USER_KEY);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
