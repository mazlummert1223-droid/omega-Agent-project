// ── Domain Check ──────────────────────────────────────────────────────────────
const ALLOWED_PATTERNS = [
  /^localhost$/,
  /^127\.0\.0\.1$/,
  /^0\.0\.0\.0$/,
  /\.replit\.app$/,
  /\.replit\.dev$/,
  /\.repl\.co$/,
  /\.replit\.com$/,
  /\.pike\.replit\.dev$/,
  /\.id\.replit\.com$/,
];

export function isDomainAllowed(): boolean {
  const hostname = window.location.hostname;
  return ALLOWED_PATTERNS.some((p) => p.test(hostname));
}

// ── Session Token ─────────────────────────────────────────────────────────────
const SESSION_KEY = "omega_session_token";
const LOCK_KEY = "omega_locked";

export function generateToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function initSession(): string {
  const token = generateToken();
  sessionStorage.setItem(SESSION_KEY, token);
  localStorage.removeItem(LOCK_KEY);
  return token;
}

export function getSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function lockSession() {
  localStorage.setItem(LOCK_KEY, "1");
}

export function unlockSession() {
  localStorage.removeItem(LOCK_KEY);
}

export function isSessionLocked(): boolean {
  return localStorage.getItem(LOCK_KEY) === "1";
}

// ── Master Password ───────────────────────────────────────────────────────────
const PASS_HASH_KEY = "omega_pass_hash";
const ATTEMPTS_KEY = "omega_attempts";
const MAX_ATTEMPTS = 3;

async function sha256(s: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return btoa(s);
  }
}

export function hasMasterPassword(): boolean {
  return !!localStorage.getItem(PASS_HASH_KEY);
}

export async function setMasterPassword(password: string): Promise<void> {
  const hash = await sha256(password);
  localStorage.setItem(PASS_HASH_KEY, hash);
  localStorage.removeItem(ATTEMPTS_KEY);
}

export async function verifyMasterPassword(password: string): Promise<"ok" | "wrong" | "wiped"> {
  const stored = localStorage.getItem(PASS_HASH_KEY);
  if (!stored) return "ok";

  const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) ?? "0", 10);
  if (attempts >= MAX_ATTEMPTS) {
    wipeAllData();
    return "wiped";
  }

  const hash = await sha256(password);
  if (hash === stored) {
    localStorage.removeItem(ATTEMPTS_KEY);
    return "ok";
  }

  localStorage.setItem(ATTEMPTS_KEY, String(attempts + 1));
  return "wrong";
}

export function getRemainingAttempts(): number {
  const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) ?? "0", 10);
  return Math.max(0, MAX_ATTEMPTS - attempts);
}

export function wipeAllData() {
  localStorage.clear();
  sessionStorage.clear();
}

// ── Inactivity Timer ──────────────────────────────────────────────────────────
const INACTIVITY_MS = 30 * 60 * 1000;
let _timer: ReturnType<typeof setTimeout> | null = null;

function resetTimer(onLock: () => void) {
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    lockSession();
    onLock();
  }, INACTIVITY_MS);
}

export function startInactivityWatcher(onLock: () => void): () => void {
  const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
  const handler = () => resetTimer(onLock);
  events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
  resetTimer(onLock);
  return () => {
    events.forEach((e) => window.removeEventListener(e, handler));
    if (_timer) clearTimeout(_timer);
  };
}

// ── Suspicious Activity Detector ──────────────────────────────────────────────
interface SuspiciousState {
  timestamps: number[];
  lastMsg: string;
  repeatCount: number;
}

const _sus: SuspiciousState = { timestamps: [], lastMsg: "", repeatCount: 0 };

