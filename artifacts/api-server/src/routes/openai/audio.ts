import { Router, type IRouter } from "express";
import multer from "multer";
import {
  speechToText,
  textToSpeech,
} from "@workspace/integrations-openai-ai-server/audio";
import { getSecurityBoundaryResponse } from "../../lib/omega-guard";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

function detectInputFormat(file: Express.Multer.File): "wav" | "mp3" | "webm" {
  const type = file.mimetype.toLowerCase();
  const name = file.originalname.toLowerCase();
  if (type.includes("wav") || name.endsWith(".wav")) return "wav";
  if (type.includes("mpeg") || type.includes("mp3") || name.endsWith(".mp3")) return "mp3";
  return "webm";
}

function cleanSpeechText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\[GENERATE_IMAGE:[\s\S]*?\]/gi, "")
    .replace(/\[GENERATE_VIDEO:[\s\S]*?\]/gi, "")
    .replace(/\[BUILD_APP\][\s\S]*?\[\/BUILD_APP\]/gi, "Uygulama hazırlandı.")
    .replace(/```[\s\S]*?```/g, "Kod bloğu oluşturuldu.")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 6_000);
}

router.post("/voice/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file?.buffer?.length) {
    res.status(400).json({ error: "Ses kaydı bulunamadı." });
    return;
  }

  try {
    const transcript = await speechToText(req.file.buffer, detectInputFormat(req.file));
    res.json({ transcript: transcript.trim().slice(0, 12_000) });
  } catch {
    res.status(502).json({ error: "Ses çözümlenemedi. Lütfen tekrar deneyin." });
  }
});

router.post("/voice/speak", async (req, res) => {
  const text = cleanSpeechText(req.body?.text);
  if (!text) {
    res.status(400).json({ error: "Seslendirilecek metin bulunamadı." });
    return;
  }

  const guarded = getSecurityBoundaryResponse(text);
  if (guarded) {
    res.status(403).json({ error: "Bu metin güvenlik nedeniyle seslendirilemez." });
    return;
  }

  try {
    // Onyx is a deep, neutral synthetic voice. It is an original AI voice,
    // not an imitation of a named actor or fictional character.
    const audio = await textToSpeech(text, "onyx", "mp3");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(audio);
  } catch {
    res.status(502).json({ error: "Omega şu anda ses üretemiyor." });
  }
});

export default router;