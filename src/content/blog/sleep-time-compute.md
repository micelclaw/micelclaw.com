---
title: "#09 — Sleep-time compute for personal data: what your AI should do while you sleep"
description: "Most personal AI systems sit idle 95% of the time. We built a background intelligence engine that discovers cross-domain connections, learns your preferences, and pre-computes insights — all while you're not using it."
date: 2026-03-26
author: "Víctor"
tags: ["ai", "architecture", "postgresql", "selfhosted"]
---

Your personal AI assistant sits idle most of the day. You send it a message, it responds, then it waits. For hours. Maybe all night. The compute is there — the model is loaded, the database is running, the server is warm. But nothing happens until you type the next message.

That's test-time compute: work done when the user asks for it. Letta's research (arXiv:2504.13171) showed that shifting processing to idle periods — sleep-time compute — achieves 5× fewer tokens at test time and 15% more correct answers. But their implementation only processes conversation memory. Nobody had applied it to structured personal data.

We did.

## The idea

Instead of the agent doing all its thinking when you ask a question, it does most of the thinking in the background — during idle periods when you're not using the system. When you finally ask "what's going on with Project Tempest?", the answer is already half-assembled.

The system maintains four background jobs that run every 30 minutes, but only when you're idle:

| Priority | Job | What it does |
|----------|-----|-------------|
| 1 | Enrich connections | Finds hot records with few graph links, re-runs entity extraction |
| 2 | Generate summary | Compiles a weekly overview from the change log |
| 3 | Detect patterns | Discovers entities that co-occur but aren't linked |
| 4 | Update preferences | Learns behavioral patterns from your data |

Each job consumes tokens from a configurable budget (default: 5,000 tokens per execution). When the budget runs out, lower-priority jobs get skipped. This means enriching connections (the most impactful job) always runs, while preference learning (the least time-sensitive) gets skipped first if resources are tight.

## The trigger: idle detection

The engine only runs when you're not using the system. If you're actively writing notes or reading emails, the background jobs wait. This matters for two reasons:

1. **Resource contention.** The LLM (whether local via Ollama or remote via API) is a shared resource. Background jobs competing with user requests for model access would add latency to the interactions you actually care about.

2. **Relevance.** Sleep-time processing works on data that has settled. Running entity extraction on a note you're still editing wastes tokens — the note will change again in 30 seconds. Waiting until you're idle means processing stable data.

The idle detector is simple: if no user activity (API requests from the dashboard, agent messages, WebSocket heartbeats) has occurred in the last N minutes, the user is idle. The scheduler checks this condition before executing each run.

## Job 1: Enrich connections

The highest-priority job. It finds records that are "hot" (recently accessed, heat score > 0.3) but poorly connected in the knowledge graph (fewer than 3 entity links). These are records you care about but that the system doesn't fully understand yet.

Here's what the query returned on a real run:

```
Optimal Fuse Burn Rate Calculations v3    heat: 0.5  links: 2
Recipe: Rodney's Smoked Eyebrows Marinade heat: 0.5  links: 2
Banned Substances List (and Why Rodney…)  heat: 0.5  links: 2
```

Three notes flagged. Each has a warm heat score (recently accessed) but only 2 entity links where the average for this user is 5+. The initial extraction caught the obvious entities, but a second pass might find connections to people, projects, or locations that were mentioned implicitly.

The engine re-enqueues them to the async extraction pipeline at `priority: low` — they won't compete with real-time user actions. When the extraction worker picks them up, it sends the full note content to the LLM for a more thorough entity pass than the initial CRUD hook provides.

Why prioritize this job? Because the knowledge graph is the foundation of search ranking, the digest engine, and the agent's contextual awareness. A poorly connected hot record means the system is blind to something you're actively working on. Enriching it improves everything downstream.

Cost on this run: **600 tokens** (3 records × ~200 tokens each). Execution time: **16ms** (just the enqueue — the actual extraction happens later).

## Job 2: Generate summary

Aggregates a week of change log activity and the most active entities from the knowledge graph into a single pre-computed insight.

On this run, the change log query returned:

```
files:        201 inserts, 5 updates, 152 deletes
rss:          141 inserts
emails:       61 inserts, 32 updates, 7 deletes
notes:        2 updates
kanban_cards: 1 update
```

And the top graph entities by recent activity:

```
Madrid              (location)      28 mentions
micelclaw           (organization)  12 mentions
Meta Platforms, Inc.(organization)   7 mentions
Instagram           (location)       6 mentions
Victoria            (person)         1 mention
```

Two things jump out. First: 201 file inserts and 152 file deletes in one week — that's a bulk operation or a sync cycle, not manual activity. The summary captures this so the agent can mention it if asked "what happened this week?" without scanning 600+ change log rows at query time.

