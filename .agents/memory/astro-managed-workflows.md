---
name: Astro managed workflows
description: Keep Astro dev and preview servers attached to Replit-managed workflows.
---

**Rule:** In Astro app dev or preview scripts launched by Replit-managed workflows, set `ASTRO_DEV_BACKGROUND=1` to prevent Astro from automatically detaching its server.

**Why:** Astro 7 detects agent environments and can daemonize its dev server. The managed workflow then exits, and the preview proxy returns an error even though Astro printed that the server had started.

**How to apply:** Keep the Astro process attached to the managed workflow and confirm the workflow remains running before using the preview. Static production builds do not need this setting.
