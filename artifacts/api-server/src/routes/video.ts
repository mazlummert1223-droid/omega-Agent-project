import { Router, type IRouter } from "express";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { spawn } from "child_process";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import { getBestModels } from "../lib/ai-models";
import { getLiveWebContext } from "../lib/live-web";

const VIDEO_DIR = path.join(os.tmpdir(), "omega-videos");
if (!existsSync(VIDEO_DIR)) {
  try { require("fs").mkdirSync(VIDEO_DIR, { recursive: true }); } catch {}
}

async function downloadImage(url: string, dest: string, maxRetries = 4): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(60000),
        headers: { "User-Agent": "Mozilla/5.0 OmegaAgent/1.0" },
      });
      if (!r.ok) {
        // Pollinations 429/503 - bekle ve tekrar dene
        const wait = 2000 * (attempt + 1) + Math.random() * 1500;
        await new Promise((res) => setTimeout(res, wait));
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 1000) {
        // Çok küçük (hata sayfası), tekrar dene
        await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
        continue;
      }
      await writeFile(dest, buf);
      return true;
    } catch {
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    }
  }
  return false;
}

function runFfmpeg(args: string[]): Promise<{ ok: boolean; err: string }> {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    proc.stderr.on("data", (d) => { err += d.toString(); });
    proc.on("close", (code) => resolve({ ok: code === 0, err }));
    proc.on("error", (e) => resolve({ ok: false, err: String(e) }));
  });
}

