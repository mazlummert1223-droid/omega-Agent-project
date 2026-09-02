import { Router, type IRouter } from "express";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { db } from "@workspace/db";
import { messages } from "@workspace/db";
import { getBestModels } from "../../lib/ai-models";
import { getLiveWebContext } from "../../lib/live-web";
import { OMEGA_IDENTITY_PROMPT, getModeIdentity } from "../../lib/omega-identity";

/* ─── Model lists — each agent starts with DIFFERENT primary models
   to avoid rate-limit collisions when running in parallel ─── */
const RESEARCHER_MODELS = [
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "inclusionai/ling-2.6-1t:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "z-ai/glm-4.5-air:free",
  "google/gemma-4-26b-a4b-it:free",
  "tencent/hy3-preview:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
];

const ENGINEER_MODELS = [
  "qwen/qwen3-coder:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "google/gemma-4-26b-a4b-it:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "z-ai/glm-4.5-air:free",
  "inclusionai/ling-2.6-flash:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "tencent/hy3-preview:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
];

const STRATEGIST_MODELS = [
  "google/gemma-4-31b-it:free",
  "inclusionai/ling-2.6-1t:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "z-ai/glm-4.5-air:free",
  "google/gemma-4-26b-a4b-it:free",
  "tencent/hy3-preview:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
];

const SYNTHESIS_MODELS = [
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "z-ai/glm-4.5-air:free",
  "inclusionai/ling-2.6-1t:free",
  "tencent/hy3-preview:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
];

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

type ConversationTurn = { role: "user" | "assistant"; content: string };

function buildProjectContext(rawHistory: unknown, currentTask: string): string {
  if (!Array.isArray(rawHistory)) return "";
  const history = rawHistory
    .filter((turn): turn is ConversationTurn =>
      Boolean(turn && typeof turn === "object" &&
        ((turn as any).role === "user" || (turn as any).role === "assistant") &&
        typeof (turn as any).content === "string"),
    )
    .map(turn => ({ role: turn.role, content: turn.content.trim() }))
    .filter(turn => turn.content);

  // The client includes the current task in history. Keep the original user
  // brief plus recent turns so multi-step projects retain their requirements
  // without growing the prompt forever.
  const previous = history.length && history[history.length - 1].role === "user" &&
    history[history.length - 1].content === currentTask.trim()
    ? history.slice(0, -1)
    : history;
  if (!previous.length) return "";

  const firstUser = previous.find(turn => turn.role === "user");
  const recent = previous.slice(-10);
  const selected = firstUser && !recent.includes(firstUser) ? [firstUser, ...recent] : recent;
  const text = selected.map(turn => {
    const limit = turn.content.startsWith("__APP__") ? 24000 : 6000;
    return `${turn.role === "user" ? "KULLANICI" : "OMEGA"}:\n${turn.content.slice(0, limit)}`;
  }).join("\n\n");
  return `ÖNCEKİ PROJE VE KONUŞMA BAĞLAMI:
${text.slice(-50000)}

Bu bağlamdaki açık gereksinimleri, kararları ve üretilen kodu koru. Kullanıcı açıkça sıfırdan başlamanı istemedikçe önceki çalışmayı silme veya yeniden başlatma.`;
}

/* ─── Stream one agent — returns full accumulated content ─── */
async function runAgent(
  models: string[],
  systemPrompt: string,
  userTask: string,
  onChunk: (text: string) => void
): Promise<string> {
  let content = "";
  for (const model of models) {
    try {
      const stream = await openrouter.chat.completions.create({
        model,
        max_tokens: 6000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userTask },
        ],
        stream: true,
      });
      for await (const chunk of stream) {
        const c = chunk.choices[0]?.delta?.content;
        if (c) { content += c; onChunk(c); }
      }
      if (content.trim().length > 30) return content;
      content = "";          // too short — retry next model
    } catch {
      await sleep(600);
    }
  }
  return content || "Yanıt üretilemedi.";
}

const router: IRouter = Router();

router.post("/search", async (req, res) => {
  const { query, maxResults = 5 } = req.body as { query: string; maxResults?: number };
  try {
    const content = await runAgent(
      await getBestModels("researcher"),
      `Sen bir araştırma uzmanısın. Sadece JSON döndür (başka hiçbir metin yok):
{"results":[{"title":"başlık","url":"https://ornek.com","snippet":"açıklama"}],"summary":"özet"}`,
      `"${query}" hakkında ${maxResults} arama sonucu üret`,
      () => {}
    );
    try {
      const m = content.match(/\{[\s\S]*\}/);
      res.json(m ? JSON.parse(m[0]) : { results: [], summary: content });
    } catch {
      res.json({ results: [{ title: query, url: "#", snippet: content.slice(0, 300) }], summary: content });
    }
  } catch {
    res.status(500).json({ results: [], summary: "Arama yapılamadı" });
  }
});

