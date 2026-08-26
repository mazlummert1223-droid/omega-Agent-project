type WebResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
};

const timeout = (ms: number) => AbortSignal.timeout(ms);

async function duckDuckGo(query: string): Promise<WebResult[]> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: timeout(8000), headers: { "User-Agent": "OmegaAI/2.0" } },
    );
    if (!response.ok) return [];
    const data = await response.json() as any;
    const results: WebResult[] = [];
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || "",
        snippet: data.AbstractText,
        source: data.AbstractSource || "DuckDuckGo",
      });
    }
    for (const topic of Array.isArray(data.RelatedTopics) ? data.RelatedTopics : []) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(" - ")[0] || topic.Text.slice(0, 100),
          url: topic.FirstURL,
          snippet: topic.Text,
          source: "DuckDuckGo",
        });
      }
      if (results.length >= 6) break;
    }
    return results;
  } catch {
    return [];
  }
}

async function wikipedia(query: string): Promise<WebResult[]> {
  try {
    const response = await fetch(
      `https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=5&origin=*`,
      { signal: timeout(8000), headers: { "User-Agent": "OmegaAI/2.0" } },
    );
    if (!response.ok) return [];
    const data = await response.json() as any;
    return (data?.query?.search ?? []).slice(0, 5).map((hit: any) => ({
      title: hit.title,
      url: `https://tr.wikipedia.org/wiki/${encodeURIComponent(String(hit.title).replace(/ /g, "_"))}`,
      snippet: String(hit.snippet || "").replace(/<[^>]+>/g, ""),
      source: "Wikipedia TR",
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches current public web results before every AI answer. The model is
 * explicitly told that this is live evidence and must cite URLs when useful.
 */
export async function getLiveWebContext(query: string): Promise<string> {
  if (!query.trim()) return "";
  const [duck, wiki] = await Promise.all([duckDuckGo(query), wikipedia(query)]);
  const seen = new Set<string>();
  const merged = [...duck, ...wiki].filter(result => {
    const key = result.url || result.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);

  if (!merged.length) {
    return "\n\nCANLI WEB ARAMASI: Sonuç alınamadı; güncel bilgi iddiasında bulunma.";
  }

  return `\n\nCANLI WEB ARAMA SONUÇLARI (${new Date().toISOString()}):\n${
    merged.map((result, index) =>
      `${index + 1}. ${result.title}\n   ${result.snippet}\n   Kaynak: ${result.url} (${result.source})`
    ).join("\n\n")
  }\n\nBu canlı kaynakları kullan. Güncel veya doğrulanabilir bir iddia verdiğinde ilgili URL'yi yanıtında belirt; kaynaklar yetersizse bunu açıkça söyle.`;
}