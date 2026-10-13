Deny-by-default: the only agent permission model that fails safe. In Micelclaw an unmapped resource isn't allowed by omission — scope-validation denies it. "We didn't map this endpoint" used to mean anything goes; now it means no.

Every agent tool call walks the same auth → scope → approval → audit pipeline a human's does. 424 capabilities exposed to agents; ~60% of the REST surface deliberately isn't. The AI touches only what you allow.

#selfhosted #aiagents #infosec #mcp
image: queue/2026-07-25/scopes-tech.jpg
alt: Micelclaw's deny-by-default agent scopes — an endpoint you didn't map is denied, not allowed; 424 capabilities exposed to agents, ~60% of the REST surface deliberately off-limits.
