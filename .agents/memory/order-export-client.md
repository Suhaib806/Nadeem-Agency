---
name: Order export client
description: Browser download behavior for generated binary export hooks
---

Generated hooks for binary download endpoints return a `Blob`, while an anchor needs an object URL or a relative download URL. Treat the generated hook as a download adapter instead of stringifying the Blob.

**Why:** Stringifying a Blob produces `[object Blob]`, so a visually complete export screen can still fail when the user clicks download.

**How to apply:** Whenever an OpenAPI endpoint returns a file, verify the UI creates a browser-downloadable URL and preserve the authenticated request path.