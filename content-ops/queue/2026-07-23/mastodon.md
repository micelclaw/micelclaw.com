Our agents don't curl the API. Inside their sandbox there's no network to curl — it's launched `network: none`. So the MCP facade runs host-side: each typed `claw_<domain>` call becomes an internal request, dispatched through Core's whole Fastify pipeline via `app.inject()` — auth → scope → approval → audit. Zero business logic reimplemented. The facade is a translator, not a second backend.

https://micelclaw.com/blog/mcp-facade
#ai #mcp #selfhosted #security
image: queue/2026-07-23/mcp-facade-tech.jpg
alt: Micelclaw's MCP facade — a typed claw_<domain> tool call runs host-side and is dispatched through Core's full Fastify pipeline (auth → scope → approval → audit) via app.inject(), reimplementing zero business logic.
