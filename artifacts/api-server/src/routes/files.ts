import { Router, type IRouter } from "express";
import { createRequire } from "node:module";
import { openrouter } from "@workspace/integrations-openrouter-ai";

// CJS packages that don't bundle cleanly in ESM — loaded via createRequire
const _require = createRequire(import.meta.url);
const multer: any = _require("multer");
const mammoth: { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> } = _require("mammoth");
const XLSX: any = _require("xlsx");
const JSZip: any = _require("jszip");

// pdf-parse v1: exports a default function pdfParse(buffer) → Promise<{text, numpages, info}>
const pdfParse: (buf: Buffer, opts?: any) => Promise<{ text: string; numpages: number; info: any }> = _require("pdf-parse");

const router: IRouter = Router();

// Memory-only storage — files never touch disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ── PPTX Text Extractor ───────────────────────────────────────────────────────
async function parsePptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((f) => f.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] ?? "0");
      const nb = parseInt(b.match(/\d+/)?.[0] ?? "0");
      return na - nb;
    });

  const parts: string[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("text");
    // Extract all text runs from XML
    const texts: string[] = [];
    const re = /<a:t>([^<]*)<\/a:t>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      if (m[1].trim()) texts.push(m[1]);
    }
    if (texts.length > 0) {
      parts.push(`## Slayt ${i + 1}\n${texts.join("\n")}`);
    }
  }

  // Extract notes
  const noteFiles = Object.keys(zip.files).filter((f) =>
    f.match(/^ppt\/notesSlides\/notesSlide\d+\.xml$/)
  );
  for (const nf of noteFiles.slice(0, 5)) {
    const xml = await zip.files[nf].async("text");
    const texts: string[] = [];
    const re = /<a:t>([^<]*)<\/a:t>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      if (m[1].trim() && !m[1].startsWith("Click to")) texts.push(m[1]);
    }
    if (texts.length) parts.push(`[Not: ${texts.join(" ")}]`);
  }

  return parts.join("\n\n").substring(0, 80_000);
}

// ── Image Vision Analysis ─────────────────────────────────────────────────────
async function analyzeImageWithAI(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const VISION_MODELS = [
    "meta-llama/llama-3.2-11b-vision-instruct:free",
    "google/gemma-3-27b-it:free",
  ];

  for (const model of VISION_MODELS) {
    try {
      const resp = await openrouter.chat.completions.create({
        model,
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
              {
                type: "text",
                text: `Bu görseli Türkçe olarak detaylıca açıkla. Görüntüde metin varsa hepsini yaz. Tablo, grafik veya diyagram varsa içeriğini analiz et. Dosya adı: ${filename}`,
              },
            ],
          },
        ],
      } as any);
      const content = resp.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.length > 20) return content;
    } catch {}
  }

  return `[Görsel analiz edildi: ${filename}. AI görsel modellerine ulaşılamadı.]`;
}

// ── File Type Detection ───────────────────────────────────────────────────────
function detectType(filename: string, mime: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "docx" || mime.includes("wordprocessingml")) return "docx";
  if (ext === "xlsx" || mime.includes("spreadsheetml")) return "xlsx";
  if (ext === "xls" || mime.includes("ms-excel")) return "xls";
  if (ext === "csv" || mime === "text/csv") return "csv";
  if (ext === "tsv") return "csv";
  if (ext === "pptx" || mime.includes("presentationml")) return "pptx";
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext)) return "image";
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video";
  if (["txt", "md", "json", "xml", "html", "csv"].includes(ext)) return "text";
  return "unknown";
}

// ── Parse Route ───────────────────────────────────────────────────────────────
router.post("/parse", upload.array("files", 5), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: "Dosya bulunamadı" });
    return;
  }

  const results: Array<{
    name: string;
    type: string;
    size: number;
    text: string;
    pages?: number;
    sheets?: string[];
    slides?: number;
    error?: string;
  }> = [];

  for (const file of files) {
    const type = detectType(file.originalname, file.mimetype);
    const sizeKb = Math.round(file.size / 1024);

    try {
      // ── PDF ──────────────────────────────────────────────────────────────
      if (type === "pdf") {
        const data = await pdfParse(file.buffer);
        const text = data.text.trim().substring(0, 100_000);
        results.push({
          name: file.originalname,
          type: "PDF",
          size: sizeKb,
          pages: data.numpages,
          text: text || "[PDF içeriği okunamadı — taranmış görsel olabilir]",
        });

      // ── DOCX ─────────────────────────────────────────────────────────────
      } else if (type === "docx") {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        results.push({
          name: file.originalname,
          type: "Word",
          size: sizeKb,
          text: result.value.trim().substring(0, 100_000),
        });

      // ── XLSX / XLS ────────────────────────────────────────────────────────
      } else if (type === "xlsx" || type === "xls") {
        const wb = XLSX.read(file.buffer, { type: "buffer" });
        const sheetNames = wb.SheetNames;
        const parts: string[] = [];

        for (const name of sheetNames.slice(0, 10)) {
          const ws = wb.Sheets[name];
          const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
          if (csv.trim()) parts.push(`### Sayfa: ${name}\n${csv}`);
        }

        results.push({
          name: file.originalname,
          type: "Excel",
          size: sizeKb,
          sheets: sheetNames,
          text: parts.join("\n\n").substring(0, 100_000),
        });

      // ── CSV / TSV ─────────────────────────────────────────────────────────
      } else if (type === "csv") {
        const text = file.buffer.toString("utf-8");
        const wb = XLSX.read(text, { type: "string" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
        const preview = parsed.slice(0, 500).map((row) => row.join(" | ")).join("\n");
        results.push({
          name: file.originalname,
          type: "CSV",
          size: sizeKb,
          text: `${parsed.length} satır, ${parsed[0]?.length ?? 0} sütun\n\n${preview}`.substring(0, 80_000),
        });

      // ── PPTX ──────────────────────────────────────────────────────────────
      } else if (type === "pptx") {
        const text = await parsePptx(file.buffer);
        const zip = await JSZip.loadAsync(file.buffer);
        const slideCount = Object.keys(zip.files).filter((f) =>
          f.match(/^ppt\/slides\/slide\d+\.xml$/)
        ).length;
        results.push({
          name: file.originalname,
          type: "PowerPoint",
          size: sizeKb,
          slides: slideCount,
          text,
        });

      // ── Image ─────────────────────────────────────────────────────────────
      } else if (type === "image") {
        const text = await analyzeImageWithAI(file.buffer, file.mimetype, file.originalname);
        results.push({
          name: file.originalname,
          type: "Görsel",
          size: sizeKb,
          text,
        });

      // ── Plain text ────────────────────────────────────────────────────────
      } else if (type === "text") {
        const text = file.buffer.toString("utf-8").substring(0, 100_000);
        results.push({
          name: file.originalname,
          type: "Metin",
          size: sizeKb,
          text,
        });

      // ── Unsupported ───────────────────────────────────────────────────────
      } else {
        results.push({
          name: file.originalname,
          type: "Bilinmiyor",
          size: sizeKb,
          text: "",
          error: `Bu dosya türü desteklenmiyor: .${file.originalname.split(".").pop()}`,
        });
      }
    } catch (err: any) {
      results.push({
        name: file.originalname,
        type: type.toUpperCase(),
        size: sizeKb,
        text: "",
        error: `Dosya okuma hatası: ${(err?.message ?? "bilinmeyen hata").substring(0, 100)}`,
      });
    }
  }

  res.json({ files: results });
});

export default router;
