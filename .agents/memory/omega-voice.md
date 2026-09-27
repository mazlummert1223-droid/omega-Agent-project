---
name: Omega voice interaction
description: The approved voice UX and voice-safety boundary for Turkish conversations.
---

OMEGA voice mode is opt-in: the user enables AI voice output, taps the microphone to record, and the recorded turn is transcribed by the server before entering the normal text-model conversation flow. Assistant replies are synthesized with an original deep neutral AI voice; do not imitate a named actor or fictional character.

**Why:** The requested cinematic voice effect should be preserved without cloning a protected performer, while keeping voice and text conversations on the same OMEGA history and security path.

**How to apply:** Keep voice output disabled by default, use AI STT/TTS endpoints rather than Web Speech API, and preserve the existing text-model response as the source text for speech.