import { Router, type IRouter } from "express";
import https from "https";
import http from "http";
import { GenerateOpenaiImageBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/generate-image", async (req, res) => {
  const body = GenerateOpenaiImageBody.parse(req.body);
  const prompt = encodeURIComponent(body.prompt);

  try {
    const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true`;

    const imageBuffer = await fetchImageAsBuffer(imageUrl);
    const b64 = imageBuffer.toString("base64");

    res.json({ b64_json: b64 });
  } catch (err) {
    res.status(500).json({ error: "Görsel üretilemedi" });
  }
});

function fetchImageAsBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    }).on("error", reject);
  });
}

export default router;
