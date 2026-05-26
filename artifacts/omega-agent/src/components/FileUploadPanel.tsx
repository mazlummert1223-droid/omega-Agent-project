import React, { useState, useRef, useCallback } from "react";
import { FileText, FileSpreadsheet, Presentation, Image as ImageIcon, File, Upload, X, Loader2, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Credit system ─────────────────────────────────────────────────────────────
const DAILY_KEY = "omega_file_daily";
const FREE_LIMIT = 3;
const FREE_MAX_MB = 5;

interface DailyRecord { date: string; count: number }

function getDaily(): DailyRecord {
  try {
    const d = JSON.parse(localStorage.getItem(DAILY_KEY) ?? "{}") as DailyRecord;
    const today = new Date().toISOString().slice(0, 10);
    if (d.date === today) return d;
  } catch {}
  return { date: new Date().toISOString().slice(0, 10), count: 0 };
}

function incrementDaily() {
  const d = getDaily();
  d.count++;
  localStorage.setItem(DAILY_KEY, JSON.stringify(d));
}

function checkFileCredit(fileSizeMb: number): { ok: boolean; reason: string } {
  const d = getDaily();
  if (d.count >= FREE_LIMIT && fileSizeMb > FREE_MAX_MB) {
    return { ok: false, reason: `Günlük ücretsiz limit (${FREE_LIMIT} dosya) doldu.` };
  }
  if (fileSizeMb > FREE_MAX_MB) {
    const videoCredits = parseInt(localStorage.getItem("omega_video_credits") ?? "300", 10);
    if (videoCredits < 10) {
      return { ok: false, reason: "Büyük dosyalar için 10 Omega kredisi gerekli." };
    }
    localStorage.setItem("omega_video_credits", String(videoCredits - 10));
    toast.info("10 Omega kredisi kullanıldı");
  }
  incrementDaily();
  return { ok: true, reason: "" };
}

// ── File type config ──────────────────────────────────────────────────────────
const FILE_TYPES = [
  {
    id: "pdf",
    label: "PDF",
    icon: <FileText className="w-5 h-5" />,
    accept: ".pdf",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30 hover:border-red-400/60",
    desc: "Normal ve taranmış PDF",
    maxMb: 50,
  },
  {
    id: "word",
    label: "Word",
    icon: <FileText className="w-5 h-5" />,
    accept: ".docx",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30 hover:border-blue-400/60",
    desc: ".docx belgeler",
    maxMb: 20,
  },
  {
    id: "excel",
    label: "Excel / CSV",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    accept: ".xlsx,.xls,.csv,.tsv",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/30 hover:border-green-400/60",
    desc: "Tablolar ve veriler",
    maxMb: 10,
  },
  {
    id: "pptx",
    label: "PowerPoint",
    icon: <Presentation className="w-5 h-5" />,
    accept: ".pptx",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30 hover:border-orange-400/60",
    desc: "Sunum dosyaları",
    maxMb: 30,
  },
  {
    id: "image",
    label: "Görsel",
    icon: <ImageIcon className="w-5 h-5" />,
    accept: "image/*",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/30 hover:border-purple-400/60",
    desc: "JPG, PNG, WebP — AI ile analiz",
    maxMb: 10,
  },
  {
    id: "any",
    label: "Herhangi Dosya",
    icon: <File className="w-5 h-5" />,
    accept: ".pdf,.docx,.xlsx,.xls,.csv,.pptx,.txt,.md,.json,.png,.jpg,.jpeg,.webp",
    color: "text-muted-foreground",
    bg: "bg-secondary/50 border-border hover:border-primary/40",
    desc: "Desteklenen tüm formatlar",
    maxMb: 50,
  },
];

// ── Parsed file result ────────────────────────────────────────────────────────
export interface ParsedFile {
  name: string;
  type: string;
  size: number;
  text: string;
  pages?: number;
  sheets?: string[];
  slides?: number;
  error?: string;
}

// ── FileCard ──────────────────────────────────────────────────────────────────
export function FileCard({
  file,
  onRemove,
  onQuickAction,
}: {
  file: ParsedFile;
  onRemove: () => void;
  onQuickAction: (prompt: string) => void;
}) {
  const QUICK_ACTIONS: Record<string, Array<{ label: string; prompt: string }>> = {
    PDF: [
      { label: "Özetle", prompt: "Bu PDF'yi kısaca özetle" },
      { label: "Anahtar Noktalar", prompt: "Bu PDF'deki en önemli noktaları listele" },
      { label: "Türkçeye Çevir", prompt: "Bu PDF içeriğini Türkçeye çevir" },
      { label: "Soru-Cevap", prompt: "Bu PDF hakkında soru sormak istiyorum" },
    ],
    Word: [
      { label: "Özetle", prompt: "Bu Word belgesini kısaca özetle" },
      { label: "Düzelt", prompt: "Bu belgede gramer ve yazım hatalarını düzelt" },
      { label: "Çevir", prompt: "Bu belgeyi Türkçeye çevir" },
      { label: "Formatla", prompt: "Bu belgeyi daha iyi formatlayarak yeniden yaz" },
    ],
    Excel: [
      { label: "Analiz Et", prompt: "Bu Excel verisini analiz et, trendleri ve önemli noktaları belirt" },
      { label: "Özet Çıkar", prompt: "Bu veriden istatistiksel özet çıkar" },
      { label: "Anomali Bul", prompt: "Bu veride anormal değerler veya hatalar var mı?" },
      { label: "Grafik Öner", prompt: "Bu veri için en uygun grafik türlerini öner ve açıkla" },
    ],
    CSV: [
      { label: "Analiz Et", prompt: "Bu CSV verisini analiz et" },
      { label: "Özet", prompt: "Bu CSV'den istatistiksel özet çıkar" },
      { label: "Anomali", prompt: "Bu veride anormal değerleri bul" },
    ],
    PowerPoint: [
      { label: "Özetle", prompt: "Bu sunumdaki slaytları özetle" },
      { label: "Ana Noktalar", prompt: "Bu sunumun ana mesajlarını ve önemli noktalarını listele" },
      { label: "İyileştir", prompt: "Bu sunum içeriğini nasıl geliştirebilirim? Öneriler sun" },
      { label: "Çevir", prompt: "Bu sunumu Türkçeye çevir" },
    ],
    Görsel: [
      { label: "Açıkla", prompt: "Bu görseli detaylıca açıkla" },
      { label: "Metin Çıkar", prompt: "Bu görseldeki tüm metinleri çıkar" },
      { label: "Analiz Et", prompt: "Bu görseli analiz et ve içeriğini yorumla" },
    ],
    Metin: [
      { label: "Özetle", prompt: "Bu metni özetle" },
      { label: "Analiz Et", prompt: "Bu metni analiz et" },
      { label: "Çevir", prompt: "Bu metni Türkçeye çevir" },
    ],
  };

  const actions = QUICK_ACTIONS[file.type] ?? QUICK_ACTIONS["PDF"];

  const meta = [
    file.size > 0 && `${file.size < 1024 ? file.size + " KB" : (file.size / 1024).toFixed(1) + " MB"}`,
    file.pages && `${file.pages} sayfa`,
    file.slides && `${file.slides} slayt`,
    file.sheets && `${file.sheets.length} sayfa`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="mx-3 mb-2 bg-secondary/60 border border-border rounded-2xl overflow-hidden">
      {/* File header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {file.type}
            {meta ? ` · ${meta}` : ""}
            {file.error ? ` · ❌ ${file.error}` : " · ✅ Okundu"}
          </p>
        </div>
        <button onClick={onRemove} className="text-muted-foreground hover:text-white transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick actions */}
      {!file.error && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => onQuickAction(a.prompt)}
              className="px-2.5 py-1 text-xs rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Upload Panel ─────────────────────────────────────────────────────────
interface FileUploadPanelProps {
  onClose: () => void;
  onFileParsed: (file: ParsedFile) => void;
}

export function FileUploadPanel({ onClose, onFileParsed }: FileUploadPanelProps) {
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "reading" | "done">("idle");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<(typeof FILE_TYPES)[0] | null>(null);

  const processFile = useCallback(async (file: File) => {
    const sizeMb = file.size / (1024 * 1024);
    const credit = checkFileCredit(sizeMb);
    if (!credit.ok) {
      toast.error(credit.reason);
      return;
    }

    setLoading(true);
    setPhase("uploading");

    try {
      const formData = new FormData();
      formData.append("files", file);

      setPhase("reading");
      const response = await fetch(`${BASE}/api/files/parse`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const parsed: ParsedFile = data.files?.[0];

      if (!parsed) throw new Error("Dosya ayrıştırılamadı");

      setPhase("done");
      setTimeout(() => {
        onFileParsed(parsed);
        onClose();
      }, 600);
    } catch (err: any) {
      toast.error(`Dosya yüklenemedi: ${err?.message ?? "bilinmeyen hata"}`);
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  }, [onClose, onFileParsed]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const openPicker = (ft: (typeof FILE_TYPES)[0]) => {
    setSelectedType(ft);
    if (fileInputRef.current) {
      fileInputRef.current.accept = ft.accept;
      fileInputRef.current.click();
    }
  };

  if (loading) {
    return (
      <div className="absolute bottom-full mb-2 left-3 right-3 bg-card border border-border rounded-2xl p-6 shadow-2xl z-50 flex flex-col items-center gap-3 animate-fade-up">
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          {phase === "done"
            ? <CheckCircle className="w-6 h-6 text-emerald-400" />
            : <Loader2 className="w-6 h-6 text-primary animate-spin" />
          }
        </div>
        <div className="text-center">
          <p className="text-white font-medium text-sm">
            {phase === "uploading" && "📎 Dosya yükleniyor..."}
            {phase === "reading" && "📖 İçerik okunuyor..."}
            {phase === "done" && "✅ Hazır!"}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {phase === "done" ? "Sohbete ekleniyor" : "Lütfen bekleyin"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full mb-2 left-3 right-3 bg-card border border-border rounded-2xl p-4 shadow-2xl z-50 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Dosya Yükle</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* File type grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {FILE_TYPES.map((ft) => (
          <button
            key={ft.id}
            onClick={() => openPicker(ft)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
              ft.bg
            )}
          >
            <span className={ft.color}>{ft.icon}</span>
            <span className="text-white text-xs font-medium leading-tight">{ft.label}</span>
            <span className="text-muted-foreground/60 text-[10px] leading-tight">{ft.desc}</span>
          </button>
        ))}
      </div>

      {/* Drag & drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        className={cn(
          "border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 transition-all cursor-pointer",
          dragging ? "border-primary/60 bg-primary/5" : "border-border/40 hover:border-primary/30"
        )}
        onClick={() => openPicker(FILE_TYPES[FILE_TYPES.length - 1])}
      >
        <Upload className={cn("w-5 h-5 transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
        <p className="text-xs text-muted-foreground text-center">
          Dosyayı buraya sürükle veya tıkla
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
        Ücretsiz: 3 dosya/gün (5 MB) · Büyük dosyalar 10 kredi · Dosyalar işlendikten sonra otomatik silinir
      </p>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
