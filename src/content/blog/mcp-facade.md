---
title: "#13 — The MCP facade: how agents talk to the backend without curl"
description: "Our agents used to curl the Core API from inside a sandboxed container — and it failed with exit 7, every single time. Here's the MCP facade that replaced it: one typed tool per domain, dispatched through the full auth-scope-approval-audit pipeline via app.inject(), with zero business logic rewritten."
date: 2026-07-23
author: "Víctor"
tags: ["mcp","ai-agents","architecture","security"]
draft: false
---

An agent skill runs `curl http://127.0.0.1:7200/api/v1/notes` from inside its Docker sandbox. It fails with exit code 7 — "couldn't connect" — before authentication even runs, because the sandbox is launched with `network: none`. There is no loopback to reach. There is no network at all.

Meanwhile, the `SKILL.md` files were confidently telling the model to authenticate with a `$CLAW_API_KEY` environment variable that didn't exist inside the sandbox in the first place.

So the picture was: our agents had been instructed to talk to a backend they could never reach, using a token that wasn't there. Every write to a note, every calendar lookup, every "remember this" — all of it was a `curl` into a wall. This post is about the MCP facade that replaced that model, and the one finding that made the whole design fall out cleanly.

```bash
# inside the agent's Docker sandbox (network: none)
$ curl http://127.0.0.1:7200/api/v1/notes
# exit code 7 — couldn't connect, before auth even runs
```

## The fix we almost built

The first instinct was to punch a hole through the wall without taking it down. Keep `network: none` entirely — the isolation is a feature, not an accident — and hand the sandbox a filesystem socket instead of a network address. Bind-mount a Unix socket into the container and the agent could do `curl --unix-socket /run/claw.sock http://core/api/v1/notes`: no TCP, no network namespace, just a file descriptor mounted into the container. Call it option C.

Option C was sound. A bind-mounted socket genuinely sidesteps the `network: none` wall that killed exit-7 `curl`, because a Unix socket isn't a network — it's a file. It would have worked.

And then we found something that made it irrelevant.

## The finding that changed everything

The Model Context Protocol has a client and a server. We had been assuming the MCP *client* — the thing that actually issues the tool call — would live wherever the agent's code lives: inside the sandbox.

It doesn't. The MCP client runs **host-side**, in the OpenClaw runtime process, not inside the agent's Docker container. When a model emits a tool call, the runtime — outside the sandbox — is what dispatches it.

That single fact rewrites the problem. A tool call never touches the sandbox's network namespace, because it never originates inside the sandbox. The `network: none` wall — the exact wall that killed `curl` with exit 7 — is simply not in the path. There is nothing to tunnel through, no socket to bind-mount, no bridge to build.

Option C became obsolete overnight. It would have solved a real problem — reach Core without a network — but host-side MCP solved the same problem more cleanly, with no second listener to run and secure. We shelved it before writing a line of it.

The shape was now obvious. Core would run its own MCP server — the facade — and expose each domain of the API as a typed tool.

```
Facade:  core/src/mcp/claw-os-mcp-server.ts
         streamable-HTTP MCP server on 127.0.0.1:7250
         (Core itself is on 127.0.0.1:7200)
```

Each domain gets one tool named `claw_<domain>` with an `action` enum. `claw_notes` takes `action: create | list | get | update | delete`. `claw_calendar`, `claw_contacts`, `claw_finance`, and the rest follow the same mould. The model never learns a URL. It learns a vocabulary of typed tools.

## A translator, not a second backend

Here was the decision that mattered most, and the one we kept coming back to: **the facade is a thin translator, not a reimplementation.**

The tempting version of this project is a second backend — a service that knows how to create a note, check a scope, run an approval, sign an audit record. That version is a disaster. It's a duplicate of the real Core that drifts out of sync the first time someone changes a validation rule and forgets the copy.

We refused to write it. Every facade tool call does exactly three things:

1. Look up the capability registry → `(method, url, body, query)`.
2. Build an *internal* HTTP request carrying `Authorization: Bearer <auth_token>` plus `x-claw-capability: <domain>.<action>`.
3. Dispatch that request through the **full Fastify pipeline** via `app.inject()`: `auth → scope-validation → semantic-scope → approval-check → handler → audit`.

`app.inject()` is Fastify's in-process request injector — it runs a request through every plugin and middleware the real HTTP server runs, without a socket. So a `claw_notes` call and a human's `POST /api/v1/notes` walk the *same hallway*. The facade adds the `Bearer` prefix, names the capability, and gets out of the way.

