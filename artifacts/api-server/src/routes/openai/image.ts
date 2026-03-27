import { Router, type IRouter } from "express";
import { GenerateOpenaiImageBody } from "@workspace/api-zod";

const router: IRouter = Router();

// Pollinations.AI - tamamen ücretsiz, pony/anime dahil tüm stiller
const STYLE_MODELS: Record<string, string> = {
  default: "flux",
  anime: "flux-anime",
  pony: "flux-anime",  // Pony stili için anime modeli
  realistic: "flux-realism",
  art: "flux",
  "3d": "flux-3d",
};

router.post("/generate-image", async (req, res) => {
  const body = GenerateOpenaiImageBody.parse(req.body);
  const prompt = body.prompt;
  const style = (body as any).style || "default";
  const model = STYLE_MODELS[style] || "flux";

  // Pollinations URL'ini doğrudan döndür (base64 yerine URL kullan - hızlı ve verimli)
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=${model}&seed=${Math.floor(Math.random() * 999999)}`;

  res.json({ url: imageUrl, model });
});

export default router;