Second: "Instagram" classified as a location is an entity extraction error — the kind of noise the enrichment job (Job 1) and the merge candidates system are designed to catch over time.

The summary gets stored as a `weekly_summary` insight with a 7-day TTL. No LLM call needed — it's pure SQL aggregation.

Cost on this run: **50 tokens** (fixed). Execution time: **14ms**.

## Job 3: Detect patterns

The most interesting job. It self-joins `entity_links` to find pairs of entities that co-occur in 3 or more records but have no direct link between them — latent connections nobody made explicit.

On this run, five patterns emerged:

```
Rodney ↔ Dolores     co-occur in 12 records, no direct link
Rodney ↔ Linda       co-occur in 11 records, no direct link
Rodney ↔ BoomClaw    co-occur in 10 records, no direct link
Warehouse B ↔ Rodney co-occur in 10 records, no direct link
Benny ↔ Rodney       co-occur in 10 records, no direct link
```

Every pattern radiates from "Rodney" — he's a hub entity that appears alongside four other entities across 10-12 records without any direct graph edge connecting them. The extraction pipeline created links from each note/email to "Rodney" and to "Dolores" independently, but never linked Rodney to Dolores directly. The co-occurrence pattern reveals the relationship that was hiding in plain sight.

Each pair becomes a `connection_discovered` insight with a 14-day TTL. The next time you search for "Rodney," the graph traversal finds Dolores, Linda, BoomClaw, Warehouse B, and Benny — even though no single record ever says "Rodney works with Dolores."

This is the job that produces the "how did it know that?" moments. The answer is always the same: it counted co-occurrences while you weren't looking.

The query itself — a self-join on `entity_links` filtered by `NOT EXISTS` — took **138ms**. That's the heaviest operation in the pipeline, and it runs during idle time where nobody notices. At query time, the connections are already in the graph.

Cost on this run: **30 tokens** (fixed — pure SQL, no LLM).

## Job 4: Update preferences

The system learns behavioral patterns by analyzing your data over time. On this run, two patterns were detected:

**Writing time distribution (last 30 days):** All 50 notes created at hour 12 UTC. That's not a preference — that's a signal so strong it maxed out confidence immediately. The system now knows that if you're going to write a note, it's probably at noon.

**Tag frequency:**

```
safety: 11, personal: 9, r-and-d: 6, strategy: 5, humor: 5
```

Both get persisted via UPSERT with incremental confidence — each observation nudges the score up by 0.05, capped at 0.95. After multiple runs, the preferences look like this:

```
scheduling / preferred_writing_hour = "12"
  confidence: 0.95 (max), evidence: 20,650 observations

organization / preferred_tags = ["safety","personal","r-and-d","strategy","humor"]
  confidence: 0.95 (max), evidence: 417 observations
```

The agent uses these when it needs to make decisions. Scheduling a reminder? It knows noon is when you're active. Suggesting tags for a new note? It offers your most-used tags first. Creating a diary entry template? It matches your writing style.

If a preference is wrong, you delete it via the API. The system may re-learn it later if the pattern persists, but with reduced confidence — the deletion counts as negative feedback.

Cost on this run: **20 tokens** (fixed — pure SQL, no LLM).

## The real numbers: 700 tokens, 184 milliseconds

Here's the actual pipeline summary from the run above:

```
┌────────────────────┬────────┬────────┬───────────────────────────────┐
│ Job                │ Tokens │ ms     │ Output                        │
├────────────────────┼────────┼────────┼───────────────────────────────┤
│ enrich_connections │ 600    │ 16     │ 3 notes re-enqueued           │
│ generate_summary   │ 50     │ 14     │ 1 weekly_summary insight      │
│ detect_patterns    │ 30     │ 138    │ 5 connection_discovered       │
│ update_preferences │ 20     │ 16     │ 2 preferences updated         │
├────────────────────┼────────┼────────┼───────────────────────────────┤
│ Total              │ 700    │ 184    │                               │
└────────────────────┴────────┴────────┴───────────────────────────────┘
```

700 out of the 5,000 token budget — 14%. The full pipeline completed in under 200 milliseconds. Three of the four jobs are pure SQL with zero LLM calls. Only `enrich_connections` queues work for the model, and even that just enqueues — the actual extraction runs later at low priority.

Every execution gets logged to `sleep_time_jobs` for auditability. If a job fails, the error is recorded and the next job still runs — the pipeline is fault-tolerant by design.

## The token budget: sleep-time vs test-time

Every sleep-time execution has a capped budget — 5,000 tokens by default, configurable per user. This prevents runaway costs from background processing. The jobs run in priority order and stop when the budget is exhausted.

The insight from Letta's research holds: spending tokens during idle time dramatically reduces what you need to spend during active conversations. When the agent already knows that Rodney is connected to Dolores across 12 records (because Job 3 discovered it overnight), answering "who works with Rodney?" costs a graph traversal query (~5ms) instead of a full cross-domain LLM analysis (~3,000 tokens).