```javascript
// what the agent actually calls (facade tool, host-side on :7250)
claw_notes {
  "action": "create",
  "params": { "title": "...", "content": "...", "tags": ["..."] },
  "auth_token": "<per-conversation session token>"  // bare value, NO "Bearer"
}
```

```javascript
// what the facade builds internally and dispatches via app.inject()
Authorization: Bearer <auth_token>   // the facade adds the "Bearer"
x-claw-capability: notes.create
// → auth → scope-validation → semantic-scope → approval-check → handler → audit
```

Because every call routes through the real pipeline, everything the pipeline already enforces stays enforced, with nothing rewritten:

| Preserved for free | Where it lives |
|---|---|
| Deny-by-default scopes | `scope-validation.ts` |
| L0–L3 approval levels | `approval-check.ts` |
| Ed25519 audit signing | audit stage of the pipeline |
| Tier gating (Free/Pro/Plus) | the handlers |
| CRUD hooks (embed / heat / extract) | post-write pipeline |
| Credits accounting | the handlers |

The agent's identity travels in the `auth_token` argument; `auth.ts` resolves the fixed `userId` from it, which is what makes impersonation impossible — a model cannot claim to be someone else by editing a field, because the token *is* the identity.

## The capability registry

The `(method, url, body, query)` lookup in step 1 comes from a declarative registry: one file per domain under `core/src/mcp/registry/domains/*.ts`. Each `Capability` maps a `(domain, action, params)` triple to exactly one internal HTTP request.

```javascript
// registry entry: (domain, action, params) -> one internal request
// core/src/mcp/registry/domains/notes.ts
{ domain: 'notes', action: 'create', method: 'POST', url: '/notes',
  scope: 'write:notes', approval: 'L0' }
```

This registry is the single source of truth, and it earns its keep by feeding two consumers at once. The same declarations generate:

- The facade's tool catalog (what the model sees as callable tools).
- The `GET /managed-agents/available-tools` endpoint that powers dynamic Tool Access (what an admin toggles per agent in the dashboard).

One file, two surfaces, no chance of them disagreeing. Add a capability and it shows up in both the model's vocabulary and the permission UI in the same commit.

## Security had to come first

There's an uncomfortable truth buried in this whole design. For as long as the agents lived behind `network: none`, a lot of latent vulnerabilities didn't matter — they were contained by a wall that happened to block *everything*. The moment we connected agents host-side, that wall came down, and those vulnerabilities became live.

So the actual first phase of this project (Fase 0) wasn't the facade at all. It was closing three holes *before* exposing anything:

| Guard | What it closed |
|---|---|
| **C1** | `POST/PATCH /agent-tokens` now returns `403` when `keyScope === 'agent'` — an agent can't mint or widen its own token (no self-escalation). |
| **C2** | The same `403` on `requireAdmin` routes — an agent token can never reach an admin surface. |
| **C3** | `scope-validation` flipped to **deny-by-default** — an unmapped resource is denied, not allowed. |

C3 is the one that changes the posture of the whole system. Before, "we didn't map this resource" meant "anything goes." After, it means "no." Sensitive domains had to be re-exposed deliberately and carefully on top of that floor — the kind of thing that, done in the wrong order, quietly ships a hole.

## Identity: the model stopped copying the token

The first version of the auth model (ADR-10) made the model responsible for copying its own `auth_token` — a 64-hex secret — into every single `claw_*` call. On a capable model, on rails, this works. But it's fragile by construction: the moment the model improvises a wrong tool call, it also mangles or hallucinates the token, and worse, **subagents got no token at all**. A child spawned via `sessions_spawn` doesn't pass through the chat bridge that injected the token, so delegated work silently failed. This is the real reason behind the months-old complaint that "Dali doesn't answer" when you delegate to her.

ADR-11 fixed it by taking the model out of the loop entirely. A native OpenClaw plugin, `openclaw-plugins/claw-identity`, registers a `before_tool_call` hook. For any tool named `claw-os__*`, the hook overwrites `params.auth_token` with the correct **per-agent** token, resolved host-side from `ctx.agentId` against a token map at `~/.config/micelclaw/agent-tokens.json` (chmod 600). The model's value, if it bothered to supply one, is ignored.

Deterministic, and — crucially — it covers subagents. Any agent, main or spawned, gets *its own* token injected host-side. It can't hallucinate a token it never has to write. (That hook is a whole story of its own; it's next week's post.)

## Skills stopped being API docs

Once the mechanics — URL, headers, method, request shape — moved into the typed tool and its schema, the `SKILL.md` files had nothing left to document. So they became something better.

