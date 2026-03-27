import { Router, type IRouter } from "express";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { GenerateOpenaiImageBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/generate-image", async (req, res) => {
  const body = GenerateOpenaiImageBody.parse(req.body);
  const size = (body.size || "1024x1024") as "1024x1024" | "512x512" | "256x256";

  try {
    const buffer = await generateImageBuffer(body.prompt, size);
    res.json({ b64_json: buffer.toString("base64") });
  } catch (err) {
    res.status(500).json({ error: "Görsel üretilemedi" });
  }
});

export default router;
