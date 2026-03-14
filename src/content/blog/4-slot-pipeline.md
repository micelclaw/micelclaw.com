---
title: "The 4-slot hook pipeline: how every CRUD operation feeds four systems at once"
description: "A simple post-CRUD pipeline that feeds embeddings, heat tracking, entity extraction, and the changelog — without any of them blocking each other or the user."
date: 2026-03-14
author: "Víctor"
tags: ["architecture", "postgresql", "typescript", "ai"]
---

Here's a problem that sneaks up on you when you're building a data-heavy application: every time you create or update a record, a bunch of other things need to happen. The record needs to be embedded for semantic search. Its heat score needs to be updated. Entities (people, places, projects) need to be extracted from the text. And the change needs to be logged so the digest engine knows what happened.

The naive approach is to do all of that inline — right there in the route handler, after the INSERT. We tried that. It was a mistake.

This post is about the pipeline we built to replace it.

## The problem with inline processing

Our first version of the notes endpoint looked something like this:

```typescript
// The "just do it all here" approach
app.post('/notes', async (req, reply) => {
  const note = await db.insert(notes).values(req.body).returning();

  // Now embed it...
  const text = note.title + ' ' + note.content;
  const embedding = await ollama.embed(text);  // 50-200ms
  await db.insert(embeddings).values({ domain: 'notes', recordId: note.id, embedding });

  // Log the change...
  await db.insert(changeLog).values({ domain: 'notes', recordId: note.id, action: 'create' });

  reply.send({ data: note });
});
```

Two problems. First, if Ollama is down or slow, the user waits. Or worse, the request fails — even though the note was already saved. Second, this same embedding + changelog logic needs to exist in every single route handler. Notes, events, contacts, emails, files, diary entries. That's a lot of duplicated code that's going to drift.

And we hadn't even added heat tracking or entity extraction yet. Those would be two more blocks of code copy-pasted across every route.

## The pipeline

We replaced all of that with a single function call: `runPostHooks(ctx)`.

Every domain route — notes, events, contacts, emails, files, diary entries — calls it after the database operation succeeds. It looks like this:

```
handler    → INSERT/UPDATE/DELETE in domain table
              ↓
postHandler → runPostHooks(ctx)
              ↓
           ┌─────────────────────────────────────────┐
           │  Slot 1: Embedding (enqueue async job)  │
           │  Slot 2: Heat tracking (upsert, <1ms)   │
           │  Slot 3: Entity extraction (enqueue)     │
           │  Slot 4: Changelog (fire-and-forget)     │
           └─────────────────────────────────────────┘
```

Each slot runs inside its own try/catch. If slot 1 fails (Ollama is down), slot 2 still runs. If slot 3 throws (extraction model crashed), slot 4 still logs the change. The user's response is never affected — the INSERT already happened, the reply already went out.

Here's the context object that every slot receives:

```typescript
interface CrudHookContext {
  domain: string;      // 'notes', 'events', 'contacts', ...
  action: 'insert' | 'update' | 'delete';
  recordId: string;
  userId: string;
  source: HeatSource;  // 'user_dash', 'sync', 'agent_primary', ...
  record?: Record<string, any>;
}
```

That's it. Every slot knows what happened (action), to what (domain + recordId), by whom (userId), and through which channel (source). The `record` field carries the full row for slots that need to extract text from it.

## What each slot does

### Slot 1: Embedding

Extracts text from the record and enqueues an async job. The enqueue itself takes ~0.1ms — the actual embedding generation happens later in the background via the AsyncQueue.

The text extraction is domain-specific:

| Domain | What gets embedded |
|--------|-------------------|
| notes | title + content |
| events | title + description + location |
| contacts | display_name + company + job_title + notes |
| emails | subject + body_plain |
| files | filename + extracted content (if available) |
| diary | date + content |

The AsyncQueue processes jobs sequentially through an Ollama client with a semaphore (concurrency=1). Embeddings get high priority. If Ollama is unreachable, the job is retried 3 times with exponential backoff, then dropped with a log entry. The record is still fully usable — it just won't appear in semantic search until the next successful embed.

### Slot 2: Heat tracking

A single upsert to the `record_heat` table: increment `access_count`, update `last_accessed`, recalculate the heat score. Under 1ms. This is the cheapest slot by far, but it powers the entire memory tier system — hot, warm, and cold records that influence search ranking and the digest engine.

