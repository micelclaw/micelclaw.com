*A day we deleted good code.*

We wanted delegation between your agents to be governable: if a specialist doesn't answer, retry; if it keeps failing, stop asking for a while; and let each agent have its own limits. So we built exactly that — storage, defaults, retry with backoff, a circuit breaker.

Then we noticed nobody could ever call it. One agent handing work to another happens inside the AI runtime, as a tool the model invokes directly. Our server never sees that call, so it can't apply a policy to it.

We deleted it the same day and wrote down the three conditions that would make it possible. Those conditions are worth more than the code was: they're what we'd check first next time.

The rest of the story — including a bug that's still open — is in yesterday's post:
https://micelclaw.com/blog/multi-agent-topology
