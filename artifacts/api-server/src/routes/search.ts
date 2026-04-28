import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

// DuckDuckGo Instant Answer API - tamamen ücretsiz, key yok
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { "User-Agent": "Mozilla/5.0 OmegaAI/1.0" } }
    );
    const data = await response.json();
    const results: SearchResult[] = [];

    // Abstract (özet)
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || "",
        snippet: data.AbstractText,
        source: data.AbstractSource || "DuckDuckGo",
      });
    }

    // İlgili konular
    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 6)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(" - ")[0] || topic.Text.slice(0, 80),
            url: topic.FirstURL,
            snippet: topic.Text,
            source: "DuckDuckGo",
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

// Wikipedia REST API yedek arama (Türkçe öncelikli)
async function searchWikipedia(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  for (const lang of ["tr", "en"]) {
    try {
      const searchRes = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=4&origin=*`
      );
      const searchData = await searchRes.json();
      const hits = searchData?.query?.search || [];
      for (const hit of hits) {
        const cleanSnippet = (hit.snippet || "").replace(/<[^>]+>/g, "");
        results.push({
          title: hit.title,
          url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, "_"))}`,
          snippet: cleanSnippet,
          source: `Wikipedia ${lang.toUpperCase()}`,
        });
      }
      if (results.length >= 4) break;
    } catch {
      continue;
    }
  }
  return results;
}

router.post("/web", async (req, res) => {
  const query = String(req.body?.query || "").trim();
  if (!query) {
    res.status(400).json({ error: "Arama sorgusu gerekli" });
    return;
  }

  const [duck, wiki] = await Promise.all([
    searchDuckDuckGo(query),
    searchWikipedia(query),
  ]);

  // Birleştir, dublikat URL'leri çıkar
  const seen = new Set<string>();
  const merged: SearchResult[] = [];
  for (const r of [...duck, ...wiki]) {
    const key = r.url || r.title;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(r);
  }

  res.json({ query, results: merged.slice(0, 10) });
});

// URL içeriğini çekip özetlemek için (özet kısa metin döner)
router.post("/fetch-url", async (req, res) => {
  const url = String(req.body?.url || "").trim();
  if (!url || !/^https?:\/\//.test(url)) {
    res.status(400).json({ error: "Geçerli URL gerekli" });
    return;
  }

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OmegaAI/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!r.ok) {
      res.status(502).json({ error: "Sayfa alınamadı", status: r.status });
      return;
    }
    const html = await r.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    res.json({
      url,
      title: titleMatch?.[1]?.trim() || url,
      text: text.slice(0, 8000),
    });
  } catch (e: any) {
    res.status(500).json({ error: "Bağlantı hatası", detail: e?.message });
  }
});

export default router;