We track sleep-time and test-time token usage separately in the token metrics dashboard, so you can see the trade-off directly: more sleep-time tokens → fewer test-time tokens → faster, cheaper responses.

## The three-stage digest

The sleep-time engine powers an evolved version of the Digest Engine — the system that tells the agent "here's what changed since you last checked."

The original digest was simple: scan the change log, format a markdown file, write it to the agent's workspace. The agent reads it on the next heartbeat.

The v2 digest is a three-stage pipeline:

**Stage 1 — Selection.** Filter changes by relevance using configurable rules stored in a `digest_rules` table. VIP emails (from your boss, from specific contacts) trigger immediate notification via PostgreSQL LISTEN/NOTIFY. Routine changes (a synced contact updated its phone number) get buffered for the periodic digest.

**Stage 2 — Correlation.** Use the LLM to discover cross-domain connections between changes. "You received an email from Ana García. Ana is attending tomorrow's meeting. You have 2 unfinished notes about the project she's working on." This stage is why sleep-time matters — the correlation discovery happens in the background, not when the agent is trying to respond to you.

**Stage 3 — Scoring.** Rate each item by urgency, cross-domain relevance, and historical feedback (did the user act on similar insights before?). The output shifts from "what changed" to "what matters and why."

The scored digest gets written to DIGEST.md in the agent's workspace. The agent reads it and decides what to surface. Urgent items might trigger an immediate notification. Low-score items accumulate for a daily summary.

## The world model

One output of the sleep-time engine is a materialized "world model" — a living document that summarizes your current state:

- Active projects and their status
- Key people and recent interactions
- Upcoming deadlines and events
- Behavioral patterns and preferences

The world model is updated incrementally. Each sleep-time run only modifies the sections affected by recent changes. The agent references it as persistent context — a pre-computed summary of "what's going on in your life right now" that doesn't need to be recomputed every conversation.

This is inspired by Daniel Miessler's PAI framework (MISSION.md, GOALS.md, PROJECTS.md pattern), adapted to structured data. Instead of the user maintaining these documents manually, the system generates them from real data.

## Zero cost when idle

The most important design decision: when nothing has changed, the engine does nothing. Zero tokens. Zero queries. The scheduler checks for pending changes in the change log before executing any job. No changes → skip the entire run.

This means the system's cost is proportional to your activity, not to time. A weekend where you don't use the system costs nothing. A busy Monday with 50 emails and 10 notes triggers multiple enrichment passes. The cost follows the value.

Similarly, the digest delivery to the agent is conditional. No changes → no DIGEST.md written → no system event → the agent doesn't wake up → zero tokens consumed. This was a deliberate choice over a heartbeat model where the agent would check for updates periodically regardless.

## What I'd do differently

**I'd add entity type validation in the summary job.** The real run showed "Instagram" classified as a `location` — a clear extraction error that propagated into the weekly summary. A simple validation step (is this entity type plausible for this name?) would catch obvious misclassifications before they pollute insights. The data exists to fix this; we just haven't built the filter yet.

**I'd build the pattern detection job first, not the enrichment job.** Enrichment (Job 1) improves the knowledge graph incrementally. Pattern detection (Job 3) produces visible, surprising insights that users actually react to. "Ana García is connected to Project Tempest" is a moment of delight. "We added 2 more entity links to your note about Tempest" is invisible maintenance. Leading with delight would have made the sleep-time engine feel valuable sooner.

**I'd make the token budget adaptive.** Right now it's a flat 5,000 tokens per run. A smarter approach: scale the budget with the amount of pending work. 3 new records → 1,000 tokens. 50 new records after a sync → 10,000 tokens. The budget should match the opportunity, not be a fixed ceiling.

**I'd add a "sleep-time log" visible in the dashboard.** Currently, the only way to see what the engine did is through the insights API and the sleep_time_jobs table. A visible log ("Last night I discovered 3 new connections, updated 2 preferences, and generated your weekly summary") would build trust and make the background processing feel tangible.

## The takeaway

A personal AI system that only works when you talk to it is wasting 95% of its available compute. The data is sitting in PostgreSQL. The model is loaded in Ollama. The knowledge graph has gaps that a 30-token LLM call could fill. Why wait for the user to ask?

Sleep-time compute shifts the work from "the user asked a question and now we scramble" to "we already know the answer because we connected the dots overnight." Four jobs, a token budget, an idle detector, and a three-stage digest pipeline. The system gets smarter while you sleep.

The insight that makes it all work: spending tokens when nobody is waiting for a response is categorically cheaper — in latency, in user experience, and in total cost — than spending them when someone is staring at a loading spinner.

---

*Next up: PII-aware routing — how we send sensitive data to local models and everything else to the cloud, without the user having to think about it.*
