Making an LLM retype its own 64-hex auth token on every tool call works — until it improvises a tool and improvises the token too, and subagents spawned via sessions_spawn never got one at all. Fix: a native before_tool_call hook injects each agent's token host-side, keyed by ctx.agentId. Deterministic, per-agent scopes, the model never touches the secret.

https://micelclaw.com/blog/agent-identity
#selfhosted #ai #mcp #opensource
video: queue/2026-07-26/gif-a2-identity-token-gifv.mp4
alt: Animation of a tool call whose auth_token the model types out by hand, then gets wrong (a 42-character string, denied), until the before_tool_call hook stamps the right 64-hex token host-side, keyed by ctx.agentId — allowed, with per-agent scopes.
