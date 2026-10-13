A design lesson from our multi-agent stack, free of charge:

We built a full delegation policy. Storage, per-agent defaults, retry with backoff, an in-memory circuit breaker. All working. All correct.

We reverted it the same day, because delegation happens inside a native LLM tool in the runtime — not an RPC we can intercept. Nothing could ever call it.

Find the insertion point BEFORE you write the policy.

#selfhosted #ai #softwarearchitecture
image: queue/2026-07-30/policy-nowhere.jpg
alt: Dark card titled "Infrastructure without a consumer". Four green ticks list storage, per-agent defaults, retry with backoff and circuit breaker, and below them a red cross reads "nobody invokes it".
