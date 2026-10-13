*New post: a 45% cut, and two things I was wrong about.*

An AI model has a fixed amount of room per conversation. Everything competes for it: your messages, its memory, its personality — and the description of every single thing it's allowed to do.

One of our agents stopped fitting. Not "answered worse": the descriptions of its own tools were bigger than the space it had to think in.

The fix was subtraction. Two fields — the ones carrying the agent's identity — were described on all 409 tools, and the model never fills them in: the server injects them. Emptying those descriptions and moving one repeated paragraph into the right place took the catalogue from 508,782 bytes to 278,533. **45% smaller, nothing lost.**

The expensive part wasn't the fix. It was retracting two things I was sure of — I'd claimed 408 tools were leaking to the model (it was ~65; I'd done the arithmetic instead of reading the trace that says so exactly) — and a "phantom retry" bug I reported that turned out to be the normal shape of a tool turn.

There's a new bar in the dashboard for every agent: how full its window is, and which app is costing what. Ours reads 97%.

https://micelclaw.com/blog/agent-token-budget
image: queue/2026-08-02/gif-context-budget.gif
