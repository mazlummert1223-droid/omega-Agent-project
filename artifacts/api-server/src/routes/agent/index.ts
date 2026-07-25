import { Router, type IRouter } from "express";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { db } from "@workspace/db";
import { messages } from "@workspace/db";
import { AgentWebSearchBody, AgentMultiTaskBody } from "@workspace/api-zod";

const FALLBACK_MODELS = [
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "z-ai/glm-4.5-air:free",
  "inclusionai/ling-2.6-1t:free",
  "tencent/hy3-preview:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
];

const CODER_MODELS = [
  "qwen/qwen3-coder:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "tencent/hy3-preview:free",
];

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function callModel(systemPrompt: string, userPrompt: string): Promise<string> {
  for (const model of FALLBACK_MODELS) {
    try {
      const res = await openrouter.chat.completions.create({
        model,
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const c = res.choices[0]?.message?.content || "";
      if (c) return c;
    } catch {
      await sleep(400);
      continue;
    }
  }
  return "";
}

const router: IRouter = Router();

router.post("/search", async (req, res) => {
  const body = AgentWebSearchBody.parse(req.body);
  const { query, maxResults = 5 } = body;

  try {
    const content = await callModel(
      `Sen bir araştırma uzmanısın. Türkçe yanıt ver. Sadece JSON döndür (başka hiçbir metin yok):
{"results":[{"title":"başlık","url":"https://ornek.com","snippet":"açıklama"}],"summary":"özet"}`,
      `"${query}" hakkında ${maxResults} arama sonucu üret`
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
  // Accept task from body directly; conversationId optional (may be string for local sessions)
  const task: string = (req.body as any)?.task;
  const rawId = (req.body as any)?.conversationId;
  const conversationId: number | null = typeof rawId === "number" ? rawId : null;
  if (!task) { res.status(400).json({ error: "task required" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const agents = [
    {
      name: "researcher",
      label: "Araştırmacı",
      models: FALLBACK_MODELS,
      system: `Sen bir araştırma uzmanısın. Görev hakkında kapsamlı araştırma ve detaylı bilgi sunarsın. 
Sadece araştırma ve analiz perspektifinden yaklaş. Kaynak ve referanslara dikkat et. Türkçe yaz.
Cevabını "ARAŞTIRMA BULGULARI:" başlığıyla başlat.`,
    },
    {
      name: "coder",
      label: "Mühendis",
      models: CODER_MODELS,
      system: `Sen bir yazılım mühendisisin. Görev için teknik implementasyon ve kod çözümleri üretirsin.
Sadece teknik açıdan yaklaş: mimariler, algoritmalar, kod örnekleri. Türkçe açıklamalarla markdown kullan.
Cevabını "TEKNİK ANALİZ:" başlığıyla başlat.

UYGULAMA GELİŞTİRME: Eğer kullanıcı çalışan bir web uygulaması, oyun, araç, hesap makinesi veya arayüz istiyorsa:
Eksiksiz, sıfırdan çalışan tek dosya HTML kodu (CSS ve JavaScript gömülü) yaz ve şu blok içine koy:
[BUILD_APP]
<!DOCTYPE html>
<html>... tam çalışır kod ...</html>
[/BUILD_APP]
Güzel, modern, koyu tema tercih et. Tüm fonksiyonlar çalışmalı.`,
    },
    {
      name: "designer",
      label: "Stratejist",
      models: FALLBACK_MODELS,
      system: `Sen bir ürün stratejisti ve UX uzmanısın. Görev için kullanıcı deneyimi, iş değeri ve tasarım perspektifi sunarsın.
Araştırma ve teknik bulgulara eleştirel bir gözle bak, eksikleri tamamla, stratejik öneriler sun. Türkçe yaz.
Cevabını "STRATEJİK YORUM:" başlığıyla başlat.`,
    },
  ];

  const agentOutputs: Record<string, string> = {};

  // Aşama 1: Her ajan kendi uzmanlık alanından çalışır
  for (const agent of agents) {
    send({ agent: agent.name, label: agent.label, status: "running" });

    let agentContent = "";
    let streamed = false;
    for (const model of agent.models) {
      try {
        const stream = await openrouter.chat.completions.create({
          model,
          max_tokens: 3000,
          messages: [
            { role: "system", content: agent.system },
            { role: "user", content: task },
          ],
          stream: true,
        });

        for await (const chunk of stream) {
          const c = chunk.choices[0]?.delta?.content;
          if (c) {
            agentContent += c;
            send({ agent: agent.name, label: agent.label, content: c, status: "streaming" });
          }
        }

        if (agentContent) {
          streamed = true;
          break;
        }
      } catch {
        await sleep(400);
        continue;
      }
    }

    if (!streamed) {
      agentContent = "Bu ajan şu an yanıt veremiyor.";
      send({ agent: agent.name, label: agent.label, content: agentContent, status: "streaming" });
    }

    agentOutputs[agent.name] = agentContent;
    send({ agent: agent.name, label: agent.label, status: "done" });
  }

  // Aşama 2: Sentez — tüm ajanların görüşlerini birleştir
  send({ agent: "synthesis", label: "Sentez", status: "running" });

  const synthesisSystem = `Sen bir baş koordinatör yapay zekasın. Sana üç farklı uzmanın (araştırmacı, mühendis, stratejist) aynı göreve ilişkin görüşleri verildi.
Görevin:
1. Üç perspektifi eleştirel gözle değerlendir — hangi noktalarda hemfikirler, nerede çelişiyorlar?
2. Çelişkileri çözüme kavuştur ve en doğru/kullanışlı yaklaşımı seç.
3. Tüm görüşleri sentezleyerek KULLANICIYA YÖNELİK tek, tutarlı, kapsamlı bir cevap üret.
4. Cevabın doğrudan kullanışlı olsun — "şu ajan şunu söyledi" diye atıfta bulunma.
5. Türkçe, akıcı, profesyonel yaz. Markdown kullan.
6. KRİTİK: Eğer mühendis bir [BUILD_APP] ... [/BUILD_APP] kodu ürettiyse, bu bloğu aynen koru ve sentez cevabının SONUNA ekle. Kodu değiştirme, kısaltma veya özet geçme.`;

  const synthesisPrompt = `**GÖREV:** ${task}

---

**ARAŞTIRMACI GÖRÜŞܦ**
${agentOutputs["researcher"] || "Yanıt alınamadı."}

---

**MÜHENDİS GÖRÜŞܦ**
${agentOutputs["coder"] || "Yanıt alınamadı."}

---

**STRATEJİST GÖRÜŞܦ**
${agentOutputs["designer"] || "Yanıt alınamadı."}

---

Şimdi bu üç görüşü sentezleyerek kullanıcıya yönelik tek, tutarlı ve eksiksiz bir cevap üret:`;

  let synthesisContent = "";
  let synthStreamed = false;

  for (const model of FALLBACK_MODELS) {
    try {
      const stream = await openrouter.chat.completions.create({
        model,
        max_tokens: 6000,
        messages: [
          { role: "system", content: synthesisSystem },
          { role: "user", content: synthesisPrompt },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const c = chunk.choices[0]?.delta?.content;
        if (c) {
          synthesisContent += c;
          send({ agent: "synthesis", label: "Sentez", content: c, status: "streaming" });
        }
      }

      if (synthesisContent) {
        synthStreamed = true;
        break;
      }
    } catch {
      await sleep(400);
      continue;
    }
  }

  if (!synthStreamed) {
    synthesisContent = Object.values(agentOutputs).join("\n\n---\n\n");
    send({ agent: "synthesis", label: "Sentez", content: synthesisContent, status: "streaming" });
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
