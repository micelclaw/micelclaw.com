---
title: "#07 — Your AI agent is wasting 90% of its tokens on field names"
description: "We audited our agent's token consumption and found that 25% of the context window was skills, 10% was identity files, and the actual user message was a rounding error. Here's what we did about it."
date: 2026-03-20
author: "Víctor"
tags: ["ai", "architecture", "llm", "optimization"]
image: "/images/agent-tree.png"
---

We built the compact API format (previous post) and felt good about ourselves. API responses were 78% smaller. Tokens saved. Problem solved.

Then we actually measured where our agent's tokens were going.

The API responses weren't the problem. The skills were.

## The audit

We ran a token audit across all 31 skills in the system. Here's what we found:

**Main agent (Francis) — 11 skills loaded:**
- `always:true` skills (injected on every single message): **~17,500 tokens**
- Total including on-demand skills: **~20,600 tokens**

**Global (all 31 skills across all agents):**
- `always:true` skills (12 total): **~27,500 tokens**
- All skills combined: **~50,000 tokens**

That's 25% of Sonnet's context window consumed by skills alone. Before the user says a word. Before the agent reads a single note or email. A quarter of the available context is just instructions on how to call APIs.

Add the workspace identity files — SOUL.md, IDENTITY.md, USER.md, TOOLS.md, AGENTS.md, BOOTSTRAP.md — and you're looking at another 3-5K tokens. So the agent starts every conversation with roughly **20-22K tokens of system prompt**. That's over 10% of the context window, gone.

The user's actual message? Usually 20-50 tokens. A rounding error.

## The top 5 offenders

| Skill | always | Tokens |
|-------|--------|--------|
| claw-search | true | ~5,100 |
| claw-hal | true | ~4,200 |
| claw-approvals | true | ~3,050 |
| claw-files | true | ~2,850 |
| claw-mail | true | ~2,780 |

`claw-search` alone burns 5,100 tokens every message. It's the biggest skill because it handles cross-domain search routing — deciding whether to query the user's data (notes, emails, contacts) or the agent's own workspace memory. That routing logic is complex and takes words to explain.

`claw-hal` (hardware abstraction — storage, docker, network) is second because it covers multiple subsystems. When someone asks "how's my disk?", HAL needs to know about volumes, SMART data, mount points, and Docker containers. That's a lot of endpoints.

## Why this matters more than API response size

Think about the token flow of a typical interaction:

```
User: "What meetings do I have today?"

System prompt:  ~20,000 tokens (skills + identity)
User message:        ~8 tokens
API call:          ~300 tokens (compact format response)
Agent response:     ~50 tokens
─────────────────────────────────
Total:          ~20,358 tokens
```

The API response is 1.5% of the total. Even if we made it zero tokens, we'd save almost nothing. The system prompt is 98% of the cost.

This is why we say the title of the previous post was slightly misleading. Yes, compact format saves 78% on API responses. But API responses are the small slice. The real token budget is dominated by the system prompt — and within that, by the skills.

## What we did about it

### 1. The `always:true` / `always:false` split

The most impactful decision: most skills don't need to be loaded on every message.

If you say "save a note about the meeting," the agent needs `claw-notes`. It does not need `claw-photos`, `claw-diary`, `claw-bookmarks`, `claw-storage`, or `home-assistant`. Loading all of them wastes context on instructions the agent will never use for this interaction.

OpenClaw's skill system supports an `always` flag in the skill metadata:

```yaml
metadata: {"openclaw":{"always":true}}
```

Skills marked `always:true` are injected into every prompt. Skills marked `always:false` are only activated when the conversation context matches their description. The routing model (a fast, cheap classifier) reads the user's message and decides which skills to load.

Our split:

| always:true (every message) | always:false (on demand) |
|---|---|
| claw-notes, claw-calendar, claw-mail, claw-contacts, claw-drive, claw-search | claw-diary, claw-photos, claw-bookmarks, claw-storage, claw-hal, claw-graph, home-assistant |

The first group are things people expect to always work: "save a note," "what's on my calendar," "check my email." If these weren't always loaded, the agent would sometimes miss obvious requests.

The second group are contextual: "how's my disk?" activates storage. "Show me photos from last week" activates photos. The routing model triggers them based on keywords.

Result: the main agent's always-on cost dropped from ~20,600 to ~17,500 tokens. Still a lot, but 3,100 tokens saved on every single message adds up fast across hundreds of daily interactions.

### 2. Writing skills for tokens, not for humans

The SKILL.md file is not documentation. It's a prompt. Every word costs money.

Our early skills looked like documentation:

```markdown
## Creating a note

To create a new note, send a POST request to the notes endpoint.
The request body should contain the title and content fields.
The title is optional — if not provided, the system will use the
first line of the content as the title.

### Example

POST /api/v1/notes
Content-Type: application/json

{
  "title": "Meeting notes from Q1 review",
  "content": "Discussed budget allocation...",
  "tags": ["work", "q1"]
}

### Response

201 Created
{
  "data": {
    "id": "550e8400-...",
    "title": "Meeting notes from Q1 review",
    ...
  }
}
```

That's ~150 tokens to say "POST /notes with title, content, and tags." After optimization:

```markdown
### Create note
- `POST /notes` body: `{title?, content, tags?[]}`
- Response: `201` with created note
```

