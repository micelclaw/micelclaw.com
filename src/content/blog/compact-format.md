---
title: "From JSON to compact: reducing API payloads 60% for LLM consumption"
description: "Your AI agent doesn't need pretty JSON. We built a compact response format that cuts token usage dramatically — and learned what to kill along the way."
date: 2026-03-19
author: "Víctor"
tags: ["api", "ai", "typescript", "architecture"]
---

Every time your AI agent calls your API, it pays for the response in tokens. Not just the useful data — every `"id":`, every `"created_at":`, every `null` field it didn't ask for. JSON is designed for humans reading documentation, not for LLMs processing structured data.

We measured our API responses before optimization. A typical "show me my events today" call returned 3 events in ~1,200 tokens. After compact format: ~280 tokens. Same information, 77% fewer tokens.

This post is about how we built that format, what we tried and killed, and the surprising insight that changed how we think about API design for agents.

## The problem: JSON is expensive

Here's what a standard events response looks like:

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Standup",
      "description": null,
      "location": "Discord",
      "start_at": "2026-02-18T09:00:00Z",
      "end_at": "2026-02-18T09:30:00Z",
      "all_day": false,
      "recurrence": {"freq": "weekly", "days": ["mon","wed","fri"]},
      "status": "confirmed",
      "source": "google",
      "source_id": "abc123",
      "calendar_name": "Work",
      "reminders": null,
      "attendees": null,
      "custom_fields": null,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-02-17T10:00:00Z",
      "synced_at": "2026-02-18T06:00:00Z",
      "deleted_at": null
    }
  ],
  "meta": {"total": 1, "limit": 20, "offset": 0},
  "tier": "free"
}
```

One event. 18 fields. Of those, the agent needs maybe 5 to answer "what's on my calendar?": title, start time, end time, location, and whether it recurs. The other 13 fields — nulls, internal IDs, sync timestamps — are noise.

Multiply this by 20 events and every API call burns tokens on data the agent will never use.

## The solution: `?format=compact`

Add one query parameter and the response transforms entirely:

```
GET /api/v1/events?date=today&format=compact
```

```json
{
  "format": "compact",
  "summary": "3 events (today)",
  "lines": [
    "09:00-09:30 Standup [Discord] 🔁 id:550e8400",
    "14:00-15:00 Comida con Ana [La Mar] id:660e8400",
    "📅 all-day: Cumple Mamá id:770e8400"
  ],
  "ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001",
    "770e8400-e29b-41d4-a716-446655440002"
  ],
  "meta": {"total": 3, "limit": 20, "offset": 0, "has_more": false}
}
```

Three events in under 300 tokens. The agent can read the `summary` line and respond "You have 3 events today" without parsing anything. If it needs to modify an event, the `ids` array has the UUIDs in the same order as the lines.

Each domain has its own line format:

| Domain | Line format | Example |
|--------|------------|---------|
| Events | `HH:MM-HH:MM title [location] 🔁` | `09:00-09:30 Standup [Discord] 🔁` |
| Notes | `📌 "title" (tags) [relative_date]` | `📌 "Meeting notes Q1" (trabajo) [2w ago]` |
| Emails | `from: "subject" [FOLDER] status 📎` | `Juan: "Budget Q3" [INBOX] unread 📎` |
| Contacts | `name — company — email` | `Ana García — TechCorp — ana@tech.com` |
| Files | `filename (size) [type]` | `report.pdf (2.3MB) [pdf]` |
| Diary | `date mood "preview"` | `2026-02-18 😊 "Great day at the office..."` |

The line templates are fixed per domain. They include exactly the fields an agent needs for a conversational summary, and nothing else.

## What the agent does with it

The key insight is progressive disclosure. Compact format is the first step; full JSON is the second.

```
User: "What's on my calendar today?"
Agent: GET /events?date=today&format=compact
       → reads summary: "3 events (today)"
       → responds: "You have 3 events today: Standup at 9, Comida con Ana at 2, and it's Mamá's birthday."

User: "Move the lunch to 3pm"
Agent: PATCH /events/660e8400-e29b-41d4-a716-446655440001
       → body: {"start_at": "2026-02-18T15:00:00Z", "end_at": "2026-02-18T16:00:00Z"}
