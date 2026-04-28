import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Pollinations.AI - tamamen ücretsiz, prompt zenginleştirme ile her stilde kaliteli sonuç
const STYLE_CONFIG: Record<string, { model: string; prefix: string; suffix: string }> = {
  default: {
    model: "flux",
    prefix: "",
    suffix: ", high quality, detailed, sharp focus, professional photography, 8k",
  },
  realistic: {
    model: "flux-realism",
    prefix: "photorealistic, ",
    suffix: ", ultra realistic, detailed skin, professional photography, dslr, 8k uhd, sharp focus, dramatic lighting",
  },
  anime: {
    model: "flux-anime",
    prefix: "anime style, ",
    suffix: ", manga, cel shaded, vibrant colors, studio ghibli inspired, sharp lines, detailed eyes",
  },
  pony: {
    model: "flux-anime",
    prefix: "pony art style, my little pony, ",
    suffix: ", cute, colorful, cartoon, vibrant pastel colors, magical, fluffy, expressive eyes",
  },
  "3d": {
    model: "flux-3d",
    prefix: "3d render, ",
    suffix: ", octane render, unreal engine 5, blender, ray tracing, volumetric lighting, hyperdetailed",
  },
  art: {
    model: "flux",
    prefix: "digital art, ",
    suffix: ", concept art, trending on artstation, masterpiece, beautiful composition, dramatic lighting",
  },
  cyberpunk: {
    model: "flux",
    prefix: "cyberpunk, neon lights, ",
    suffix: ", futuristic city, blade runner aesthetic, holographic, rain, cinematic, moody atmosphere",
  },
  fantasy: {
    model: "flux",
    prefix: "fantasy art, ",
    suffix: ", magical, ethereal, mystical, dramatic lighting, epic composition, intricate details",
  },
};

router.post("/generate-image", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  const style = String(req.body?.style || "default");
  if (!prompt) {
    res.status(400).json({ error: "Prompt gerekli" });
    return;
  }
  const config = STYLE_CONFIG[style] || STYLE_CONFIG.default;

  const enhancedPrompt = `${config.prefix}${prompt}${config.suffix}`;
  const seed = Math.floor(Math.random() * 999999);

  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&enhance=true&model=${config.model}&seed=${seed}`;

  res.json({ url: imageUrl, model: config.model, style });
});

export default router;
