---
name: Omega security boundary
description: Layered prompt-injection, untrusted-context, model-routing, and output-leak protections for the Omega AI family.
---

OMEGA uses defense in depth: the server classifies high-confidence extraction/override requests, the model prompt defines instruction precedence, untrusted history/web/file/agent output is explicitly data-only, and streamed model output is held back briefly for leak checks.

Educational questions about prompt injection and defensive practices should remain answerable. Security-sensitive requests should return a safe boundary response before provider calls. Model routing must exclude endpoints marketed as uncensored or jailbreak-oriented and prefer dynamically verified free models.

**Why:** Stronger and newer models are more capable of following both useful and malicious instructions, so prompt text alone is not a reliable security boundary.

**How to apply:** Preserve the server guard and output guard around every new model or tool route; wrap external context as untrusted data; never place provider secrets, private prompts, or hidden reasoning in user-visible output.