```

The agent used compact for the listing (cheap) and a direct PATCH for the mutation (needs the UUID, which compact provides). It never needed to fetch the full JSON for any event.

Every skill instructs the agent to use `?format=compact` for listings and `GET /:id` (full JSON) only when it needs details about a specific record. This pattern — compact for browse, full for drill-down — is progressive disclosure implemented through the API, not the UI.

## What we tried and killed

Before arriving at compact format, we explored three ideas. All of them died.

### TOON (Token-Oriented Object Notation)

TOON is a serialization format designed for LLMs. It defines headers once and streams rows — like a TSV with a schema preamble. Research claims 30-60% fewer tokens than JSON.

We evaluated it and dropped it. The savings over our compact format were marginal (~3-5 tokens per line), but TOON introduced real problems: special characters need escaping, the parser has to handle edge cases with newlines in content, and the agent needs to understand a custom format instead of reading natural-language lines.

Compact lines are readable in English (or Spanish). TOON rows are not. For an LLM, readability matters more than raw compression.

### Token Budget (`?token_budget=N`)

The idea: tell the server "I have 500 tokens left, fit the response in that." The server would progressively reduce fields, then limit results, then summarize content to fit within the budget.

We killed it because it violates separation of responsibilities. The server doesn't know which fields matter to the agent in a given context. Sometimes the agent needs attendees and not descriptions. Sometimes the reverse. Making the server decide which fields to cut is a design smell.

The agent already has `?fields=`, `?limit=`, and `?format=compact` to control granularity. It doesn't need the server to guess on its behalf.

### Semantic cache (pgvector similarity)

The idea: cache API responses by query embedding. If a new query is semantically similar to a cached one, return the cached response. Research shows 31% of queries are semantically similar.

For a single-user personal system, the hit rate would be 5-15% at best. And the overhead of embedding each query (50-200ms via Ollama) is slower than just running the database query directly (5-20ms). We'd be adding latency to save latency.

We kept the SHA-256 exact-match cache as a possibility for the future (when the sleep-time engine starts making repetitive queries), but the semantic layer was pure overhead.

## Diff-aware responses: `?since=`

Compact format reduces the size of each response. But there's another dimension: reducing how often the agent needs to ask at all.

The `?since=` parameter lets the agent say "I last checked at 14:00 — what changed?"

```
GET /api/v1/events?since=2026-02-18T14:00:00Z
```

```json
{
  "data": {
    "created": [],
    "updated": [
      {"id": "660e8400-...", "title": "Comida con Ana", "start_at": "2026-02-18T15:00:00Z"}
    ],
    "deleted": []
  },
  "meta": {
    "response_timestamp": "2026-02-18T14:35:00Z",
    "total_changes": 1
  }
}
```

The agent stores the `response_timestamp` from each call and passes it as `?since=` next time. If nothing changed, the response is essentially empty. The response_timestamp is captured before the query executes — conservative by design, so changes are never lost (at worst, the agent sees a duplicate).

Combined with compact format, the pattern becomes:

1. First call: `GET /events?format=compact` → full compact listing
2. Subsequent calls: `GET /events?since=<last_timestamp>` → only changes
3. If changes exist and agent needs context: `GET /events/:id` → full detail on specific records

For a system where the agent polls every 30 minutes and maybe 2 records changed, this turns a 1,200-token response into a 150-token one.

## Token counting: the `X-Token-Count` header

Every response includes an `X-Token-Count` header with the approximate token count of the response body. It's a heuristic (±15% accuracy), not an exact count — we use character-based estimation rather than running a tokenizer on every response.

The agent doesn't make binary decisions based on this number. It's informational — "this response cost me approximately 450 tokens" — so the agent can track its consumption over time and adjust strategy. If it notices that contacts responses are consistently heavy, it might switch to compact or reduce limits.

We briefly considered using tiktoken for exact counting and decided against it. The precision wasn't worth the overhead on every response, and the agent doesn't need exact numbers — it needs a signal.

## The numbers

Measured across 7 domain endpoints with realistic data volumes:

| Domain | JSON (tokens) | Compact (tokens) | Reduction |
|--------|--------------|-------------------|-----------|
| Events (10) | ~4,200 | ~800 | 81% |
| Notes (10) | ~5,800 | ~1,200 | 79% |
| Emails (10) | ~8,500 | ~1,500 | 82% |
| Contacts (10) | ~3,200 | ~900 | 72% |
| Files (10) | ~2,800 | ~700 | 75% |
| Diary (10) | ~4,000 | ~1,100 | 73% |
| Search (10) | ~6,000 | ~1,000 | 83% |

Average reduction: ~78%. The title says 60% because that's the conservative number for small result sets (3-5 records). As result sets grow, the savings compound.

Emails save the most because they have the most fields (30+ columns, most of which are null for any given record). Contacts save the least because they're already relatively compact in JSON.

## Design decisions worth noting

**Compact and `?fields=` are mutually exclusive.** Compact templates are fixed per domain. Allowing custom field selection within compact would mean building a dynamic template engine — complexity for a feature nobody asked for. If you need specific fields, use `?fields=`. If you need minimal tokens, use `?format=compact`. Not both.

**Compact is ignored silently on non-list endpoints.** `GET /notes/:id?format=compact` returns normal JSON. No error, no warning. The agent shouldn't need to remember which endpoints support which formats — it just adds `format=compact` to everything and the server does the right thing.

**Errors are always full JSON.** Even with `?format=compact`, errors return the standard error envelope with code, message, details, and hint. The agent needs structured error information more than it needs minimal tokens in failure cases.

**The `ids` array is the bridge.** The compact lines are for the LLM to read and summarize. The `ids` array is for the LLM to act — it maps 1:1 to the lines, so "the second event" maps to `ids[1]`. This dual-track design (human-readable lines + machine-actionable IDs) is what makes compact format actually useful rather than just cheap.

## What I'd do differently

**I'd build compact format before anything else.** We built it during the API Intelligence phase (Cluster A), but it should have been in Phase 1. Every skill we wrote before compact format included verbose JSON examples that the agent had to parse. The day we shipped compact, we updated every skill to use it and immediately saw lower latency and better agent responses.

**I'd kill more ideas faster.** TOON, token budget, and semantic cache each took a design session to spec out and a decision to kill. The design sessions weren't wasted — they clarified what we actually needed — but we could have killed them in 30 minutes of back-of-envelope calculation instead of writing full specs.

## The takeaway

If you're building an API that LLM agents will consume, you're probably shipping too much data. JSON is great for browsers and SDKs. It's terrible for language models that pay per token.

The fix is embarrassingly simple: a query parameter that switches the response format from structured objects to human-readable lines with an ID array. Fixed templates per domain. No custom serializer, no protocol change, no content negotiation. Just a different `if` branch in your response handler.

The deeper insight: the agent doesn't need your data model. It needs a summary it can repeat to the user and IDs it can use to take action. Everything else is overhead.

---

*Next up: your AI agent is wasting 90% of its tokens — and it's not the API's fault. It's the skills.*
