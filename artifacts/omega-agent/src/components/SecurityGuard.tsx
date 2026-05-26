import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Shield, Lock, AlertTriangle, Eye, X, CheckCircle } from "lucide-react";
import {
  isDomainAllowed,
  initSession,
  isSessionLocked,
  unlockSession,
  lockSession,
  hasMasterPassword,
  verifyMasterPassword,
  getRemainingAttempts,
  wipeAllData,
  startInactivityWatcher,
  watchDevtools,
  enableConsoleProtection,
  speakAlert,
  getTodayStats,
  getYesterdayStats,
} from "@/lib/security";

// ── Domain Warning ────────────────────────────────────────────────────────────
function DomainWarning() {
  return (
    <div className="fixed inset-0 z-[9999] bg-red-950 flex flex-col items-center justify-center text-center p-8">
      <div className="mb-6 w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500 animate-pulse">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <h1 className="text-3xl font-bold text-red-400 mb-3">⚠️ UYARI: Bu Site Güvenli Değil!</h1>
      <p className="text-red-300 text-lg mb-2">
        Bu sayfanın domaini tanınmıyor.
      </p>
      <p className="text-red-400/80 text-sm max-w-md mb-8">
        Orijinal Omega AI uygulamasına yalnızca yetkili domainlerden erişilebilir.
        Kimlik avı veya sahte site saldırısına maruz kalıyor olabilirsiniz.
      </p>
      <div className="bg-red-900/40 border border-red-700 rounded-xl px-6 py-4 text-sm text-red-300">
        <div className="font-mono">Tespit edilen domain: <span className="text-red-400 font-bold">{window.location.hostname}</span></div>
      </div>
      <p className="text-red-500/60 text-xs mt-8">Omega AI Güvenlik Sistemi — Erişim Engellendi</p>
    </div>
  );
}

// ── Session Lock Screen ───────────────────────────────────────────────────────
function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [wiped, setWiped] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = getRemainingAttempts();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleUnlock = async () => {
    if (!hasMasterPassword()) {
      unlockSession();
      onUnlock();
      return;
    }

    if (!password.trim()) {
      setError("Şifre boş bırakılamaz");
      return;
    }

    setChecking(true);
    const result = await verifyMasterPassword(password);
    setChecking(false);

    if (result === "ok") {
      unlockSession();
      onUnlock();
    } else if (result === "wiped") {
      setWiped(true);
      setTimeout(() => window.location.reload(), 3000);
    } else {
      const left = getRemainingAttempts();
      setError(
        left <= 0
          ? "Tüm denemeler tükendi. Veriler siliniyor..."
          : `Yanlış şifre. ${left} deneme hakkın kaldı.`
      );
      setPassword("");
      if (left <= 0) {
        setTimeout(() => {
          wipeAllData();
          window.location.reload();
        }, 2000);
      }
    }
  };

  if (wiped) {
    return (
      <div className="fixed inset-0 z-[9998] bg-background/98 backdrop-blur-xl flex flex-col items-center justify-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-red-400 mb-2">Veriler Silindi</h2>
        <p className="text-muted-foreground">Çok fazla başarısız deneme. Tüm oturum verileri temizlendi.</p>
        <p className="text-muted-foreground/60 text-sm mt-2">Yeniden yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9998] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Oturum Kilitlendi</h2>
          <p className="text-muted-foreground text-sm text-center">
            30 dakika hareketsizlik nedeniyle oturumunuz kilitlendi.
          </p>
        </div>

        {hasMasterPassword() ? (
          <div className="space-y-4">
            <div>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="Master şifrenizi girin"
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
              {error && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </p>
              )}
              {remaining <= 2 && remaining > 0 && !error && (
                <p className="text-amber-400/80 text-xs mt-2">
                  ⚠️ {remaining} deneme hakkın kaldı. Tükenirse tüm veriler silinir.
                </p>
              )}
            </div>
            <button
              onClick={handleUnlock}
              disabled={checking}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-3 font-medium transition-colors disabled:opacity-50"
            >
              {checking ? "Doğrulanıyor..." : "Kilidi Aç"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleUnlock}
            className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-3 font-medium transition-colors"
          >
            Oturumu Devam Ettir
          </button>
        )}
      </div>
    </div>
  );
}

