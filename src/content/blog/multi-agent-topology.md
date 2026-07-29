---
title: "#15 — Seven agents per user: delegation, and every way it broke"
description: "We gave each user seven specialist agents and one coordinator. Then we spent four months finding out that the hard part isn't the topology — it's what happens when one agent hands work to another."
date: 2026-07-29
author: "Víctor"
tags: ["ai", "architecture", "llm", "selfhosted"]
draft: false
---

Here's a bug report we got from our own system, and it took us longer to understand than we'd like to admit:

> "Ask Francis to generate a voice recording. He says he'll delegate it to Dali. Then nothing happens."

Nothing happened. No error, no timeout, no failed tool call. The coordinator agent said it was handing the job to the specialist, and then the conversation just… stopped. Dali never spoke.

We built a seven-agent topology because one agent with sixty tools is worse than seven agents with ten each. That part turned out to be right. What we underestimated is that **delegation is the whole product**. Every interesting failure in the last four months has been at the seam between two agents, not inside one.

This is a tour of that seam, including the parts still broken.

## THE TOPOLOGY

Every user gets seven agents, provisioned atomically when their account is created. They are not shared. They are not a pool. Here's the actual configuration, straight out of `auto-provision.service.ts`:

| Agent | Role | Model | Scopes |
|---|---|---|---|
| **Francis** | Coordinator — notes, calendar, mail, contacts, search, diary, bookmarks | `claude-sonnet-4-6` | `notes:* events:* emails:* contacts:* diary:* bookmarks:* search:read graph:read` |
| **Atlas** | Productivity — files, photos, office docs, projects, diagrams | `claude-sonnet-4-6` | `files:* photos:* search:read` |
| **Sentinel** | Infrastructure — storage, network, reverse proxy, DNS, VPN, Docker | `deepseek-chat` | `storage:* hal:* proxy:* dns:* vpn:* docker:*` |
| **Dali** | Creative — image generation, media, voice (TTS/STT), web browsing | `claude-sonnet-4-6` | `audio:* media:* photos:read files:read` |
| **Ledger** | Money — bank accounts, transactions, budgets, CRM | `deepseek-chat` | `finance:* crm:* search:read` |
| **Darwin** | Intelligence — patterns, preferences, cross-domain search | `claude-sonnet-4-6` | `search:read` |
| **HASS** | Smart home — IoT devices, automations, scenes, sensors | `deepseek-chat` | `ha:*` |

Three things worth pointing out, because they're the parts people get wrong when they copy this shape.

**The models are deliberately different.** Sonnet for the agents that need judgment (coordination, creative work, pattern-finding); DeepSeek for the agents that mostly run deterministic infrastructure and finance operations. This isn't cost optimization dressed up as architecture — Sentinel restarting a container doesn't need the same reasoning as Francis deciding *which* specialist should handle a request.

**The topology is flat.** Depth-1, siblings only, no nested sub-agents. Francis is the chief but not a bottleneck: you can talk to any agent directly from the chat. The coordinator exists to route the requests where you *didn't* say who should handle it.

**Two of them are nearly empty now, and we left it that way.** Darwin ships with exactly one skill (`claw-search`). There's a comment in the config explaining why: `claw-graph` and `claw-insights` were retired in June because the knowledge graph and the derived insights turned out to be *human* features of the dashboard, consumed through REST, not something an agent needed to poke at. Ledger is in the same shape. The honest version of a multi-agent design is that some agents shrink after you watch what people actually ask for.

There's also a hidden eighth agent, `crawl`, dedicated to the browser extension. It's marked `hidden: true` and never shows up in the agents module — it exists so that the extension's chat doesn't compete with Francis for attention in the user's real browser session.

### Namespacing, or: why every agent has a double dash in its name

Agents are per-user, and the runtime that executes them is shared. So the identifier of an agent is `{prefix}--{name}` — `paco--atlas`, `admin--francis`. The prefix is the local part of the user's email, normalized to `[a-z0-9-]`, with a numeric suffix on collision, and it lives in `users.agent_prefix` as `UNIQUE NOT NULL`.

Each agent-user pair gets its own workspace directory:

```
~/.openclaw/workspaces/paco--atlas/
├── SOUL.md      # personality (atlas = methodical, dali = creative...)
├── USER.md      # user profile, propagated from the chief on bootstrap
├── TOOLS.md     # the catalog of skills this agent can reach
├── MEMORY.md    # persistent memory
└── skills/      # physical copies of the SKILL.md files it's allowed to read
```

The display name stays "Atlas". The namespacing is invisible to the user — right up until it isn't, which we'll get to.

## FAILURE 1: THE CHILD THAT INHERITED THE WRONG TOOLS

The runtime gives an agent two ways to start work somewhere else. `sessions_spawn` creates a child. `sessions_send` hands a message to another agent's session and waits for the reply.

