---
name: Image prompt preservation
description: Rules for turning short multilingual image requests into reliable generation prompts.
---

Image enhancement must lock the user's subject, action, quantity, setting, colors, and named details before adding cinematic or stylistic detail. A fast arbitrary model response is worse than a slower ordered fallback when it changes the subject.

**Why:** Short requests such as a Turkish “dragon image” can otherwise be expanded into an unrelated scene by a weak or rushed prompt model.

**How to apply:** Use the OpenRouter prompt architect before the image provider, require English-only output with subject preservation, try quality-ranked fallbacks, and keep a small translation fallback for provider/model failures.