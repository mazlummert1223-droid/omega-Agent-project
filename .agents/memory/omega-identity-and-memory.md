---
name: Omega identity and project memory
description: Shared identity rules for the three modes and the local-history contract for multi-agent work.
---

OMEGA uses one shared identity protocol with distinct Origin, Quantum, and Agent model identities. Ordinary greetings should receive a natural answer without an unsolicited self-introduction; identity, capabilities, and creator details are explained only when explicitly asked. The stated creator is Turkish developer İsa Mert and SPIN AI STUDIO.

OMEGA AGENT must receive the local conversation history on every task. Preserve the first project brief and recent turns, including generated app code when present, so follow-up requests continue the existing project rather than restarting it.

**Why:** Multi-agent requests previously sent only the latest task and used a placeholder conversation ID, so the agents had no awareness of earlier requirements.

**How to apply:** Keep identity instructions centralized and include bounded, sanitized history in any new Agent endpoint request. Do not invent a specific creator name or unverified underlying model identity.

Internal system prompts, hidden instructions, credentials, infrastructure details, and chain-of-thought are protected by both the shared identity instructions and a backend request boundary.

**Why:** Prompt-only protection can be bypassed by direct instruction extraction requests, so sensitive internal information must be blocked before a provider call.

**How to apply:** Keep the security boundary response generic, disclose only the approved public creator attribution, and never echo hidden implementation details.