One detail: heat tracking only fires on create and update operations from the user. Sync imports use `source: 'sync'`, which the heat system treats differently (lower initial heat, since the user didn't actively create the record).

### Slot 3: Entity extraction

Enqueues an async job (same AsyncQueue as embeddings, but lower priority). The extraction worker sends the record's text to an LLM and gets back a structured list of entities — people, projects, locations, topics — that become nodes in the knowledge graph.

Each domain has different extraction behavior:

- **Notes, emails, diary entries**: Full LLM extraction from text content
- **Contacts**: No LLM needed — the contact's structured data (name, email, company) directly becomes a Person node in the graph
- **Events**: Attendees are resolved directly against existing graph entities by email/name; the rest goes through LLM

Entity extraction runs with lower priority than embeddings because it's more expensive (1-10 seconds per record vs ~50ms for an embedding) and less time-sensitive. The graph can be a few seconds behind without anyone noticing.

### Slot 4: Changelog

A simple INSERT into the `change_log` table. Domain, record ID, action, user ID, timestamp, and a human-readable summary generated by `extractSummary()`:

| Domain | Summary format |
|--------|---------------|
| notes | Note title |
| events | Event title + formatted start date |
| contacts | Display name |
| emails | Subject line |
| files | Filename |
| diary | Date + content preview (first 100 chars) |

The Digest Engine reads this table periodically and compiles a summary of what changed: "3 new emails, 1 event moved, 2 notes created." It's the backbone of the proactive notification system.

## The design that anticipated growth

Here's the thing we got right, almost by accident: the slots were designed to be filled in later.

When we first built the pipeline in Phase 4, only two slots were active:

| Slot | Phase 4 | After Cluster B |
|------|---------|-----------------|
| 1 | ✅ Embedding | ✅ Embedding |
| 2 | 🔒 Reserved (no-op) | ✅ Heat tracking |
| 3 | 🔒 Reserved (no-op) | ✅ Entity extraction |
| 4 | ✅ Changelog | ✅ Changelog |

Slots 2 and 3 were literally empty functions — registered in the pipeline to document the execution order and reserve their position. When Cluster B (the data foundation for the knowledge graph and heat scoring) was implemented weeks later, those slots got filled in without touching a single line of the existing pipeline code or any route handler. No refactoring. No merge conflicts.

This worked because the pipeline was designed around the `CrudHookContext` interface. Every slot receives the same context. Adding a new slot means writing a function that takes `CrudHookContext` and does something with it. That's the entire contract.

## What happens per HTTP verb

Not every verb triggers every slot. Deleting a record doesn't need a new embedding. Listing records doesn't need heat tracking (only individual GETs do).

```
POST (create):  → Slot 1 (embed) → Slot 2 (heat: count=1) → Slot 3 (extract) → Slot 4 (log)
GET /:id (read): → Slot 2 (heat: count++) only
PATCH (update): → Slot 1 (re-embed) → Slot 2 (heat: count++) → Slot 3 (re-extract) → Slot 4 (log)
DELETE (soft):  → Slot 4 (log) only
GET / (list):   → nothing
```

Deletes don't re-embed or re-extract — the record is conceptually gone (soft-deleted). The heat cron will naturally cool it down. Listing doesn't trigger hooks at all — only individual record access bumps heat.

## The Ollama bottleneck

All AI-powered slots (embedding and extraction) funnel through a single Ollama instance with a priority queue and a semaphore (concurrency=1). This sounds like a bottleneck, and it is — by design.

Ollama running a 0.6B embedding model (`qwen3-embedding:0.6b`, 1024 dimensions) on a mini-PC can handle one job at a time reliably. Trying to parallelize would thrash the CPU and make everything slower. Sequential processing with priority ordering (embeddings first, extraction second) gives predictable latency:

- Embedding: ~50ms per record
- Entity extraction: 1-10 seconds per record (done by the same vision model that describes photos — `qwen3-vl:2b` — because running a single multimodal model saves RAM versus having separate text-only and vision models)

When the user creates a note, the embedding is ready in under a second. The entity extraction might take a few more seconds, but the knowledge graph being slightly behind is invisible to the user.

If Ollama is completely down, everything still works. The CRUD succeeds. The changelog is written. The heat is tracked. Only semantic search and the knowledge graph are degraded, and they'll catch up when Ollama comes back online thanks to the reindex endpoint.

## Why not database triggers?

PostgreSQL triggers could do some of this — especially the changelog. We considered it and decided against it for three reasons:

1. **Triggers can't call external services.** Embedding requires Ollama. Entity extraction requires an LLM. Triggers are stuck inside the database.

2. **Error handling is all-or-nothing.** A failing trigger rolls back the entire transaction. Our pipeline explicitly allows individual slot failures without affecting the core operation.

3. **Visibility.** Application-level hooks are easy to debug, log, and monitor. Trigger debugging is... less fun.

The changelog could legitimately be a trigger. But keeping all four slots in the same application-level pipeline means they're all visible in one file, they share the same error handling pattern, and they can be toggled or reordered without touching the database.

## The payoff

The 4-slot pipeline is maybe 200 lines of code. It replaced thousands of lines of duplicated inline processing across every route handler. Every new domain we add — kanban cards, RSS feed articles, bookmarks — gets embeddings, heat tracking, entity extraction, and changelog for free by adding one `runPostHooks(ctx)` call.

More importantly, it created clean extension points. When we needed PII-aware routing (Cluster E), it was a middleware in the preHandler — not a new slot. When we needed sleep-time intelligence (Cluster D), it consumed the changelog and heat data that the pipeline was already producing. The pipeline doesn't just feed four systems — it feeds the systems that feed the systems.

---

*Next up: how a 0.6B parameter model turned out to be better than we expected for entity extraction — and why bigger isn't always faster when skill context is the bottleneck.*