// ── DevTools Warning Overlay ──────────────────────────────────────────────────
function DevtoolsWarning({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed bottom-24 right-4 z-[9997] bg-amber-950/90 border border-amber-600/50 rounded-2xl p-4 max-w-xs shadow-2xl backdrop-blur-sm animate-fade-up">
      <div className="flex items-start gap-3">
        <Eye className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-amber-300 font-semibold text-sm">Geliştirici Araçları Açık</p>
          <p className="text-amber-400/70 text-xs mt-1">
            ⚠️ OMEGA AI — Güvenli Alan. Konsol kullanımı izlenmektedir.
          </p>
        </div>
        <button onClick={onDismiss} className="text-amber-500/60 hover:text-amber-300 transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Daily Security Report Banner ──────────────────────────────────────────────
function SecurityReportBanner({ onDismiss }: { onDismiss: () => void }) {
  const yesterday = getYesterdayStats();
  const today = getTodayStats();

  if (!yesterday && today.requests === 0 && today.blocked === 0) return null;

  const hasAlerts = (yesterday?.blocked ?? 0) > 0 || (yesterday?.suspicious ?? 0) > 0;
  const displayStats = yesterday ?? today;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9990] max-w-md w-full mx-4 rounded-2xl border shadow-2xl backdrop-blur-sm animate-fade-down ${
        hasAlerts
          ? "bg-amber-950/90 border-amber-600/40"
          : "bg-emerald-950/90 border-emerald-600/40"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {hasAlerts ? (
          <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${hasAlerts ? "text-amber-300" : "text-emerald-300"}`}>
            🛡️ Günlük Güvenlik Raporu
          </p>
          <p className={`text-xs mt-1 ${hasAlerts ? "text-amber-400/80" : "text-emerald-400/80"}`}>
            {yesterday ? "Dün" : "Bugün"}:{" "}
            <span className="font-medium">{displayStats.requests}</span> istek işlendi
            {displayStats.blocked > 0 && (
              <span className="text-red-400"> · {displayStats.blocked} engellendi</span>
            )}
            {displayStats.suspicious > 0 && (
              <span className="text-amber-400"> · {displayStats.suspicious} şüpheli girişim</span>
            )}
          </p>
          {hasAlerts && (
            <p className="text-amber-500/70 text-xs mt-1">
              Dün {(displayStats.blocked + displayStats.suspicious)} şüpheli girişim engellendi.
            </p>
          )}
          {!hasAlerts && yesterday && (
            <p className="text-emerald-500/70 text-xs mt-1">Dün herhangi bir güvenlik ihlali tespit edilmedi. ✓</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 transition-colors ${hasAlerts ? "text-amber-500/60 hover:text-amber-300" : "text-emerald-500/60 hover:text-emerald-300"}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main Security Guard ───────────────────────────────────────────────────────
export function SecurityGuard({ children }: { children: React.ReactNode }) {
  const [domainOk] = useState(() => isDomainAllowed());
  const [locked, setLocked] = useState(() => isSessionLocked());
  const [showDevtools, setShowDevtools] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const initialized = useRef(false);

  const handleLock = useCallback(() => {
    setLocked(true);
  }, []);

  const handleUnlock = useCallback(() => {
    setLocked(false);
  }, []);

  useEffect(() => {
    if (!domainOk || initialized.current) return;
    initialized.current = true;

    // Init session
    if (!isSessionLocked()) {
      initSession();
    }

    // Console protection
    enableConsoleProtection();

    // Inactivity watcher
    const stopWatcher = startInactivityWatcher(handleLock);

    // DevTools watcher
    const stopDevtools = watchDevtools(() => {
      setShowDevtools(true);
      speakAlert("Geliştirici araçları açıldı. Omega AI güvenli alan uyarısı.");
    });

    // Show security report banner after 2s
    const reportTimer = setTimeout(() => setShowReport(true), 2000);

    return () => {
      stopWatcher();
      stopDevtools();
      clearTimeout(reportTimer);
    };
  }, [domainOk, handleLock]);

  // Blocked — wrong domain
  if (!domainOk) return <DomainWarning />;

  return (
    <>
      {locked && <LockScreen onUnlock={handleUnlock} />}
      {showDevtools && !locked && (
        <DevtoolsWarning onDismiss={() => setShowDevtools(false)} />
      )}
      {showReport && !locked && (
        <SecurityReportBanner onDismiss={() => setShowReport(false)} />
      )}
      {children}
    </>
  );
}

// ── Manual Lock Button (exported for Sidebar) ─────────────────────────────────
export function LockButton() {
  const handleLock = () => {
    lockSession();
    window.location.reload();
  };

  return (
    <button
      onClick={handleLock}
      title="Oturumu Kilitle"
      className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-xs px-2 py-1.5 rounded-lg hover:bg-secondary/50"
    >
      <Lock className="w-3.5 h-3.5" />
      <span>Kilitle</span>
    </button>
  );
}
