import { openrouter } from "@workspace/integrations-openrouter-ai";

/**
 * OpenRouter model IDs change over time. These are the current high-capability
 * free models we prefer, while getBestModels also consults the live catalog.
 * Keeping free-only fallbacks avoids unexpectedly charging a user's account.
 */
const CURATED_MODELS = [
  // Newly released free endpoints, kept before the generic router when they
  // are available in the user's OpenRouter account.
  "z-ai/glm-5.3-flash:free",
  "z-ai/glm-5.2:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "moonshotai/kimi-k2.6:free",
  "moonshotai/kimi-k2.7-code-20260612:free",
  "openai/gpt-oss-120b:free",
  "qwen/qwen3-235b-a22b:free",
  "moonshotai/kimi-k2:free",
  "deepseek/deepseek-r1-0528:free",
  "meta-llama/llama-4-maverick:free",
  "qwen/qwen3-coder:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "z-ai/glm-4.5-air:free",
  "inclusionai/ling-2.6-1t:free",
  "tencent/hy3-preview:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

const VISION_FALLBACK_MODELS = [
  "google/gemma-3-27b-it:free",
  "qwen/qwen2.5-vl-72b-instruct:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
];

const FALLBACK_MODELS = [
  // Keep the provider-managed free router first when the catalog endpoint is
  // unavailable. It selects a currently live free model without guessing an
  // obsolete model ID.
  "openrouter/free",
  ...CURATED_MODELS,
  "liquid/lfm-2.5-1.2b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
];

type CatalogModel = {
  id?: string;
  created?: number;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
};

let catalogCache: { expiresAt: number; models: CatalogModel[] } | null = null;

function isFree(model: CatalogModel): boolean {
  const id = model.id ?? "";
  const prompt = Number(model.pricing?.prompt ?? NaN);
  const completion = Number(model.pricing?.completion ?? NaN);
  return id.endsWith(":free") || (Number.isFinite(prompt) && prompt === 0 && completion === 0);
}

function qualityScore(id: string, role: string): number {
  const name = id.toLowerCase();
  let score = 0;

  // Role-specific preference: the first successful model is both capable and
  // suited to the task, while the rest remain automatic fallbacks.
  if (role === "coder" && name.includes("qwen3-coder")) score += 120;
  if (role === "vision" && (name.includes("gemma-3") || name.includes("qwen"))) score += 80;
  if (role === "researcher" && (name.includes("deepseek-r1") || name.includes("kimi"))) score += 80;
  if (role === "creative" && (name.includes("kimi") || name.includes("llama-4"))) score += 60;

  if (name.includes("glm-5.3")) score += 130;
  if (name.includes("glm-5.2")) score += 125;
  if (name.includes("nemotron-3-ultra")) score += 120;
  if (name.includes("kimi-k3")) score += 120;
  if (name.includes("gpt-oss-120b")) score += 115;
  if (name.includes("qwen3-235b")) score += 112;
  if (name.includes("kimi-k2")) score += 110;
  if (name.includes("deepseek-r1")) score += 108;
  if (name.includes("llama-4-maverick")) score += 105;
  if (name.includes("qwen3-coder")) score += 104;
  if (name.includes("405b")) score += 100;
  if (name.includes("80b")) score += 90;
  if (name.includes("70b")) score += 82;
  if (name.includes("31b") || name.includes("27b")) score += 68;
  if (name.includes("3b") || name.includes("1.2b")) score -= 30;
  return score;
}

async function getCatalog(): Promise<CatalogModel[]> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache.models;

  try {
    const response = await openrouter.models.list();
    const models = Array.isArray((response as any)?.data) ? (response as any).data : [];
    catalogCache = { models, expiresAt: Date.now() + 10 * 60 * 1000 };
    return models;
  } catch {
    // Model selection must not make chat unavailable if the catalog endpoint
    // is temporarily down.
    catalogCache = { models: [], expiresAt: Date.now() + 60 * 1000 };
    return [];
  }
}

export async function getBestModels(role = "general"): Promise<string[]> {
  const catalog = await getCatalog();
  const available = new Set(
    catalog.filter(isFree).map(model => model.id).filter((id): id is string => Boolean(id)),
  );

  const curatedAvailable = CURATED_MODELS.filter(id => available.has(id));
  const discovered = catalog
    .filter(model => isFree(model) && typeof model.id === "string")
    .filter(model => (model.context_length ?? 0) >= 16_000)
    .sort((a, b) => {
      const scoreDelta = qualityScore(b.id!, role) - qualityScore(a.id!, role);
      if (scoreDelta !== 0) return scoreDelta;
      return (b.created ?? 0) - (a.created ?? 0);
    })
    .map(model => model.id as string);

  const roleFallbacks = role === "vision" ? VISION_FALLBACK_MODELS : [];
  const result = [...new Set([...roleFallbacks, ...curatedAvailable, ...discovered, ...FALLBACK_MODELS])];
  const selected = result.slice(0, 18);
  return selected;
}

export function invalidateModelCatalog(): void {
  catalogCache = null;
}