~30 tokens. Same information. The agent doesn't need prose explaining what a POST request is. It doesn't need example JSON responses — it knows what a 201 looks like. It needs the method, the path, the body fields, and which ones are optional.

The guidelines we adopted:

- **No full JSON response examples.** The agent doesn't need them.
- **Include body fields for POST/PATCH** — the agent does need those.
- **Use `?` suffix for optional fields** — `title?` instead of "title (optional)."
- **One line per operation** when possible.
- **No prose connectors** — "To create a note, you should..." becomes "Create: `POST /notes`"

### 3. The compact instruction in every skill

Every skill now instructs the agent to use `?format=compact` for listings:

```markdown
## API optimization
- List: always use `?format=compact`
- Detail: `GET /:id` (full JSON) only when needed
- Do NOT use `format=compact` on POST/PATCH/DELETE
```

This ensures the savings from the compact API format (post 6) are actually realized. Without this instruction, the agent defaults to full JSON responses — it doesn't know compact exists unless the skill tells it.

### 4. Multi-agent delegation

The nuclear option for token optimization: don't load skills you don't need because a different agent handles them.

Our multi-agent topology has 7 agents. The main agent (Francis) is a router — it handles common requests and delegates specialized ones:

- **Atlas** handles search, knowledge graph, and research
- **Sentinel** handles infrastructure, HAL, Docker, network
- **Dalí** handles photos, media, creative tasks
- **Ledger** handles finance, invoicing, crypto
- **Darwin** handles analytics, insights, sleep-time intelligence

![Agent tree topology showing the main agent and its 6 sub-agents with their assigned skills](/images/agent-tree.png)

Francis keeps 11 skills. The heavy ones like `claw-hal` (4,200 tokens) move to Sentinel, who only loads when infrastructure questions come up. `claw-photos` and visual intelligence move to Dalí. The search skill stays with Francis because search is needed in almost every interaction.

The main agent's prompt drops from ~20K to ~17.5K tokens. Still significant, but the per-message cost is meaningful — especially when using cloud models billed per token.

Full disclosure: the multi-agent topology is still early. We've defined the roles and the skill distribution, but we haven't battle-tested delegation patterns, error propagation between agents, or the overhead of agent-to-agent communication. There are almost certainly optimizations we're missing — whether it's smarter skill chunking, dynamic skill loading based on conversation history, or something we haven't thought of at all. If you've built multi-agent systems and see room for improvement, we'd genuinely love to hear about it in the comments.

## The counterintuitive insight: bigger models handle it better

Here's something we didn't expect: Sonnet (the larger model) processes large skill contexts more efficiently than Haiku (the smaller, supposedly faster model).

When the system prompt is ~20K tokens across 12 skills, the root cause of latency isn't API performance or network — it's the model processing the skill context. Haiku, despite being "faster" per token, takes longer to reason through a large, complex system prompt. Sonnet processes the same context and produces a better-routed response in less wall-clock time.

This means the intuition of "use the small model for simple routing" breaks down when the routing itself requires understanding a large skill corpus. The small model saves on per-token cost but loses on latency and accuracy. For our use case — personal OS with 12+ skills — Sonnet as the primary agent model is strictly better than Haiku, despite the higher per-token price.

## The numbers after optimization

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Main agent always-on skills | ~20,600 tokens | ~17,500 tokens | -15% |
| Tokens per skill (avg) | ~1,700 | ~1,400 | -18% |
| Skills always:true | 15 | 6 (main) / 12 (global) | -60% |
| API response (10 events) | ~4,200 tokens | ~800 tokens | -81% |
| System prompt total | ~25,000 tokens | ~20,000 tokens | -20% |

The 20% reduction in system prompt is nice, but the real win is architectural: understanding that skills are the dominant cost and designing the multi-agent topology, the always/on-demand split, and the skill writing guidelines around that reality.

## What I'd do differently

**I'd measure token consumption from day one.** We built 12 skills before ever counting how many tokens they consumed together. If we'd measured after the third skill, we'd have adopted the concise writing style immediately instead of rewriting everything later.

**I'd design the multi-agent topology earlier.** The decision to split agents was driven by token costs, but it should have been driven by separation of concerns. Sentinel handling all infrastructure makes sense regardless of tokens — it's a different expertise domain. We arrived at the right architecture for the wrong reason.

**I'd add a token budget per skill in the manifest.** Right now there's no mechanism to warn when a skill exceeds a reasonable size. A `max_tokens: 3000` field in the manifest would force skill authors (including us) to stay concise. If your skill is over budget, you need to split it or trim it.

## The takeaway

When you're building an AI agent system, the optimization hierarchy is:

1. **System prompt size** (~20K tokens, 98% of most interactions) — reduce always-on skills, write concisely, use multi-agent delegation
2. **Skill activation routing** — load only what's needed for this specific message
3. **API response format** — compact, diff-aware, progressive disclosure
4. **Model selection** — sometimes the bigger model is faster because it handles context better

Most optimization guides start at #3. The actual money is at #1.

Your agent isn't wasting tokens on API responses. It's wasting them on instructions it doesn't need for this particular message. Fix the prompt, then fix the API.

---

*Next up: hybrid search with Reciprocal Rank Fusion — how we combined pgvector, tsvector, the knowledge graph, and heat scoring into a single search pipeline.*