We used `sessions_spawn` first, because "spawn a Dali to do the audio" reads like exactly what you want. It isn't. A spawned child **inherits the parent's tools**, not the target agent's. So `sessions_spawn(agentId: "paco--dali")` produces something that is named Dali, is addressed as Dali, and does not have `claw_audio`, because Francis doesn't have `claw_audio`.

The delegation guide now says it in a box, in capitals, at the top:

```
sessions_spawn creates a subagent that INHERITS YOUR tools, not the specialist's.
If you do sessions_spawn(agentId: "<PREFIX>--dali", ...), that child "Dali" ends up
WITHOUT claw_audio (because you don't have it) and the task fails.
sessions_spawn is only for YOUR OWN sub-tasks (a worker of yours running in parallel
with your same tools). To delegate to a specialist, ALWAYS sessions_send.
```

| Scenario | Tool | Why |
|---|---|---|
| Ask Dali for audio, Atlas for files, Sentinel for infra | `sessions_send` | The specialist runs as *itself*, with *its* tools (synchronous, you wait for the reply) |
| Run a sub-task of your own in parallel | `sessions_spawn` | It's your worker; inheriting your tools is correct here |

The second-order lesson is more useful than the fix: **when two operations differ only in whose capabilities they carry, a model will pick the wrong one.** The names don't encode the difference. Only the documentation does, and documentation is a prompt, and prompts get compacted.

## FAILURE 2: AN OPTIONAL PARAMETER WITH NO DESCRIPTION

This is the one that produced the bug report at the top, and it is still open.

`sessions_spawn` takes an `agentId`. In the runtime's schema, that parameter is declared as:

```ts
agentId: Type.Optional(Type.String())
```

Optional. And — this is the part that matters — **with no `description`**. Meanwhile `taskName` and `thread` both have descriptions. The tool's own summary is one line: *"Spawn subagent or ACP session."*

Put yourself in the model's position. You get a tool with several described parameters and one undescribed optional one. You fill in what's described: `task`, `taskName`, `label`, `model`, `runtime`, `sandbox`, `mode`. You omit the one nobody explained. And because it's optional, the runtime doesn't complain — **it spawns you**. Francis delegates to Francis, does the work badly or not at all, and reports back that the specialist has been notified.

We verified this against a real trace (session `ea2c4895`): the call carried seven parameters and no `agentId`.

It's the same class of bug as another one we hit in the MCP facade — a parameter the model can't fill because the schema never told it the parameter was load-bearing. A tool call is a contract between a schema and a language model, and an undocumented optional field is a contract clause written in invisible ink.

This one is still in our open debt list. The fix we've scoped is a `before_tool_call` hook that rejects `sessions_spawn` without an `agentId` and returns the specialist map in the error, so the model can retry correctly in the same turn — the same hook mechanism we already use for [agent identity](/blog/agent-identity). We haven't shipped it yet, and until we do, delegation via spawn is unreliable. Saying otherwise would be more comfortable and less true.

## FAILURE 3: THE PARENT THAT WAITED FOREVER

When a parent delegates and yields, it's waiting for an announce-back from the child. That notification is best-effort. So:

> Children can abort (timeout, reset, bug) and the notification to the parent is best-effort. If Core/Gateway restarts while a parent is yielded, the children's announce-back is lost and the parent hangs **forever** — there's no sweeper to detect it.

A conversation that is neither finished nor running, with no error anywhere, is the worst possible state: nothing to retry, nothing to report, nothing in the logs.

The detector we built reads the **last 8 KB** of each parent's session JSONL looking for a `sessions_yield` not followed by an assistant message, and writes a row into `stuck_yield_sessions` (migration `0187`, idempotent via a unique key on `(user_id, session_key)`). Two design details earned their keep:

- **A 3-minute grace window** (`STUCK_GRACE_MS`) before flagging anything. The comment in the code explains why: *"so we don't false-positive during legitimately long delegations (Atlas with thinking + tool calls can take ~30 s before the first assistant text)."* Without it, the detector's main output is noise about work that's going fine.
- **Auto-resolution.** If the parent un-yields on its own, the row clears without anyone intervening. A recovery mechanism that requires a human to close its own tickets is a second job, not a fix.

Recovery is a `POST /managed-agents/:id/stuck-yield/resume` that injects a synthetic message into the parent, plus a button in the dashboard.

## FAILURE 4: THE CONVERSATIONS NOBODY COULD SEE

> The runtime runs children internally and never emits WS events for their messages to Core. Result: in the dashboard's Conversations tab you see the chief ("I delegated to Atlas") but you don't see Atlas's conversation. To audit a council or a multi-agent workflow you have to open the raw JSONL in the workspace.

This is an observability gap that becomes a correctness gap. If you can't see what the delegated agent did, you can't tell "Dali refused" from "Dali was never asked" from "Dali did it and the reply got lost" — which are three completely different bugs that present identically.

