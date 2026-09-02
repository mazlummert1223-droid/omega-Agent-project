---
name: Video provider fallback
description: LTX endpoint behavior and the free storyboard fallback for video generation.
---

LTX requests can reach the provider successfully while still failing with an explicit insufficient-funds response; this is a provider-account state, not a routing failure. The app should surface that reason and keep a no-LTX-credit storyboard-to-MP4 path available.

**Why:** A real short LTX request returned a clear insufficient-funds error, while the existing local storyboard renderer completed an MP4 successfully.

**How to apply:** Preserve the provider error in the UI, refund any locally reserved credits on failure, and test the storyboard endpoint separately when validating video generation.