Each skill shrank from a full API reference to a ~25–45 line **judgment guide**: not *how* to call the endpoint (the schema captures that) but *when and how* — the taste and context a schema can't encode. "Prefer `list` with a tag filter before `get`." "Don't create a duplicate contact; search first." The skill teaches the decision, the tool carries the call.

## Auditing the real surface

One rule we set early: never mirror the capability registry to describe the API. Audit the real REST surface, because the registry is a deliberate *subset* of it, and pretending otherwise hides what's exposed.

So on 2026-07-03 we cross-audited both:

| Surface | Count |
|---|---|
| REST endpoints in `routes/` | 1456 |
| Capabilities across code domains | 424 |
| Code domains | 31 |
| REST surface deliberately **not** exposed to agents | ~60% |

That ~60% is intentional, not a backlog. It's admin, config, binary, and UI-only endpoints that agents have no business touching. The audit's value is precisely in making the gap explicit — you can only reason about what an agent can do if you've measured what the surface actually is, endpoint by endpoint, rather than trusting the shorter list to speak for the longer one.

## The gotchas that cost us

Wiring typed tools into a model turned out to have sharp edges that had nothing to do with the design and everything to do with the plumbing.

**The MCP SDK silently strips undeclared args.** Any argument not declared in a tool's `inputSchema` is dropped before it reaches the facade. Since the identity hook *injects* `auth_token` (and `_conversation_id`) host-side, those fields must still be declared in the schema — otherwise the SDK strips the hook's injected value and it dies silently on the way in. The thing you inject must be a thing you declared.

**A `z.record` schema sent a weak model into an 84-call loop.** Our first cut emitted the tool's `params` as `z.record` → JSON Schema `properties: {}` — no declared fields. A small local model (Francis, a 35B-A3B at IQ2_M) was asked for "contacts starting with a" and made **84 calls with `params: {}`**, completely unable to construct `params: { search: "a" }` because the schema gave it nothing to fill in. We fixed it in `tool-builder.ts` by generating `params` as the union of every action's `.shape`, `.partial().passthrough()` — real, named fields the model can reason about.

**One `.email()` took down every Groq chat.** zod v4's `.email()` emits a regex with lookaheads. Groq compiles every tool schema with an RE2 engine, and RE2 has no lookarounds — so it returned a `400` and rejected the *entire* chat, for every agent that happened to carry the `files` domain. One field, one lookahead, whole conversation dead. Fixed with a generic lookaround-stripping sanitizer in `tool-builder.ts` (the real validation still runs against the original zod, so nothing loosens).

**And a preset gotcha:** `bundle-mcp` — the tool key that hands the agent the facade at all — must be in `tools.sandbox.tools.alsoAllow`, or the sandbox prunes it and the agent sees none of the facade tools. It's in the coding, messaging, and full presets for exactly this reason.

For completeness, a handful of skills were *not* migrated and still `curl`, on purpose: `claw-pdf-tools` (binary endpoints), `claw-bind` (lives under `/api/v1/auth`, uses a JWT/system token), and the four `claw-app-*` meta-skills (app authoring, an admin flow).

## What I'd do differently

**I'd ship the Fase 0 hardening as the foundation, before wiring any agent host-side.** Connecting agents lit up vulnerabilities that `network: none` had been quietly containing. Deny-by-default and the C1/C2/C3 guards should have been the first commit, not a prerequisite we scrambled to close. Ordering security after exposure is how you ship a window.

**I'd inject identity host-side from day one (ADR-11), not make the model copy a 64-hex token (ADR-10).** The model-copies-the-token design was fragile against weak models and broke subagents *entirely* — `sessions_spawn` children got no token, which is the whole reason delegated work silently failed. A `before_tool_call` hook is both more robust and simpler. We took the long way there.

**I'd declare the params schema shape up front.** The empty-`properties` `z.record` schema sent a small model into a loop it could not escape — 84 calls, all `params: {}`. It read like a model failure and was a schema-shape bug. Give the model named fields and it fills them.

**I'd sanitize tool schemas for RE2 from the start.** A single `.email()` in one domain `400`'d every Groq chat for every agent carrying that domain. A one-line validator emitting a lookahead took down whole conversations. Cheap to prevent, expensive to diagnose.

## The takeaway

The agent never learned an API. It learned a vocabulary of typed tools — and every call still walks the same `auth → scope → approval → audit` hallway a human's request does. That's the entire trick: the facade is a translator, not a second backend. It reuses the whole pipeline via `app.inject()` and rewrites nothing. The AI can only touch what you allow, and everything it touches passes the exact permission checks and audit log as if you'd done it yourself — because, mechanically, it did.

---

*Next up: #14 — Deterministic agent identity: injecting the per-agent token with a before_tool_call hook*
