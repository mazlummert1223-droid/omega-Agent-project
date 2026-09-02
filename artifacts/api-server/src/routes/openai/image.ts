import { Router, type IRouter } from "express";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { getBestModels } from "../../lib/ai-models";

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

const ENHANCE_SYSTEM = `You are Omega Vision Prompt Architect, a precise image-prompt specialist for FLUX.
Transform the user's image request into ONE rich, detailed English prompt while preserving the user's exact intent.
Follow these rules strictly:
- Identify and LOCK the main subject, action, quantity, setting, and requested style before writing.
- The main subject must remain the same. Never substitute it with another animal, person, object, scene, or concept.
- If the user gives only a short subject such as "a dragon image", expand that subject into a clear scene but keep "dragon" as the dominant subject.
- Translate Turkish to natural English. Preserve named entities, colors, numbers, relationships, and unusual details.
- Add only helpful visual details: composition, camera angle, lighting, palette, materials, atmosphere, depth, and quality.
- Do not invent a different story, brand, character, or location. Do not add text, logos, or watermark unless requested.
- Output ONLY one English prompt, with no quotes, labels, explanations, bullet points, or markdown.
- Maximum 180 words. Do not include NSFW content.`;

const FALLBACK_TRANSLATIONS: Record<string, string> = {
  ejderha: "dragon", ejderhayı: "dragon", ejderhanın: "dragon",
  kedi: "cat", kediyi: "cat", köpek: "dog", köpeği: "dog",
  kadın: "woman", erkek: "man", çocuk: "child", kız: "girl",
  şehir: "city", orman: "forest", uzay: "space", robot: "robot",
  araba: "car", ev: "house", deniz: "sea", dağ: "mountain",
  güneş: "sun", ay: "moon", şövalye: "knight", prenses: "princess",
  çiçek: "flower", kuş: "bird", kurt: "wolf", aslan: "lion",
};

function fallbackEnglishPrompt(rawPrompt: string): string {
  let translated = rawPrompt;
  for (const [turkish, english] of Object.entries(FALLBACK_TRANSLATIONS)) {
    translated = translated.replace(new RegExp(`\\b${turkish}\\b`, "gi"), english);
  }
  return `${translated}, clearly centered on the requested subject, coherent scene, detailed composition, natural lighting, rich colors, realistic textures, high quality`;
}

// Try all models in parallel, take the fastest valid response
async function enhancePromptParallel(rawPrompt: string, styleHint: string): Promise<string> {
  const userMsg = `USER IMAGE REQUEST (preserve the subject exactly):
<request>${rawPrompt}</request>
${styleHint ? `<requested_style>${styleHint}</requested_style>` : ""}

Return one enhanced English image prompt only:`;

  const tryModel = async (model: string): Promise<string> => {
    const resp = await openrouter.chat.completions.create({
      model,
      messages: [
        { role: "system", content: ENHANCE_SYSTEM },
        { role: "user", content: userMsg },
      ],
        max_tokens: 280,
        temperature: 0.35,
    });
    const text = resp.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text || text.length < 20) throw new Error("empty");
    return text;
  };

  // Try models in quality order. Promise.any used to accept the fastest
  // response, which often came from a weaker model and changed the subject.
  const enhanceModels = await getBestModels("creative");
  for (const model of enhanceModels.slice(0, 6)) {
    try {
      return await Promise.race([
        tryModel(model),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timeout")), 7000)),
      ]);
    } catch {
      continue;
    }
  }
  return fallbackEnglishPrompt(rawPrompt);
}

router.post("/generate-image", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  const style = String(req.body?.style || "default");

  if (!prompt) {
    res.status(400).json({ error: "Prompt gerekli" });
    return;
  }

  const config = STYLE_CONFIG[style] ?? STYLE_CONFIG.default;

  const enhanced = await enhancePromptParallel(prompt, style !== "default" ? style : "");

  const finalPrompt = `${enhanced}, ${config.qualityTags}`;

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

  res.json({ url: imageUrl, model: config.model, style, enhancedPrompt: finalPrompt });
});

export default router;
