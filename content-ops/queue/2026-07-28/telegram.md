*This week: two pieces of the agent stack.*

Your AI assistant no longer makes raw calls to your server. It reaches your notes, files and calendar through a small set of safe, typed actions — and every one runs through the exact same permission and audit checks as if you'd done it by hand. The AI can only touch what you've allowed, and everything it does is logged.

The second piece is identity: the server now hands each agent its own key automatically, so no AI ever has to copy a secret. That also fixes a quiet bug where a helper agent you delegate to would silently do nothing — it was never given a key. Now every agent, main or helper, proves exactly who it is.
image: queue/2026-07-28/recap-bridge.jpg
