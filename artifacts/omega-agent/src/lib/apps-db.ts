/* ─────────────────────────────────────────────────────────────
   APPS-DB  — localStorage tabanlı uygulama deposu
   Omega Agent tarafından üretilen HTML uygulamalarını saklar.
   ───────────────────────────────────────────────────────────── */

export interface LocalApp {
  id: string;
  name: string;
  html: string;
  createdAt: string;
  updatedAt: string;
}

const APPS_KEY = 'omega_apps';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readApps(): LocalApp[] {
  try { return JSON.parse(localStorage.getItem(APPS_KEY) || '[]'); } catch { return []; }
}

function writeApps(list: LocalApp[]): void {
  try { localStorage.setItem(APPS_KEY, JSON.stringify(list)); } catch {}
}

export const AppsDB = {
  list(): LocalApp[] {
    return readApps().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  save(name: string, html: string): LocalApp {
    const app: LocalApp = {
      id: uid(),
      name: name.slice(0, 80),
      html,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const apps = readApps();
    // Keep max 50 apps to avoid storage bloat
    const trimmed = apps.length >= 50 ? apps.slice(0, 49) : apps;
    writeApps([app, ...trimmed]);
    window.dispatchEvent(new CustomEvent('omega-apps-updated'));
    return app;
  },

  update(id: string, updates: Partial<Pick<LocalApp, 'name' | 'html'>>): void {
    const apps = readApps().map(a =>
      a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
    );
    writeApps(apps);
    window.dispatchEvent(new CustomEvent('omega-apps-updated'));
  },

  delete(id: string): void {
    writeApps(readApps().filter(a => a.id !== id));
    window.dispatchEvent(new CustomEvent('omega-apps-updated'));
  },

  get(id: string): LocalApp | null {
    return readApps().find(a => a.id === id) ?? null;
  },
};