export function checkSuspicious(message: string): { ok: boolean; reason: string } {
  const now = Date.now();

  if (message.length > 10_000) {
    recordSuspicious();
    return { ok: false, reason: "Aşırı uzun mesaj tespit edildi (10.000+ karakter)" };
  }

  _sus.timestamps.push(now);
  _sus.timestamps = _sus.timestamps.filter((t) => now - t < 30_000);
  if (_sus.timestamps.length > 10) {
    recordSuspicious();
    return { ok: false, reason: "Çok hızlı ardarda mesaj gönderimi tespit edildi" };
  }

  const hour = new Date().getHours();
  if (hour >= 2 && hour < 5) {
    const nightMsgs = _sus.timestamps.filter((t) => now - t < 60_000);
    if (nightMsgs.length > 5) {
      recordSuspicious();
      return { ok: false, reason: "Gece 02:00–05:00 arası yoğun kullanım tespit edildi" };
    }
  }

  const trimmed = message.trim();
  if (trimmed && trimmed === _sus.lastMsg) {
    _sus.repeatCount++;
    if (_sus.repeatCount >= 5) {
      recordSuspicious();
      return { ok: false, reason: "Sürekli aynı komut tekrarı tespit edildi" };
    }
  } else {
    _sus.repeatCount = 0;
    _sus.lastMsg = trimmed;
  }

  return { ok: true, reason: "" };
}

// ── Daily Security Stats (localStorage) ──────────────────────────────────────
interface DayStats {
  date: string;
  requests: number;
  blocked: number;
  suspicious: number;
  lastActive: string;
}

const STATS_KEY = "omega_sec_stats";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

function loadStats(): Record<string, DayStats> {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveStats(stats: Record<string, DayStats>) {
  const keys = Object.keys(stats).sort().reverse();
  const trimmed: Record<string, DayStats> = {};
  keys.slice(0, 30).forEach((k) => (trimmed[k] = stats[k]));
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(trimmed));
  } catch {}
}

function mutateDay(field: keyof Omit<DayStats, "date" | "lastActive">) {
  const all = loadStats();
  const d = today();
  if (!all[d]) all[d] = { date: d, requests: 0, blocked: 0, suspicious: 0, lastActive: new Date().toISOString() };
  (all[d] as Record<string, unknown>)[field] = ((all[d] as Record<string, unknown>)[field] as number ?? 0) + 1;
  all[d].lastActive = new Date().toISOString();
  saveStats(all);
}

export function recordRequest() { mutateDay("requests"); }
export function recordBlocked() { mutateDay("blocked"); }
export function recordSuspicious() { mutateDay("suspicious"); }

export function getTodayStats(): DayStats {
  return loadStats()[today()] ?? { date: today(), requests: 0, blocked: 0, suspicious: 0, lastActive: "-" };
}

export function getYesterdayStats(): DayStats | null {
  return loadStats()[yesterday()] ?? null;
}

// ── Console Protection ────────────────────────────────────────────────────────
export function enableConsoleProtection() {
  const style = "font-size:18px;color:#ff4444;font-weight:bold;background:#0d0d0d;padding:8px 16px;border-radius:6px";
  const sub = "color:#888;font-size:13px";
  // Show warning then suppress
  setTimeout(() => {
    try {
      console.log("%c⚠️  OMEGA AI — Güvenli Alan", style);
      console.log("%cBu konsolda işlem yapmayınız. Yetkisiz erişim tespit edilirse hesabınız kilitlenebilir.", sub);
      const noop = () => {};
      console.log = noop;
      console.debug = noop;
      console.info = noop;
      console.table = noop;
      console.trace = noop;
      console.dir = noop;
      console.group = noop;
      console.groupEnd = noop;
    } catch {}
  }, 500);
}

// ── DevTools Detector ─────────────────────────────────────────────────────────
export function watchDevtools(onOpen: () => void): () => void {
  let open = false;
  const check = () => {
    const threshold = 160;
    const isOpen =
      window.outerWidth - window.innerWidth > threshold ||
      window.outerHeight - window.innerHeight > threshold;
    if (isOpen && !open) {
      open = true;
      onOpen();
    } else if (!isOpen) {
      open = false;
    }
  };
  const id = setInterval(check, 1500);
  return () => clearInterval(id);
}

// ── Speech Alert ─────────────────────────────────────────────────────────────
export function speakAlert(msg: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = "tr-TR";
    u.rate = 0.9;
    u.volume = 0.8;
    window.speechSynthesis.speak(u);
  } catch {}
}
