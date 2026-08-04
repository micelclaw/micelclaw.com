---
title: "#16 — A 45% cut, and two things I was wrong about"
description: "One of our agents stopped fitting in its own context window. Trimming the tool catalogue by 45% took two lines of deletion — but getting there meant retracting two confident conclusions and one bug that turned out not to exist."
date: 2026-08-02
author: "Víctor"
tags: ["ai", "llm", "optimization", "selfhosted"]
draft: false
---

Atlas is the agent that handles files, photos, office documents and projects. It runs on `gemma-4-12b` with an 80,000-token context window, locally, on the same box as everything else. One afternoon it stopped fitting.

Not "gave worse answers." Stopped fitting. The tool schemas of the apps it had been given were, on their own, larger than the room the model had to think in.

Back in March I wrote [#07 — Your AI agent is wasting 90% of its context](/blog/agent-token-waste), about how much of an agent's window goes to describing tools it will never call. This is the sequel, four months later, with real measurements instead of estimates. It's also a retraction: two of the things I was most confident about turned out to be wrong, and a bug I'd diagnosed turned out not to exist.

## THE MEASUREMENT THAT STARTED IT

Our agents reach the backend through a facade that exposes every domain as a typed tool ([#13](/blog/mcp-facade) has the architecture). `tools/list` returns the catalogue. Here's what it weighed:

```
tools/list → 508,782 bytes
```

Half a megabyte of JSON schema, for 409 tools. The interesting question isn't "that's a lot" — it's **what exactly is in there**.

So I counted. Two fields dominated:

```ts
AUTH_TOKEN_FIELD: z.string().describe("…")
CONVERSATION_ID_FIELD: z.string().describe("…")
```

Every tool declares both, because the facade needs the caller's identity and the conversation it belongs to. Their descriptions, multiplied by 409 tools, came to roughly **133,000 tokens of the catalogue**. Descriptions of two fields that the model **never fills in** — since [#14](/blog/agent-identity), a host-side hook injects the token before the call ever reaches the server.

The second offender was a boilerplate paragraph in every tool description — 211 characters explaining how to pass the auth token — repeated 408 times. Once is instruction. 408 times is furniture.

## THE FIX WAS SUBTRACTION

**T1**: empty the `.describe()` on both identity fields. They stay *declared* — this matters, and I'll come back to it — but they carry no prose.

**T3**: strip the boilerplate from 408 descriptions and put it exactly once, in the agent's `TOOLS.md`, where it belongs:

```
- Token: the auth_token of every claw_* tool is injected AUTOMATICALLY (host-side identity hook).
  DON'T fill it in yourself — if you do, it's ignored.
- Params: build each tool's parameters ONLY from the user's CURRENT request;
  do NOT reuse or copy the ones from a previous call.
```

Result, verified live:

| | before | after |
|---|---|---|
| `tools/list` | 508,782 B | **278,533 B** |
| boilerplate occurrences | 408 | **0** |
| `auth_token` still declared | 409/409 | **409/409** |
| capability lost | — | **none** |

**−45.3%**, and every tool still executes. The whole change is deletion.

### Why the fields stay declared

The MCP SDK validates tool arguments with a zod object in **strip mode**: the handler receives the parsed args, and **a field that isn't declared is discarded before it arrives**. If we removed `auth_token` from the schema to save the last few bytes, the host-side injection would write into a field that the SDK then throws away — and every agent would stop authenticating at the same moment.

That's why the remaining optimisation is deferred rather than shipped. Removing `$schema` and omitting the two identity fields from the *announced* schema (while keeping them in the parsed one) is worth roughly **25,000 tokens of context per agent** — and requires bridging past the SDK's convenience wrapper. It's a separate change with its own verification, because the failure mode is "everything breaks at once."

## THE FIRST THING I WAS WRONG ABOUT

Here's what I believed when I started: **408 tools were leaking into the model's context.**

The arithmetic seemed to support it. Half a megabyte of catalogue, divide by ~3.6 characters per token, and you get a number that looks catastrophic.

It's a false positive, and the error is embarrassing once you see it. Dense JSON doesn't tokenise at 3.6 characters per token — it's closer to **1.3**, because every brace, quote and colon is its own token. At that ratio, 408 tools would be ~360,000 tokens, which is more than the context window of the models involved. The number was impossible, and I'd written it down anyway.

What was actually happening: **the model received about 65 tools.** The runtime's per-agent deny-list was working correctly the whole time.

The way to check is not arithmetic. It's the trace:

```
~/.openclaw/agents/<agent>/sessions/<id>.trajectory.jsonl
  → event: context.compiled
  → data.tools = the EXACT array sent to the model
```

That file has the answer, exactly, with no estimation. I had spent a day reasoning about a number I could have read.

## THE SECOND THING I WAS WRONG ABOUT

I had also assumed the facade's `tools/list` was filtering by identity — that when an agent asked for the catalogue, it got *its* catalogue.

It doesn't. `tools/list` returns everything. The per-agent trimming is done **100% by the runtime**, via a deny-list of tool names (`claw-os__<tool>`). The facade is not the enforcement point; it never was.

This matters because it changes where a fix has to live. Any per-agent trimming we want has to be expressed as entries in that deny-list — which is exactly what the next part does.

## CORE AND FULL: THE MACHINERY WAS ALREADY THERE

Every capability in our registry can be tagged `tier: 'core' | 'full'`. The plumbing to compute a per-agent deny-list from those tiers existed too. It had been built months earlier and then left almost unused: only two domains tagged anything as `full`.

So the work wasn't building a mechanism. It was **making a judgement call, 123 times**: for each advanced capability, is this everyday or is this rare?

| domain | capabilities | tagged `full` | everyday core |
|---|---|---|---|
| finance | 70 | 48 | 22 |
| inventory | 51 | 33 | 18 |
| projects | 40 | 24 | 16 |
| files | 31 | 18 | 13 |

The criterion: core is CRUD plus the essential reads. Full is the advanced and the rare. Per-domain, core is **57–65% lighter**.

And then a detail that pays for the whole exercise: **the tiers had been inert.** The filter only applies to domains exposed as one-tool-per-action, and those domains hadn't been migrated yet. Tags existed, meant nothing, and nobody noticed — including a `docker.inspect_container` that had been tagged `full` specifically to keep a raw dump out of core mode. Migrating the domains **activated a security decision that had been sitting dormant**, without writing another line for it.

### The number that reordered the plan

My intuition was: migrate the infrastructure domains to per-action tools, and *while we're at it*, split core from full. Measured, it's the other way round.

| | tools | catalogue bytes | vs before |
|---|---|---|---|
| Before (6 fat tools) | 6 | 32,445 | — |
| **Core** (the new default) | 50 | **32,938** | **+1.5%** |
| Full (asked for on demand) | 88 | 48,161 | +48% |

The six infrastructure domains hold 88 capabilities between them. Migrating them to one tool per action **with full mode as the default** would have grown the catalogue by 48% — a straight regression. In core mode, 50 tools cost **the same** as the 6 fat ones did, and the model no longer has to guess its way through a 34-value action enum.

For the infrastructure agent — gemma, 80k window — that's **+1,083 tokens instead of +12,793.**

So the split isn't an optional optimisation layered on the migration. It's what makes the migration survivable. The comment now sits in the code where the default lives:

```
 * The six INFRASTRUCTURE manuals are the exception, and the reason is measured […]
 * In core they're 49 tools and cost the SAME as the six fat tools before (−0.1%) —
 * with the bonus that the 34-action enum the model had to guess through disappears.
```

### One default, one place

That default used to live copied in three separate files: the visibility calculation, the `TOOLS.md` generator, and the context-budget estimator. Now there's one function, with the reason attached:

```
 * Effective mode of ONE skill. Single source: the default lived copied in three
 * places (visibility, TOOLS.md and context budget) and with copies it's a matter
 * of time before the catalogue says one thing and the deny-list says another.
```

An agent whose catalogue and whose deny-list disagree is a bug that presents as "the model hallucinated a tool."

## ASKING FOR MORE, TEMPORARILY

Core mode raises an obvious question: what happens when an agent genuinely needs an advanced capability?

It asks. There's a capability for it (`skills.elevate`, approval level 2 — you get a card), and on approval the app moves to full mode and the deny-list is re-synced, so the complete tools enter the agent's context **on its next turn**.

The elevation is **ephemeral**, and that decision is worth more than the feature:

```
// The elevation is ephemeral, "until the session closes" […] with NO new table
// and no new cron.
// Gotcha: a Core restart loses this registry → the app stays 'full'
// (which is the system DEFAULT, harmless).
```

An in-memory registry keyed by conversation, reverted when the conversation is deleted. No migration, no scheduled job, and a failure mode that degrades to the pre-existing default instead of to something novel. Verified against the database and the runtime: core (33 tools denied) → elevate → full (0 denied).

## THE BAR THAT MADE IT VISIBLE

None of the above is usable without an answer to "how full is this agent right now?" So: an endpoint, and a bar in the dashboard, showing base + system prompt + apps + free space against the model's window.

The most important thing about it is what it refuses to do:

```ts
// It's ALL ESTIMATES: there's no tokenizer, so we use the ratios already established
// […] (prose /4) and the JSON tool schema (/1.3, denser).
// Fail-soft by construction: a missing workspace file counts 0; if the model's window
// can't be resolved, model_window stays null (it is NOT invented).

const CHARS_PER_TOKEN_PROSE = 4;
const CHARS_PER_TOKEN_SCHEMA = 1.3;
export const CONTEXT_BUDGET_BASE_TOKENS = 4000;
```

And the base:

```
 * Calibrated estimate of OpenClaw's "base" prompt + its NATIVE tool definitions […]
 * NOT measurable server-side: that text is injected by the runtime binary, not in any
 * file Core reads. Exposed as a CONSTANT and marked source:'estimate'.
```

In the dashboard that segment is drawn **striped**, so it looks like an estimate. A number that can't be measured shouldn't render identically to one that can — that's the difference between a budget and a guess with a progress bar.

The first agent we pointed it at was Francis, our coordinator, with nine apps in full mode:

```
91,000 / 80,000 tokens  ·  −11,000 over budget
```

Red. The offenders were finance (27k), projects (15k) and files (13k) — the exact three domains where core mode is worth the most.

That reading was taken before the catalogue cut landed. Pointing the same bar at the same agent today:

```
78,000 / 80,000 tokens  ·  97%  ·  free: 2,300
```

Still uncomfortably close to the ceiling — nine apps is a lot — but it now *fits*, which it didn't. The apps that remain expensive are the ones still defaulting to full mode: photos (15k), mail (8.6k), calendar (7.6k).

## THE BUG THAT DIDN'T EXIST

One more retraction, and this is my favourite.

While profiling, I noticed that gemma reported `usage.input` roughly double the previous call's usage, over and over. I diagnosed a phantom retry: something was silently re-sending the prompt, and we were paying twice for every turn.

Then I checked the correlation instead of trusting the story. Across a snapshot of turns:

- ratio ≈ 2.0 ⇔ **there was a tool call**: 11 out of 11
- no tool call: ratio 1.0, every time

There's no phantom retry. That's the **normal shape of a tool turn**: call one emits the tool call, call two reads the result and answers. `usage.input` is the sum of both. The system was working exactly as designed and I'd written a bug report about it.

The reframe is better than the bug would have been: since every prompt token is prefilled **twice** on a tool turn — and the local runtime doesn't reuse its KV cache between the two calls (`cacheRead: 0`) — **every token we removed from the catalogue is worth double.** The 45% cut isn't 45% of one prefill, it's 45% of two.

Which points at the next lever, and it isn't ours: getting the local runtime to reuse the KV prefix between those two calls. Same prompt, same tools, back to back.

## WHAT I'D DO DIFFERENTLY

**Read the trace before doing the arithmetic.** Both of my wrong conclusions came from estimating something that was written down exactly, in a file I already had. Estimation is for things you can't observe. The tool array sent to the model is observable.

**Check correlation before writing the bug report.** "usage doubles" was a real observation with a wrong explanation. Eleven data points took ten minutes and dissolved a bug I'd have spent days chasing.

**Look for mechanisms that exist and are inert before building new ones.** The tier system was fully built and doing nothing. If I'd designed a fresh one, I'd have shipped a second mechanism *and* left the dormant one to confuse the next person.

**Make estimates look like estimates.** The striped segment is four lines of CSS and it's the reason nobody will ever quote the base number as a measurement.

## HONEST CAVEATS

The 45% cut is verified live. The tiers are verified against the database and the runtime. The elevation cycle is verified at the database and runtime level — **not** end-to-end in a real chat conversation, which is a different thing and I'm not going to claim it. Non-infrastructure apps still default to full; only the six infrastructure ones default to core. And there's no measurement here in euros or in latency: this post is about bytes and estimated tokens, which is what we could actually measure.

## THE TAKEAWAY

The engineering was subtraction: two empty `.describe()` calls and one paragraph moved to where it belonged, for 45% of the catalogue.

The expensive part was retracting two confident conclusions and one bug that didn't exist — all three of which came from reasoning about numbers I could have read directly.

**If a number matters enough to act on, find where the system writes it down.**

---

*Next up: the seven agents from [#15](/blog/multi-agent-topology) now fit in the window. What happens when you ask them to work on the same thing at the same time?*
