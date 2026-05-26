import { Router, type IRouter } from "express";
import { openrouter } from "@workspace/integrations-openrouter-ai";

const router: IRouter = Router();

const STYLE_CONFIG: Record<string, {
  model: string;
  width: number;
  height: number;
  qualityTags: string;
}> = {
  default: {
    model: "flux-pro",
    width: 1344,
    height: 768,
    qualityTags: "highly detailed, sharp focus, professional photography, cinematic lighting, 8K resolution, masterpiece",
  },
  realistic: {
    model: "gptimage",
    width: 1344,
    height: 768,
    qualityTags: "RAW photo, photorealistic, DSLR, 50mm lens, f/1.8, golden hour, ultra sharp, 8K UHD, Nikon D850",
  },
  anime: {
    model: "flux-anime",
    width: 1024,
    height: 1024,
    qualityTags: "masterpiece, best quality, anime illustration, vibrant colors, studio ghibli inspired, sharp linework, detailed eyes",
  },
  pony: {
    model: "flux-anime",
    width: 1024,
    height: 1024,
    qualityTags: "my little pony g4 style, vector art, cute, pastel colors, magical, expressive eyes, clean lines",
  },
  "3d": {
    model: "flux-3d",
    width: 1344,
    height: 768,
    qualityTags: "3D render, Blender, Octane render, ray tracing, subsurface scattering, volumetric lighting, photorealistic, 8K",
  },
  art: {
    model: "flux-pro",
    width: 1024,
    height: 1024,
    qualityTags: "digital art, concept art, trending on ArtStation, masterpiece, dramatic lighting, intricate details, by Greg Rutkowski",
  },
  cyberpunk: {
    model: "flux-pro",
    width: 1344,
    height: 768,
    qualityTags: "cyberpunk, neon lights, Blade Runner 2049, holographic HUDs, rain-slicked streets, cinematic, atmospheric fog, moody",
  },
  fantasy: {
    model: "flux-pro",
    width: 1024,
    height: 1024,
    qualityTags: "epic fantasy art, magical atmosphere, ethereal light, intricate details, by Artgerm and Greg Rutkowski, 4K",
  },
  portrait: {
    model: "gptimage",
    width: 768,
    height: 1024,
    qualityTags: "portrait photography, bokeh background, studio lighting, 85mm lens, sharp eyes, professional headshot, cinematic",
  },
};

const ENHANCE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "google/gemma-4-31b-it:free",
  "z-ai/glm-4.5-air:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

const ENHANCE_SYSTEM = `You are an expert AI image prompt engineer for FLUX Pro and DALL-E 3.
Your task: take the user's description and return a SINGLE rich, detailed English image generation prompt.
Rules:
- Output ONLY the enhanced prompt text. No quotes, no explanations, no intro text.
- Maximum 150 words.
- Add visual details: lighting, composition, colors, textures, mood, camera/lens info where appropriate.
- If input is not in English, translate and enhance to English.
- Do NOT include NSFW content.`;

// Try all models in parallel, take the fastest valid response
async function enhancePromptParallel(rawPrompt: string, styleHint: string): Promise<string> {
  const userMsg = `User description: "${rawPrompt}"${styleHint ? ` Style: ${styleHint}.` : ""}\n\nEnhanced English image prompt:`;

  const tryModel = async (model: string): Promise<string> => {
    const resp = await openrouter.chat.completions.create({
      model,
      messages: [
        { role: "system", content: ENHANCE_SYSTEM },
        { role: "user", content: userMsg },
      ],
      max_tokens: 200,
      temperature: 0.75,
    });
    const text = resp.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text || text.length < 20) throw new Error("empty");
    return text;
  };

  // Race all models with a shared 9-second timeout
  try {
    const result = await Promise.any(
      ENHANCE_MODELS.map(m => tryModel(m))
    );
    return result;
  } catch {
    return rawPrompt; // All failed or timed out — use original
  }
}

router.post("/generate-image", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  const style = String(req.body?.style || "default");

  if (!prompt) {
    res.status(400).json({ error: "Prompt gerekli" });
    return;
  }

  const config = STYLE_CONFIG[style] ?? STYLE_CONFIG.default;

  // Run LLM enhancement with a hard timeout
  const timeout = new Promise<string>((resolve) =>
    setTimeout(() => resolve(prompt), 9000)
  );

  const enhanced = await Promise.race([
    enhancePromptParallel(prompt, style !== "default" ? style : ""),
    timeout,
  ]);

  // Append quality tags if LLM returned original (no enhancement happened)
  const finalPrompt = enhanced === prompt
    ? `${prompt}, ${config.qualityTags}`
    : `${enhanced}, ${config.qualityTags}`;

  const seed = Math.floor(Math.random() * 9999999);
  const imageUrl = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}`,
    `?width=${config.width}`,
    `&height=${config.height}`,
    `&model=${config.model}`,
    `&seed=${seed}`,
    `&nologo=true`,
    `&private=true`,
  ].join("");

  res.json({ url: imageUrl, model: config.model, style });
});

export default router;