async function buildVideoMp4(
  scenes: { imageUrl: string; duration: number }[],
  jobId: string
): Promise<string | null> {
  const jobDir = path.join(VIDEO_DIR, jobId);
  await mkdir(jobDir, { recursive: true });

  // 1) İndirme - paralel ama concurrency=2 (Pollinations rate limit) + staggered start
  const localFiles: string[] = [];
  const downloadOne = async (scene: any, i: number) => {
    // Her isteği biraz farklı zamanda başlat
    await new Promise((res) => setTimeout(res, i * 800));
    const local = path.join(jobDir, `frame_${i.toString().padStart(3, "0")}.jpg`);
    const ok = await downloadImage(scene.imageUrl, local);
    if (!ok) return null;
    return { i, local };
  };
  // 2'şerli batch
  const batchResults: Array<{ i: number; local: string } | null> = [];
  for (let b = 0; b < scenes.length; b += 2) {
    const batch = scenes.slice(b, b + 2).map((s, idx) => downloadOne(s, b + idx));
    const r = await Promise.all(batch);
    batchResults.push(...r);
  }
  // Sıraya göre dizilim
  batchResults
    .filter((r): r is { i: number; local: string } => r !== null)
    .sort((a, b) => a.i - b.i)
    .forEach((r) => localFiles.push(r.local));

  if (localFiles.length === 0) return null;

  // 2) Build ffmpeg slideshow with crossfade + Ken Burns zoom
  const outputPath = path.join(jobDir, "output.mp4");
  const sceneDur = 4; // seconds per scene
  const xfadeDur = 0.7;

  const args: string[] = ["-y"];
  // Tek frame input (no loop) — zoompan kendi frame'lerini üretecek
  for (const f of localFiles) {
    args.push("-loop", "1", "-i", f);
  }

  // Build filter: scale + zoompan (Ken Burns) + xfade chain
  let filter = "";
  const W = 1280, H = 720;
  const totalFrames = sceneDur * 25; // 100 frames per scene
  for (let i = 0; i < localFiles.length; i++) {
    // Önce tek frame'i seç, scale, sonra zoompan ile genişlet
    filter += `[${i}:v]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},`;
    filter += `zoompan=z='min(zoom+0.0015,1.3)':d=${totalFrames}:s=${W}x${H}:fps=25,`;
    filter += `trim=duration=${sceneDur},setpts=PTS-STARTPTS,setsar=1[v${i}];`;
  }

  if (localFiles.length === 1) {
    filter += `[v0]format=yuv420p[outv]`;
  } else {
    let prev = "v0";
    for (let i = 1; i < localFiles.length; i++) {
      const off = (sceneDur - xfadeDur) * i - xfadeDur * (i - 1);
      const out = i === localFiles.length - 1 ? "outv" : `xf${i}`;
      filter += `[${prev}][v${i}]xfade=transition=fade:duration=${xfadeDur}:offset=${off.toFixed(2)}[${out}];`;
      prev = out;
    }
    filter = filter.slice(0, -1); // remove trailing ;
  }

  args.push(
    "-filter_complex", filter,
    "-map", "[outv]",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "26",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputPath
  );

  const { ok } = await runFfmpeg(args);
  if (!ok) return null;
  return jobId; // return jobId — file accessible via /api/video/file/:jobId
}

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

  const videoModels = await getBestModels("creative");
  const webContext = await getLiveWebContext(prompt);
  for (const model of videoModels) {
    try {
      const response = await openrouter.chat.completions.create({
        model,
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Bu konuda ${duration} saniyelik ${style} stil video senaryosu oluştur: "${prompt}"\n\n${webContext}` },
        ],
      });
      scriptContent = response.choices[0]?.message?.content || "";
      if (scriptContent) break;
    } catch {
      await sleep(400);
      continue;
    }
  }

  if (!scriptContent) {
    send({ error: "Script oluşturulamadı" });
    res.end();
    return;
  }

  // Parse JSON — sağlam: markdown fence + balanced brace + onarım
  let videoData: any;
  const tryParseJson = (raw: string): any => {
    // 0) Markdown fence varsa içeriğini al, yoksa ham metni kullan
    let content = raw.trim();
    const openFence = content.match(/```(?:json)?\s*\n?/);
    if (openFence) {
      content = content.slice(openFence.index! + openFence[0].length);
      const closeFence = content.indexOf("```");
      if (closeFence !== -1) content = content.slice(0, closeFence);
      content = content.trim();
    }
    // 1) Direk parse
    try { return JSON.parse(content); } catch {}
    // 2) Brace dengesi takip et
    const start = content.indexOf("{");
    if (start === -1) return null;
    let depth = 0, inStr = false, esc = false, lastValid = -1;
    for (let i = start; i < content.length; i++) {
      const c = content[i];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (c === "\\") { esc = true; continue; }
        if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) { lastValid = i; break; }
      }
    }
    if (lastValid !== -1) {
      try { return JSON.parse(content.slice(start, lastValid + 1)); } catch {}
    }
    // 3) Truncate edilmişse onar - eksik kapanışları ekle
    let repair = content.slice(start);
    // Trailing virgül temizle, eksik } ekle
    repair = repair.replace(/,\s*$/, "");
    // Açık string varsa kapat
    let openQuotes = 0;
    let escNext = false;
    for (const c of repair) {
      if (escNext) { escNext = false; continue; }
      if (c === "\\") { escNext = true; continue; }
      if (c === '"') openQuotes++;
    }
    if (openQuotes % 2 === 1) repair += '"';
    // Açık array/obje say
    let braces = 0, brackets = 0;
    let inS = false, e2 = false;
    for (const c of repair) {
      if (inS) {
        if (e2) { e2 = false; continue; }
        if (c === "\\") { e2 = true; continue; }
        if (c === '"') inS = false;
        continue;
      }
      if (c === '"') { inS = true; continue; }
      if (c === "{") braces++;
      else if (c === "}") braces--;
      else if (c === "[") brackets++;
      else if (c === "]") brackets--;
    }
    repair = repair.replace(/,\s*$/, "");
    while (brackets-- > 0) repair += "]";
    while (braces-- > 0) repair += "}";
    try { return JSON.parse(repair); } catch {}
    return null;
  };
  videoData = tryParseJson(scriptContent);

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
      `${scene.visualPrompt || scene.title}, ${style} style, cinematic, high quality, dramatic lighting, sharp focus, professional photography, 16:9 aspect ratio`
    )}?width=1344&height=768&nologo=true&private=true&model=flux-pro&seed=${Math.floor(Math.random() * 9999999)}`;

    framesWithImages.push({ ...scene, imageUrl });
    send({ step: "frame", status: "done", index: i, imageUrl, scene });

    // Rate limit önleme
    if (i < scenes.length - 1) await sleep(300);
  }

  // Sahnelerin önceden hazır olabilmesi için kısa bekleme (Pollinations cache)
  send({ step: "rendering", status: "running", message: "Sahneler MP4 videoya birleştiriliyor (ffmpeg)..." });

  // Gerçek MP4 video üret
  const jobId = `vid_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  let videoUrl: string | null = null;
  try {
    const built = await buildVideoMp4(
      framesWithImages.map((f) => ({ imageUrl: f.imageUrl, duration: f.duration || 4 })),
      jobId
    );
    if (built) {
      videoUrl = `/api/video/file/${built}`;
    }
  } catch {
    // buildVideoMp4 başarısız — video URL olmadan devam
  }

  send({
    step: "complete",
    status: "done",
    scenes: framesWithImages,
    videoData,
    videoUrl,
  });
  res.end();
});

// MP4 dosya servis endpoint'i
router.get("/file/:jobId", async (req, res) => {
  const jobId = req.params.jobId.replace(/[^a-zA-Z0-9_]/g, "");
  const filePath = path.join(VIDEO_DIR, jobId, "output.mp4");
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "Video bulunamadı" });
    return;
  }
  try {
    const buf = await readFile(filePath);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", buf.length);
    res.setHeader("Accept-Ranges", "bytes");
    res.send(buf);
  } catch {
    res.status(500).json({ error: "Video okunamadı" });
  }
});

export default router;
