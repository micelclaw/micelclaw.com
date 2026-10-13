1/ Deny-by-default is the only agent permission model that fails safe. If you forget to lock a door, it should be locked — not open. Here's how our AI agents get exactly zero backend access by default. 🧵

2/ Every agent tool call is dispatched through the same pipeline a human request walks: auth → scope-validation → semantic-scope → approval → audit. Same hallway, in-process via app.inject(). Nothing rewritten.

3/ The key flip: scope-validation is deny-by-default. An unmapped resource is denied, not allowed. Before, "we didn't map this endpoint" meant anything goes. Now it means no.

4/ Each capability declares its scope up front (write:notes, notes.create). A registry — one file per domain — is the single source of truth: it feeds both the agent's tool catalog and the per-agent Tool Access toggles in the dash.

5/ The numbers: 424 capabilities exposed to agents out of 1456 REST endpoints — ~60% of the surface is deliberately off-limits. Admin, config, binary and UI-only endpoints an agent has no business touching.

6/ The result: the AI can only touch what you allow — and it touches it through the exact scope, approval and audit checks as if you'd done it yourself.

#selfhosted #AIagents

[visual: attach queue/2026-07-25/scopes-tech.jpg to tweet 1]
