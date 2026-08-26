---
name: OpenRouter model fallback
description: OpenRouter proxy model-catalog behavior and resilient model selection
---

OpenRouter'ın bu workspace proxy'sinde `models.list()` katalog döndürmeyebilir; model seçimi yalnızca bu kataloğa bağlanmamalı. Ücretsiz otomatik yönlendirme modeli (`openrouter/free`) ve güncel ücretsiz model ID'lerinden oluşan bir fallback zinciri kullanılmalı.

**Why:** Katalog isteği başarısız olsa bile sohbet akışının boş yanıtla bitmemesi ve model ID'leri değiştiğinde uygulamanın çalışmaya devam etmesi gerekir.

**How to apply:** Model kataloğunu en iyi modelleri keşfetmek için isteğe bağlı kullan; başarısızlıkta cache'le ve her görev rolü için çalışan ücretsiz fallback listesini koru. Kullanıcı hesabına beklenmeyen ücret yazmamak için ücretli modellere sessizce geçme.