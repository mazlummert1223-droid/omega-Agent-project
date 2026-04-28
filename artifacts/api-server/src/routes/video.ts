import { Router, type IRouter } from "express";
import { openrouter } from "@workspace/integrations-openrouter-ai";

// Doğrulanmış çalışan ücretsiz modeller (Nisan 2026)
const VIDEO_MODELS = [
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "z-ai/glm-4.5-air:free",
  "tencent/hy3-preview:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const router: IRouter = Router();

// Video script + storyboard üretimi
router.post("/generate-video", async (req, res) => {
  const { prompt, style = "cinematic", duration = "30" } = req.body;
  if (!prompt) { res.status(400).json({ error: "prompt gerekli" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  send({ step: "script", status: "running", message: "Video scripti oluşturuluyor..." });

  const systemPrompt = `Sen profesyonel bir video yönetmeni ve senarist Türkçe uzmanısın.
Video senaryolarını sahne sahne JSON formatında oluşturursun.
Her sahne için: başlık, görsel açıklama (İngilizce, görsel üretim için), Türkçe anlatım/diyalog, süre (saniye), müzik önerisi.
SADECE geçerli JSON döndür:
{
  "title": "video başlığı",
  "description": "genel açıklama", 
  "totalDuration": ${duration},
  "style": "${style}",
  "scenes": [
    {
      "id": 1,
      "title": "Sahne başlığı",
      "visualPrompt": "English visual description for image generation, ${style} style, cinematic",
      "narration": "Türkçe anlatım veya diyalog",
      "duration": 5,
      "music": "müzik önerisi",
      "transition": "fade/cut/slide"
    }
  ],
  "soundtrack": "genel müzik önerisi",
  "voiceover": "genel ses önerisi"
}`;

  let scriptContent = "";

  for (const model of VIDEO_MODELS) {
    try {
      console.log(`[Video] Trying ${model}`);
      const response = await openrouter.chat.completions.create({
        model,
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Bu konuda ${duration} saniyelik ${style} stil video senaryosu oluştur: "${prompt}"` },
        ],
      });
      scriptContent = response.choices[0]?.message?.content || "";
      if (scriptContent) {
        console.log(`[Video] Success ${model} (${scriptContent.length} chars)`);
        break;
      }
    } catch (e: any) {
      console.error(`[Video] Failed ${model}:`, e?.message || e);
      await sleep(400);
      continue;
    }
  }

  if (!scriptContent) {
    send({ error: "Script oluşturulamadı" });
    res.end();
    return;
  }

  // Parse JSON
  let videoData: any;
  try {
    const m = scriptContent.match(/\{[\s\S]*\}/);
    videoData = m ? JSON.parse(m[0]) : null;
  } catch {
    videoData = null;
  }

  if (!videoData) {
    send({ error: "Script formatı hatalı, tekrar dene" });
    res.end();
    return;
  }

  send({ step: "script", status: "done", data: videoData });

  // Her sahne için görsel üret
  const scenes = videoData.scenes || [];
  const framesWithImages: any[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    send({ step: "frame", status: "generating", index: i, total: scenes.length, scene });

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      `${scene.visualPrompt || scene.title}, ${style} style, cinematic, high quality, 16:9 aspect ratio`
    )}?width=1280&height=720&nologo=true&model=flux&seed=${Math.floor(Math.random() * 999999)}`;

    framesWithImages.push({ ...scene, imageUrl });
    send({ step: "frame", status: "done", index: i, imageUrl, scene });

    // Rate limit önleme
    if (i < scenes.length - 1) await sleep(300);
  }

  send({ step: "complete", status: "done", scenes: framesWithImages, videoData });
  res.end();
});

export default router;
