import { Router, type Request, type Response } from "express";
import type { IRouter } from "express";

const router: IRouter = Router();

const LTX_BASE = "https://api.ltx.video";
const LTX_KEY = process.env["LTX_API_KEY"] ?? "";

const RESOLUTION = "1920x1080";
const BASE_DURATION = 10;

type Quality = "fast" | "pro";

function getModel(quality: Quality) {
  return quality === "pro" ? "ltx-2-3-pro" : "ltx-2-3-fast";
}

async function submitGeneration(prompt: string, duration: number, model: string) {
  const res = await fetch(`${LTX_BASE}/v2/text-to-video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LTX_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, model, resolution: RESOLUTION, duration }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { id: string; created_at: string };
  return data.id;
}

async function pollJob(jobId: string, endpoint: "text-to-video" | "extend"): Promise<string> {
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${LTX_BASE}/v2/${endpoint}/${jobId}`, {
      headers: { Authorization: `Bearer ${LTX_KEY}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) continue;
    const data = (await res.json()) as {
      status: string;
      result?: { video_url: string };
    };
    if (data.status === "completed" && data.result?.video_url) {
      return data.result.video_url;
    }
    if (data.status === "failed") {
      const errData = data as any;
      const errMsg = errData?.error?.message ?? "LTX job failed";
      if (errData?.error?.type === "insufficient_funds_error") {
        throw new Error(`LTX hesabında yetersiz bakiye. ${errMsg}. Lütfen https://console.ltx.video adresinden kredi yükleyin.`);
      }
      throw new Error(errMsg);
    }
  }
  throw new Error("Zaman aşımı: Video 6 dakika içinde tamamlanamadı");
}

async function submitExtend(videoUrl: string, prompt: string, extendSeconds: number, model: string) {
  const res = await fetch(`${LTX_BASE}/v2/extend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LTX_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_uri: videoUrl,
      prompt,
      duration: extendSeconds,
      model,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { id: string; created_at: string };
  return data.id;
}

function sendEvent(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.get("/generate", async (req: Request, res: Response) => {
  const prompt = String(req.query["prompt"] ?? "").trim();
  const durationParam = Number(req.query["duration"] ?? 15);
  const quality: Quality = req.query["quality"] === "pro" ? "pro" : "fast";

  if (!prompt) {
    res.status(400).json({ error: "prompt gerekli" });
    return;
  }

  if (!LTX_KEY) {
    res.status(500).json({ error: "LTX_API_KEY tanımlı değil" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const model = getModel(quality);

  try {
    const totalDuration = durationParam;
    const segments: Array<{ duration: number }> = [];

    if (totalDuration <= 10) {
      segments.push({ duration: totalDuration });
    } else {
      segments.push({ duration: BASE_DURATION });
      let remaining = totalDuration - BASE_DURATION;
      while (remaining > 0) {
        const seg = Math.min(20, remaining);
        segments.push({ duration: seg });
        remaining -= seg;
      }
    }

    const totalSegments = segments.length;
    let currentVideoUrl = "";

    for (let i = 0; i < totalSegments; i++) {
      const seg = segments[i];

      if (i === 0) {
        sendEvent(res, {
          step: "generating",
          message: `Video üretiliyor... (${i + 1}/${totalSegments})`,
          progress: 5,
        });

        const jobId = await submitGeneration(prompt, seg.duration, model);

        sendEvent(res, {
          step: "polling",
          message: "İşleniyor, lütfen bekleyin...",
          progress: 10 + Math.round((i / totalSegments) * 60),
        });

        currentVideoUrl = await pollJob(jobId, "text-to-video");

        const prog = Math.round(((i + 1) / totalSegments) * 80);
        sendEvent(res, {
          step: "segment_done",
          message: totalSegments > 1 ? `Segment ${i + 1}/${totalSegments} tamamlandı` : "Video hazırlanıyor...",
          progress: prog,
          segmentUrl: currentVideoUrl,
        });
      } else {
        sendEvent(res, {
          step: "extending",
          message: `Video uzatılıyor... (${i + 1}/${totalSegments})`,
          progress: Math.round(((i + 0.1) / totalSegments) * 80),
        });

        const extJobId = await submitExtend(currentVideoUrl, prompt, seg.duration, model);

        sendEvent(res, {
          step: "polling",
          message: `Uzatma işleniyor... (${i + 1}/${totalSegments})`,
          progress: Math.round(((i + 0.5) / totalSegments) * 80),
        });

        currentVideoUrl = await pollJob(extJobId, "extend");

        const prog = Math.round(((i + 1) / totalSegments) * 80);
        sendEvent(res, {
          step: "segment_done",
          message: `Segment ${i + 1}/${totalSegments} tamamlandı`,
          progress: prog,
          segmentUrl: currentVideoUrl,
        });
      }
    }

    sendEvent(res, {
      step: "complete",
      progress: 100,
      videoUrl: currentVideoUrl,
    });
  } catch (err: any) {
    sendEvent(res, {
      step: "error",
      error: err?.message ?? "Bilinmeyen hata",
    });
  } finally {
    res.end();
  }
});

export default router;
