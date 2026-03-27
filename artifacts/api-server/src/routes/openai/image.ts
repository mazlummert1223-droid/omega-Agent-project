import { Router, type IRouter } from "express";
import https from "https";
import http from "http";
import { GenerateOpenaiImageBody } from "@workspace/api-zod";

const router: IRouter = Router();

// Tamamen ücretsiz görsel üretim servisleri (API anahtarı yok)
const IMAGE_PROVIDERS = [
  // Pollinations.AI — ücretsiz, güçlü, Stable Diffusion tabanlı
  (prompt: string) => `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux`,
  // Yedek: farklı model
  (prompt: string) => `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=turbo`,
];

router.post("/generate-image", async (req, res) => {
  const body = GenerateOpenaiImageBody.parse(req.body);
  const prompt = body.prompt;

  for (const providerFn of IMAGE_PROVIDERS) {
    try {
      const imageUrl = providerFn(prompt);
      const imageBuffer = await fetchImageAsBuffer(imageUrl);

      if (imageBuffer.length > 1000) {
        const b64 = imageBuffer.toString("base64");
        res.json({ b64_json: b64 });
        return;
      }
    } catch {
      continue;
    }
  }

  res.status(500).json({ error: "Görsel üretilemedi, tekrar dene" });
});

function fetchImageAsBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const request = client.get(url, { timeout: 30000 }, (response) => {
      // Yönlendirmeleri takip et
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          fetchImageAsBuffer(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy();
      reject(new Error("Timeout"));
    });
  });
}

export default router;
