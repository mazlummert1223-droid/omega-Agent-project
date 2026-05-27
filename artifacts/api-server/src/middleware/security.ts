import type { Request, Response, NextFunction } from "express";

// ── Security Event Log ────────────────────────────────────────────────────────
interface SecurityEvent {
  type: string;
  ip: string;
  detail: string;
  ts: number;
}

const MAX_LOG = 500;
const securityEvents: SecurityEvent[] = [];
let totalBlocked = 0;
let totalRequests = 0;

function maskIp(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip.substring(0, 8) + "***";
}

function sanitizeForLog(s: string): string {
  return s
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/api[_-]?key[=:\s]+\S+/gi, "api_key=[REDACTED]")
    .replace(/password[=:\s]+\S+/gi, "password=[REDACTED]")
    .substring(0, 300);
}

export function securityLog(type: string, ip: string, detail: string) {
  const ev: SecurityEvent = {
    type,
    ip: maskIp(ip),
    detail: sanitizeForLog(detail),
    ts: Date.now(),
  };
  securityEvents.unshift(ev);
  if (securityEvents.length > MAX_LOG) securityEvents.pop();
  if (type !== "REQUEST") totalBlocked++;
}

export function getSecurityStats() {
  return {
    totalRequests,
    totalBlocked,
    recentEvents: securityEvents.slice(0, 50),
    uptime: Math.floor(process.uptime()),
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  };
}

// ── Rate Limiter ──────────────────────────────────────────────────────────────
interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();
const RATE_MAX = 20;
const RATE_WINDOW = 60_000;

// Cleanup stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (now > bucket.resetAt + RATE_WINDOW) rateBuckets.delete(ip);
  }
}, 5 * 60_000);

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req.ip ?? req.socket?.remoteAddress ?? "unknown").replace("::ffff:", "");
  const now = Date.now();

  let bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + RATE_WINDOW };
    rateBuckets.set(ip, bucket);
    return next();
  }

  if (bucket.count >= RATE_MAX) {
    securityLog("RATE_LIMIT", ip, `${req.method} ${req.path} — limit exceeded`);
    res.status(429).json({
      error: "Çok fazla istek. Lütfen bir dakika bekleyin.",
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    });
    return;
  }

  bucket.count++;
  next();
}

// ── Prompt Injection Guard ────────────────────────────────────────────────────
const INJECTION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /talimatlar[ıi]\s*(unut|sil|yoksay)/i, label: "forget_instructions_tr" },
  { re: /sistem\s*prompt[u]?\s*(göster|ver|paylaş|oku)/i, label: "system_prompt_reveal_tr" },
  { re: /ignore\s+(all\s+)?(previous|prior)\s+(instructions?|prompts?|system)/i, label: "ignore_previous" },
  { re: /jailbreak/i, label: "jailbreak" },
  { re: /\bDAN\s+mod[u]?\b/i, label: "DAN_mode" },
  { re: /geliştirici\s+mod[u]?/i, label: "developer_mode_tr" },
  { re: /developer\s+mode\s+enabled/i, label: "developer_mode_en" },
  { re: /\[SYSTEM\]|\[INST\]|<\|system\|>|<\|im_start\|>/i, label: "system_token_injection" },
  { re: /act\s+as\s+(an?\s+)?(evil|unrestricted|uncensored|unfiltered|jailbroken)/i, label: "role_injection" },
  { re: /you\s+are\s+now\s+(DAN|unrestricted|unfiltered|uncensored|free)/i, label: "identity_injection" },
  { re: /reveal\s+(your\s+)?(system\s+)?(prompt|instructions?|training)/i, label: "prompt_leak" },
  { re: /bypass\s+(your\s+)?(safety|restrictions?|filters?|guidelines?)/i, label: "safety_bypass" },
  { re: /önceki\s+talimatlar[ıi]\s*(unut|sil|yoksay)/i, label: "forget_instructions_tr2" },
];

// Extract only the user-authored portion of the body for injection checking.
// When a file is embedded, the format is:
//   [DOSYA: ...]\nİçerik:\n{file text}\n---\nKullanıcı sorusu: {actual question}
// We only want to check the actual question, not the document content.
function extractUserQuery(s: string): string {
  const sep = "---\nKullanıcı sorusu:";
  const idx = s.indexOf(sep);
  if (idx !== -1) return s.slice(idx + sep.length).trim();
  // No file embed — check the whole string, but cap at 4000 chars to avoid
  // scanning huge blobs and to prevent CPU exhaustion.
  return s.substring(0, 4000);
}

function extractBody(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const b = body as Record<string, unknown>;
  return [b["content"], b["message"], b["prompt"], b["task"], b["text"], b["query"]]
    .filter((v): v is string => typeof v === "string")
    .map(extractUserQuery)
    .join(" ");
}

export function promptInjectionGuard(req: Request, res: Response, next: NextFunction) {
  const text = extractBody(req.body);
  if (!text) return next();

  for (const { re, label } of INJECTION_PATTERNS) {
    if (re.test(text)) {
      const ip = (req.ip ?? "unknown").replace("::ffff:", "");
      securityLog("PROMPT_INJECTION", ip, `pattern=${label} path=${req.path}`);
      res.status(403).json({
        error: "İstek reddedildi. Güvenlik politikası ihlali tespit edildi.",
        code: "INJECTION_DETECTED",
      });
      return;
    }
  }
  next();
}

// ── Input Sanitization ────────────────────────────────────────────────────────
function sanitizeStr(s: string): string {
  return s
    .replace(/\x00/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "[script removed]")
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:\s*text\/html/gi, "")
    .replace(/on\w{1,30}\s*=\s*["'][^"']{0,500}["']/gi, "")
    .replace(/<[^>]{0,500}>/g, "")
    .substring(0, 50_000);
}

function sanitizeVal(v: unknown, depth = 0): unknown {
  if (depth > 6) return v;
  if (typeof v === "string") return sanitizeStr(v);
  if (Array.isArray(v)) return v.map((i) => sanitizeVal(i, depth + 1));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = sanitizeVal(val, depth + 1);
    }
    return out;
  }
  return v;
}

export function inputSanitizer(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeVal(req.body) as Record<string, unknown>;
  }
  next();
}

// ── Request Counter ───────────────────────────────────────────────────────────
export function requestCounter(req: Request, _res: Response, next: NextFunction) {
  totalRequests++;
  next();
}

// ── Error Sanitizer (no key leakage in error messages) ───────────────────────
export function errorSanitizer(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const safeMsg = (err.message ?? "Sunucu hatası")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/api[_-]?key[=:\s]+\S+/gi, "[REDACTED]")
    .replace(/sk-\S+/gi, "[REDACTED]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[TOKEN]")
    .substring(0, 200);

  res.status(500).json({ error: safeMsg });
}
