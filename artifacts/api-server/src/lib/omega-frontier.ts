import { openai } from "@workspace/integrations-openai-ai-server";
import { createSecureOutputGuard } from "./omega-guard";

export const FRONTIER_MODEL = "gpt-6-astra";

type FrontierMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Try the configured frontier endpoint without making it a single point of
 * failure. An empty string means the caller should continue with its normal
 * model fallback list.
 */
export async function callFrontier(
  messages: FrontierMessage[],
  onChunk: (content: string) => void,
  maxTokens = 8192,
): Promise<string> {
  let full = "";
  const outputGuard = createSecureOutputGuard();

  try {
    const stream = await openai.chat.completions.create({
      model: FRONTIER_MODEL,
      max_completion_tokens: maxTokens,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (!content) continue;
      const safeChunk = outputGuard.push(content);
      if (safeChunk) {
        full += safeChunk;
        onChunk(safeChunk);
      }
    }

    const safeTail = outputGuard.finish();
    if (safeTail) {
      full += safeTail;
      onChunk(safeTail);
    }

    if (outputGuard.blocked) {
      return full || "Yanıt güvenlik nedeniyle sınırlandırıldı.";
    }
    return full;
  } catch {
    // The caller owns the fallback policy. Do not expose provider details to
    // the user or leave the SSE stream hanging when this model is unavailable.
    return full;
  }
}