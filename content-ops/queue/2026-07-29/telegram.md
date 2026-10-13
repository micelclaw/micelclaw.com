*New post: seven agents per user, and every way delegation broke.*

Your server gives you a small team of AI helpers instead of one overloaded assistant: a coordinator plus six specialists — files and documents, infrastructure, images and voice, money, patterns, smart home. Each one has its own memory, its own personality file and its own permissions, and none of them can touch a domain it wasn't given.

Choosing that shape took an afternoon. The four months since went entirely into what happens when one helper hands work to another.

The coordinator quietly delegated jobs to itself, because the parameter that says *who* should receive the task was optional and undocumented. A helper spawned to do voice work arrived without the voice tool, because it inherited the caller's toolbox instead of its own. A request waited forever on a reply that a restart swallowed. And the conversations of the helpers were invisible in the dashboard, so "it refused", "it was never asked" and "it worked but the answer got lost" all looked identical.

We also built a whole delegation policy — retries, circuit breaker, per-agent defaults — and reverted it the same day, once we noticed nothing could ever call it.

The full write-up, including the one that's still open:
https://micelclaw.com/blog/multi-agent-topology
image: queue/2026-07-29/gif-agents-seams.gif
