---
name: PWA branding
description: Installation metadata and icon requirements for the Omega web app on mobile home screens.
---

OMEGA's installable web app identity is defined by the manifest, page metadata, and real 192px/512px PNG icons. The short name should be “OMEGA AI”, with the dark background and amber Ω mark carried through theme colors and favicon assets.

**Why:** Chrome may show a generic or cached red icon when only a favicon exists, and the installed shortcut name can come from the manifest rather than the visible app header.

**How to apply:** Keep manifest name, short_name, start URL, theme color, and icon paths aligned. When updating branding, remove the old mobile shortcut and install it again because Chrome caches PWA metadata.