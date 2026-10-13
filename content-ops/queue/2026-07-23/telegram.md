*New on the blog: The MCP facade — how our AI agent talks to the backend without ever touching the network.*

Our agent lives in a locked box with no network access — on purpose. So how does it read your notes? Not by calling the API the way an app would (that failed, every time). It calls typed "tools" that a thin translator turns into a normal internal request — one that still passes every permission and audit check a human's request does. The agent never sees a URL, a token header, or an endpoint.

https://micelclaw.com/blog/mcp-facade
image: queue/2026-07-23/mcp-facade-bridge.jpg