router.post("/multi-task", async (req, res) => {
  const task: string = (req.body as any)?.task;
  const rawId = (req.body as any)?.conversationId;
  const conversationId: number | null = typeof rawId === "number" ? rawId : null;
  if (!task) { res.status(400).json({ error: "task required" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };
  send({ agent: "web", label: "Canlı İnternet", status: "running" });
  const webContext = await getLiveWebContext(task);
  const projectContext = buildProjectContext((req.body as any)?.history, task);
  const taskWithContext = `${projectContext ? `${projectContext}\n\n` : ""}AKTİF KULLANICI İSTEĞİ:\n${task}`;
  send({ agent: "web", label: "Canlı İnternet", status: "done" });

  /* ── Agent definitions ── */
  const RESEARCHER_SYSTEM = `${OMEGA_IDENTITY_PROMPT}
${getModeIdentity("agent")}
Sen Omega AI Araştırmacı Ajanısın. Türkçe yazarsın.
Görevin: Verilen konu hakkında kapsamlı araştırma ve analiz yap. Güncel bilgiler, farklı perspektifler, tarihsel bağlam sun.

ÖZEL YETENEKLERİN:
- Kullanıcı görsel istiyorsa: [GENERATE_IMAGE: detaylı ingilizce prompt] yaz
- Video istiyorsa: [GENERATE_VIDEO: ingilizce video açıklaması] yaz
- Grafik/chart istiyorsa mühendise belirt

Cevabını "## 🔬 ARAŞTIRMA BULGULARI" başlığıyla başlat. Markdown kullan.`;

  const ENGINEER_SYSTEM = `${OMEGA_IDENTITY_PROMPT}
${getModeIdentity("agent")}
Sen Omega AI Mühendis Ajanısın. Türkçe yazarsın.
Görevin: Teknik implementasyon, kod ve uygulamalar üret.

ÖZEL YETENEKLERİN — BUNLARI AKTİF KULLAN:
  1. WEB UYGULAMASI/OYUN/ARAÇ: Eksiksiz, kendi kendine çalışan tek dosya HTML (CSS+JS gömülü) şu blok içine:
   [BUILD_APP]
   <!DOCTYPE html>
   <html lang="tr">
   ... tam çalışır kod (modern koyu tema, responsive düzen, erişilebilir kontroller, gerçek etkileşimler) ...
   </html>
   [/BUILD_APP]
   Büyük projelerde bile tüm ekranları ve ana akışları tek dosyada uygula. Hiçbir buton
   placeholder olarak kalmasın: form doğrulama, filtreler, modal/sekme geçişleri,
   localStorage ile demo kalıcılığı ve hata/boş durumlarını ekle. Harici CDN kullanacaksan
   uygulama CDN olmadan da açılmalı veya yüklenememe durumunu görünür şekilde ele almalı.

2. GRAFİK/CHART: Chart.js CDN kullanan interaktif grafik HTML'i de BUILD_APP ile ver.
   Örnek CDN: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

3. ANİMASYONLU ARAYÜZ: Three.js, GSAP, CSS animations kullanabilirsin.
   Three.js CDN: <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

4. GÖRSEL ÜRETME: [GENERATE_IMAGE: ingilizce prompt] ile illüstrasyon/diyagram iste.

5. TAM WEB SİTESİ: Tam sayfalı responsive HTML/CSS site üret.

Cevabını "## ⚙️ TEKNİK ÇÖZÜM" başlığıyla başlat. Build edilen uygulama varsa BUILD_APP sonraya ekle.`;

  const STRATEGIST_SYSTEM = `${OMEGA_IDENTITY_PROMPT}
${getModeIdentity("agent")}
Sen Omega AI Stratejist Ajanısın. Türkçe yazarsın.
Görevin: UX, ürün stratejisi ve iş değeri perspektifinden yorum yap. Araştırma ve teknik çözümleri eleştirel gözle değerlendir.

ÖZEL YETENEKLERİN:
- Görsel konsept için: [GENERATE_IMAGE: ingilizce tasarım konsepti] yaz
- Animasyonlu demo için mühendise öneri ver

Cevabını "## 🎯 STRATEJİK YORUM" başlığıyla başlat. Markdown kullan.`;

  /* ── Run all 3 agents IN PARALLEL ── */
  const agentOutputs: Record<string, string> = {};

  const agentDefs = [
    { name: "researcher", label: "Araştırmacı", role: "researcher", system: RESEARCHER_SYSTEM },
    { name: "coder",      label: "Mühendis",    role: "coder",      system: ENGINEER_SYSTEM   },
    { name: "designer",   label: "Stratejist",  role: "creative",   system: STRATEGIST_SYSTEM  },
  ];

  // Signal all agents are starting
  for (const ag of agentDefs) {
    send({ agent: ag.name, label: ag.label, status: "running" });
  }

  await Promise.all(agentDefs.map(async (ag) => {
    const content = await runAgent(
      await getBestModels(ag.role),
      ag.system,
      `${taskWithContext}\n\n${webContext}`,
      (chunk) => send({ agent: ag.name, label: ag.label, content: chunk, status: "streaming" })
    );
    agentOutputs[ag.name] = content;
    send({ agent: ag.name, label: ag.label, status: "done" });
  }));

  /* ── Synthesis — combine all outputs ── */
  send({ agent: "synthesis", label: "Sentez", status: "running" });

  // Extract any BUILD_APP from engineer output to preserve in synthesis
  const buildAppMatch = agentOutputs["coder"]?.match(/\[BUILD_APP\]([\s\S]*?)\[\/BUILD_APP\]/i);
  const buildAppBlock = buildAppMatch ? buildAppMatch[0] : "";
  const coderWithoutApp = buildAppMatch
    ? agentOutputs["coder"]?.replace(buildAppMatch[0], "[Uygulama kodu ayrıca eklenmiştir]")
    : agentOutputs["coder"];

  const synthesisSystem = `${OMEGA_IDENTITY_PROMPT}
${getModeIdentity("agent")}
Sen Omega AI Baş Koordinatörüsün. Üç uzman ajanın (araştırmacı, mühendis, stratejist) çıktılarını tek, tutarlı, eksiksiz bir yanıtta birleştirirsin.

Kurallar:
1. Üç perspektifi bütünleştir — çelişkileri çöz, hemfikir olunan noktaları vurgula.
2. KULLANICIYA DOĞRUDAN hitap et, "şu ajan şunu söyledi" gibi atıflardan kaçın.
3. Türkçe, akıcı, profesyonel. Markdown kullan.
4. [GENERATE_IMAGE:] veya [GENERATE_VIDEO:] marker'larını araştırmacı/stratejistten miras al.
5. KRİTİK: Eğer mühendis bir [BUILD_APP] bloğu ürettiyse, sentez yanıtının SONUNA ekle.
6. Eğer kullanıcı görsel istiyorsa sen de [GENERATE_IMAGE: prompt] ekle.`;

  const synthesisPrompt = `${projectContext ? `${projectContext}\n\n` : ""}GÖREV: ${task}

ARAŞTIRMACI:
${agentOutputs["researcher"] || "Yanıt alınamadı."}

MÜHENDİS:
${coderWithoutApp || "Yanıt alınamadı."}

STRATEJİST:
${agentOutputs["designer"] || "Yanıt alınamadı."}

---
Şimdi bu üç görüşü sentezle ve kullanıcıya yönelik kapsamlı, doğrudan kullanışlı bir yanıt üret:`;

  let synthesisContent = "";
  try {
    synthesisContent = await runAgent(
      await getBestModels("synthesis"),
      synthesisSystem,
      `${synthesisPrompt}\n\n${webContext}`,
      (chunk) => send({ agent: "synthesis", label: "Sentez", content: chunk, status: "streaming" })
    );
  } catch {
    synthesisContent = Object.values(agentOutputs).join("\n\n---\n\n");
    send({ agent: "synthesis", label: "Sentez", content: synthesisContent, status: "streaming" });
  }

  // Append BUILD_APP block after synthesis text if engineer produced one
  if (buildAppBlock) {
    const sep = "\n\n" + buildAppBlock;
    send({ agent: "synthesis", label: "Sentez", content: sep, status: "streaming" });
    synthesisContent += sep;
  }

  send({ agent: "synthesis", label: "Sentez", status: "done" });

  if (conversationId) {
    try {
      await db.insert(messages).values([
        { conversationId, role: "user", content: task },
        { conversationId, role: "assistant", content: synthesisContent },
      ]);
    } catch {}
  }

  send({ done: true });
  res.end();
});

export default router;
