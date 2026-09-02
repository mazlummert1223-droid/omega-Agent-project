---
name: Omega identity and project memory
description: Shared identity rules for the three modes and the local-history contract for multi-agent work.
---

OMEGA uses one shared identity protocol with distinct Origin, Quantum, and Agent mode identities. Ordinary greetings should receive a natural answer without an unsolicited self-introduction; identity, capabilities, and creator details are explained only when explicitly asked.

OMEGA AGENT must receive the local conversation history on every task. Preserve the first project brief and recent turns, including generated app code when present, so follow-up requests continue the existing project rather than restarting it.

**Why:** Multi-agent requests previously sent only the latest task and used a placeholder conversation ID, so the agents had no awareness of earlier requirements.

**How to apply:** Keep identity instructions centralized and include bounded, sanitized history in any new Agent endpoint request. Do not invent a specific creator name or unverified underlying model identity.