The mirror tails each subagent's session JSONL with byte-offset watermarks (migration `0188`, dedup index `0189`, 1 MB read cap per pass) and writes the messages into `agent_conversations` in two modes: `type='delegation'` for child runs, and `type='webchat'` for the parent's reply to the announce-back — which, as the code notes, *"happens inside the Gateway after `chat-bridge.callGateway` has already returned"*, and was therefore invisible to Core by construction.

## FAILURE 5: THE POLICY WITH NOWHERE TO PLUG IN

We built a `DelegationPolicy`. Per-agent defaults, retry with backoff, an in-memory circuit breaker, storage for all of it. It was good work. We reverted it the same day, with migration `0180_drop_delegation_policy.sql`.

The reason is in the doc, and it is the most useful paragraph in this post:

> Delegation between agents happens via `sessions_spawn`, which is **a native LLM tool inside the runtime** — not an RPC that Core can intercept. With that API, the `DelegationPolicy` we built has no insertion point:
> ✅ Storage · ✅ Per-agent defaults · ✅ `withRetry` helper with backoff · ✅ In-memory CircuitBreaker
> ❌ **Nobody invokes it** — Francis still delegates via `sessions_spawn` directly.
> Keeping it alive was infrastructure without a consumer.

Four components, all working, all correct, all unreachable. We had built a governance layer for a call path that never passes through us.

We wrote down the three conditions that would unblock it — the runtime exposing `sessions.spawn` as an RPC, changing the skill's contract to an HTTP `delegate_to` against Core, or building our own spawning runtime ("several sprints, high risk") — and deleted the code. The conditions are the valuable artifact. The code was the expensive way to discover them.

## FAILURE 6: THE ALLOW-LIST THAT ALLOWED TOO MUCH

Agent-to-agent messaging is gated by an allow-list. Ours was a flat list of wildcards, one per user: `paco--*`, `pepito--*`, `admin--*`, ten entries. And the guard's formula was `matchesAllow(requester) && matchesAllow(target)`.

Read that twice. Both sides match the list. `paco--francis` matches. `pepito--atlas` matches. **So `paco--francis → pepito--atlas` is allowed.** One user's coordinator could send work to another user's specialist, and everything downstream — per-user workspaces, per-user scopes, isolated memory — would be doing its job correctly on the wrong person's data.

What was actually preventing it, as we noted at the time, is that the models don't know other users' agent IDs. That is not a security boundary. That is a fact about vocabulary.

It's now closed deny-by-default in the identity plugin (`crossUserSendBlock`): an agent can only send to agents sharing its own prefix. Legitimate cross-user delegation, when we build it, will be an explicit grant — not the absence of a check.

## WHAT I'D DO DIFFERENTLY

**Find the insertion point before writing the policy.** The `DelegationPolicy` revert cost us a day and taught us something we could have learned in twenty minutes by asking "what function will call this?" before writing the first line. When you're building governance for a system you don't fully own, the first deliverable isn't the policy — it's the proof that the policy can be enforced.

**Treat tool schemas as prompts, because they are.** Two of the six failures above (the spawn/send confusion, the undescribed `agentId`) are the model correctly following an under-specified contract. We spent weeks looking at model behavior when the bug was in a type declaration. The parameter descriptions in a tool schema are not documentation for humans reading the code; they are the only instructions the model receives at the moment it has to decide.

**Build the observability at the same time as the delegation, not after.** We shipped delegation, then spent a month unable to diagnose it because the child conversations were invisible. The mirror should have been part of the first version. A multi-agent system where you can only see one agent isn't a multi-agent system, it's a black box with a friendly name.

**Assume best-effort notifications will be lost, and write the sweeper first.** The stuck-yield detector isn't clever; it's 8 KB of tail-read and a grace window. The mistake was shipping the yield before shipping the thing that notices when the yield never ends.

## ONE MORE THING: THE AGENTS SHARE A BRAIN

A rule from the delegation guide that surprises everyone, including us:

```
While you wait, do NOTHING else: no sessions_history, no process, no exec, no
sessions_yield, no re-sending the task, no trying it yourself with Python/shell.
sessions_send already waits; the result comes back on its own. On this team the
agents SHARE an AI model: if you keep acting (e.g. polling their history), you hog
the model and the specialist CAN'T work → the task hangs. Stay still.
```

An agent that anxiously checks on its colleague's progress prevents its colleague from making progress. Seven agents, one model instance, and the failure mode is that helpfulness starves the thing it's trying to help.

## THE TAKEAWAY

The topology was the easy decision. Seven specialists and a coordinator, flat, per-user, with their own scopes and their own workspaces — that shape has held up for four months without a single revision.

Every hard problem lived in the handoff: a child with the wrong tools, a parameter the model couldn't see, a parent waiting on a message that got lost in a restart, a conversation nobody could read, a policy with nowhere to attach, and an allow-list held together by the fact that nobody knew the right names.

**If you're building multi-agent anything: the agents are not the system. The seams are the system.**

---

*Next up: #16 — fitting seven agents into a model with an 80k context window, which is a story about a 45% cut, two conclusions I was wrong about, and one bug that turned out not to exist.*
