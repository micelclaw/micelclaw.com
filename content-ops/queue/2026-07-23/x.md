1/ Our AI agents don't `curl` our API. They can't — their sandbox is launched `network: none`, so `curl http://127.0.0.1:7200/...` fails with exit 7 before auth even runs. Here's the MCP facade that replaced curl. 🧵

2/ The key finding: the MCP client runs host-side, in the OpenClaw runtime — not inside the sandbox. A tool call never originates in the box, so the `network: none` wall simply isn't in the path. Nothing to tunnel through.

3/ So Core runs its own MCP server — the facade. Each domain is one typed tool: `claw_notes`, `claw_calendar`, `claw_finance`… with an `action` enum. The model never learns a URL. It learns a vocabulary of typed tools.

4/ The facade is a translator, not a second backend. Every call becomes an internal request dispatched via Fastify's `app.inject()` through the full pipeline: auth → scope → approval → audit. Zero business logic reimplemented.

5/ So a `claw_notes` call and a human's `POST /api/v1/notes` walk the same hallway. Deny-by-default scopes, L0–L3 approvals, Ed25519 audit signing — all preserved for free. The AI can only touch what you allow.

6/ Full write-up (the finding, the Fase 0 hardening, the gotchas): https://micelclaw.com/blog/mcp-facade

[visual: attach queue/2026-07-23/mcp-facade-tech.jpg to tweet 1]
