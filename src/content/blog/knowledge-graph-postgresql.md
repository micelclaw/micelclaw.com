---
title: "Building a personal knowledge graph with just PostgreSQL (no Neo4j needed)"
description: "How two tables, three ALTER statements, and recursive CTEs replaced what most people reach for a graph database to do. At personal scale, PostgreSQL is the graph database."
date: 2026-03-17
author: "Víctor"
tags: ["postgresql", "database", "knowledgegraph", "architecture"]
---

At some point during development, we needed to answer questions that search couldn't: "Who's connected to this project?" "What links this email to tomorrow's meeting?" "Which people keep appearing together across my notes?"

Semantic search finds records by meaning. Full-text search finds them by keywords. But neither can traverse relationships. For that, you need a graph.

The obvious choice was Neo4j, or at least Apache AGE (which adds Cypher queries to PostgreSQL). We evaluated both and went with... two tables and `WITH RECURSIVE`.

This post explains why, and shows the actual schema, queries, and API that power the knowledge graph.

## Why not a graph database?

We seriously considered Apache AGE. It adds OpenCypher support directly inside PostgreSQL — no separate service, same database. The competitive analysis even had it as "Innovation #2: Bi-temporal personal knowledge graph via Apache AGE."

We rejected it for three reasons:

**Scale.** This is a personal system. One user, maybe a family. We're talking about fewer than 10,000 entity nodes and 50,000 edges. At that scale, a recursive CTE with depth 2-3 takes microseconds. The performance argument for a graph engine simply doesn't exist.

**Dependencies.** Apache AGE is a PostgreSQL extension that needs to be compiled and installed. On a bare-metal mini-PC with different architectures (x86, ARM), that's a maintenance headache. Our system already depends on two extensions (pgcrypto and pgvector). Adding a third for a feature that SQL handles natively felt wrong.

**Type safety.** We use Drizzle ORM for everything. Apache AGE queries return untyped results from Cypher strings embedded in SQL. Our recursive CTEs return typed rows that Drizzle understands. No impedance mismatch, no parsing layer, no surprise nulls.

The decision was documented as "ADR B-4: Apache AGE rejected in favor of SQL-native approach with recursive CTEs." The roadmap originally referenced AGE — we had to go back and update it.

## The schema: two tables

The entire knowledge graph lives in two tables. One for nodes, one for edges.

### Nodes: `graph_entities`

```sql
CREATE TABLE graph_entities (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type       VARCHAR(30) NOT NULL,    -- person, project, location, topic
    name              TEXT NOT NULL,            -- "Ana García", "Micelclaw OS", "Zaragoza"
    normalized_name   TEXT NOT NULL,            -- "ana garcia", "micelclaw os", "zaragoza"
    properties        JSONB DEFAULT '{}',       -- {email, company, role, coordinates...}
    merge_history     JSONB DEFAULT '[]',       -- [{merged_from, date, reason}]
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ,
    UNIQUE(entity_type, normalized_name)
);
```

Four entity types: `person`, `project`, `location`, `topic`. That's it. We considered adding more (organization, event, document) and decided against it. Four types cover 95% of real-world connections in personal data. The `properties` JSONB handles the rest — a person can have an email and company, a location can have coordinates.

The `normalized_name` column is the key to entity resolution: lowercase, no accents, trimmed. When the extraction pipeline finds "Ana García" in a note and "ana garcia" in an email, the UNIQUE constraint ensures they map to the same node.

### Edges: `entity_links` (extended)

We already had an `entity_links` table from the initial schema — it was one of the original 13 tables. It stored simple connections like "this note mentions this contact." For the knowledge graph, we extended it with three columns:

```sql
ALTER TABLE entity_links ADD COLUMN link_type VARCHAR(20) NOT NULL DEFAULT 'manual';
-- 'manual' | 'extracted' | 'inferred' | 'structural'

ALTER TABLE entity_links ADD COLUMN confidence REAL NOT NULL DEFAULT 1.0;
-- 0.0 to 1.0

ALTER TABLE entity_links ADD COLUMN created_by VARCHAR(20) NOT NULL DEFAULT 'system';
-- 'user' | 'llm' | 'system'
```

Three ALTER statements. That's the entire migration for turning a flat links table into a knowledge graph edge store.

The `source_type` and `target_type` columns (VARCHAR, no CHECK constraint) now accept `graph_entity` as a valid type. This means an edge can connect:

- A note → a graph entity (Person mentioned in text)
- A graph entity → a graph entity (Person works at Project)
- An event → a graph entity (Event located in City)

The relationship taxonomy follows a subject → verb → object convention:

| Relationship | Direction | Created by |
|---|---|---|
| `mentions` | record → entity | LLM extraction |
| `attended_by` | event → person | Sync (calendar attendees) |
| `located_in` | record → location | LLM extraction |
| `works_at` | person → project/org | LLM extraction |
| `collaborates_with` | person → person | Inferred from co-occurrence |
| `relates_to` | entity → entity | Manual or sleep-time engine |

We also reserved three relationships for future use: `contradicts`, `follows_up`, `supersedes` — for a Zettelkasten-style auto-linking feature that isn't built yet but whose namespace is already protected.

## The queries: recursive CTEs

Three query patterns cover every graph operation we need.

### Expansion: "Who is connected to Ana García?"

Given a node, find all neighbors up to depth N:

```sql
WITH RECURSIVE graph_walk AS (
    -- Base: direct connections from the starting entity
    SELECT
        el.target_type,
        el.target_id,
        el.relationship,
        el.confidence,
        1 AS depth
    FROM entity_links el
    WHERE el.source_type = 'graph_entity'
      AND el.source_id = $entity_id
      AND el.confidence >= 0.5

    UNION ALL

    -- Recursive: follow edges from discovered nodes
    SELECT
        el.target_type,
        el.target_id,
        el.relationship,
        el.confidence,
        gw.depth + 1
    FROM graph_walk gw
    JOIN entity_links el
        ON el.source_type = gw.target_type
       AND el.source_id = gw.target_id
    WHERE gw.depth < $max_depth    -- default: 2
      AND el.confidence >= 0.5
)
SELECT DISTINCT ON (target_type, target_id) *
FROM graph_walk
ORDER BY target_type, target_id, depth;
```

At depth 2 with 10K nodes, this query returns in under 10ms. We set the default to 2 and the maximum to 3. Depth 3 is rarely useful for personal data — it usually returns the entire graph.

### Path finding: "What connects this email to that meeting?"

BFS to find the shortest path between two nodes:

```sql
WITH RECURSIVE path_search AS (
    SELECT
        ARRAY[source_id] AS path,
        target_type,
        target_id,
        1 AS depth
    FROM entity_links
    WHERE source_id = $from_id

    UNION ALL

    SELECT
        ps.path || el.source_id,
        el.target_type,
        el.target_id,
        ps.depth + 1
    FROM path_search ps
    JOIN entity_links el
        ON el.source_id = ps.target_id
    WHERE ps.depth < $max_depth    -- default: 4
      AND NOT (el.source_id = ANY(ps.path))  -- cycle prevention
)
SELECT * FROM path_search
WHERE target_id = $to_id
ORDER BY depth
LIMIT 1;
```

The `NOT (el.source_id = ANY(ps.path))` clause prevents infinite loops. The `LIMIT 1` with `ORDER BY depth` gives us the shortest path.

### Subgraph: "Show me everything around this project"

For the visualization view in the dashboard (a force-directed graph using `react-force-graph-2d`):

```sql
-- Get the top N entities by mention count, centered on an optional entity
SELECT
    ge.id, ge.name, ge.entity_type,
    COUNT(el.id) AS mention_count,
    rh.heat_score
FROM graph_entities ge
LEFT JOIN entity_links el
    ON (el.target_type = 'graph_entity' AND el.target_id = ge.id)
    OR (el.source_type = 'graph_entity' AND el.source_id = ge.id)
LEFT JOIN record_heat rh
    ON rh.domain = 'graph_entity' AND rh.record_id = ge.id
WHERE ge.deleted_at IS NULL
GROUP BY ge.id, rh.heat_score
ORDER BY mention_count DESC
LIMIT $limit;
```

Then a second query fetches all edges between the returned nodes. The dashboard renders nodes sized by mention count and colored by heat score — hot nodes glow, cold nodes fade.

## How nodes get created

Nodes enter the graph through three pipelines, only one of which involves an LLM:

### 1. Contacts → Person nodes (no LLM)

When a contact is created or synced from Google, the CRUD hook creates a Person node directly from structured data:

```
Contact {display_name: "Ana García", company: "TechCorp", emails: [{address: "ana@techcorp.com"}]}
    ↓
graph_entities {entity_type: "person", name: "Ana García", normalized_name: "ana garcia",
                properties: {email: "ana@techcorp.com", company: "TechCorp"}}
```

No model needed. The data is already structured.

### 2. Event attendees → Person nodes (no LLM)

Calendar events have attendees as structured JSONB. Each attendee is resolved against existing Person nodes by email, or created as a new node:

```
Event attendee {email: "ana@techcorp.com", name: "Ana"}
    ↓
Match against graph_entities WHERE properties->>'email' = 'ana@techcorp.com'
    ↓
Found → reuse existing node (even if name differs slightly)
Not found → create new Person node
```

### 3. Text extraction → All entity types (LLM)

This is the async pipeline from the previous blog post. The 2B model extracts persons, projects, locations, and topics from notes, emails, diary entries, and file contents. Each extracted entity is upserted by `(entity_type, normalized_name)` — if it already exists, the properties are merged.

The key insight: pipelines 1 and 2 mean the graph has a solid foundation of real, structured Person nodes before the LLM ever runs. When the LLM extracts "Ana García" from a note, it matches against a node that already exists from the contacts sync. No orphan entities, no duplicates — just a new edge connecting the note to an existing person.

## Entity resolution: the hard problem

Extraction creates nodes. Entity resolution decides whether two nodes are the same thing. We handle this in three levels:

**Level 1 — Deterministic (automatic).** The `UNIQUE(entity_type, normalized_name)` constraint handles exact matches. "Ana García" and "ana garcía" always map to the same node. For persons, email matching overrides name matching — if two nodes have the same email, they're the same person regardless of name differences.

**Level 2 — Suggested merges (semi-automatic).** An endpoint returns pairs of same-type entities with high name similarity (using `pg_trgm`'s `similarity()` function, threshold > 0.4):

```
GET /graph/merge-candidates

[{
  entity_a: {name: "Ana García", mention_count: 15},
  entity_b: {name: "Ana G.", mention_count: 3},
  similarity: 0.87
}]
```

A merge redirects all edges from the absorbed node to the surviving node, records the event in `merge_history`, and hard-deletes the duplicate.

**Level 3 — Sleep-time resolution (automatic, low-priority).** A background job periodically reviews Person nodes, calculates cross-similarities, and proposes merge candidates. The AI agent can also trigger merges when context makes it obvious ("Juan" and "Juan Pérez" in the same conversation).

What we explicitly don't try to resolve: nicknames ("Pepe" = "José"), role-based references ("the accountant"), and ambiguous entities ("Santiago" — person or city?). Those are either handled by the agent in conversation or corrected manually. The graph needs to be conservative — an incorrect merge destroys data, while a duplicate is just noise that can be cleaned up later.

## The API

Six endpoints expose the graph:

```
GET  /graph/entities              — Search by name, filter by type
GET  /graph/entities/:id          — Entity detail with direct connections
GET  /graph/connections           — Expansion traversal (depth 1-3)
GET  /graph/path                  — Shortest path between two entities
GET  /graph/subgraph              — Nodes + edges for visualization
GET  /graph/stats                 — Counts, orphans, pending queue
GET  /graph/merge-candidates      — Similar entity pairs
POST /graph/merge                 — Fuse two entities
POST /graph/cleanup               — Delete orphan nodes (0 connections)
```

The graph is a Pro feature. Free tier users still get `entity_links` (manual connections between records), but the automatic entity extraction, the graph visualization, and the traversal queries require Pro.

## What the graph enables

Once you have a knowledge graph, things that were impossible become trivial:

**"Who's involved in this project?"** — expansion query from a Project entity, depth 1, filter by Person type. Returns everyone who's been mentioned in connection with the project across all domains.

**"What connects this email to that meeting?"** — path query. Returns: email → mentions → Person:Ana García → attended_by → Event:Sprint Review. Two hops, one shared person.

**"Show me everything about Ana García"** — entity detail. Returns: 15 mentions across notes and emails, 3 events attended, works at TechCorp, collaborates with Javier Losada. All discovered automatically.

**Search ranking.** The hybrid search uses graph connectivity as one of four signals (along with semantic similarity, full-text relevance, and heat score) in a Reciprocal Rank Fusion algorithm. A note that mentions entities connected to your recent activity ranks higher.

The graph also feeds the sleep-time engine (background jobs that discover cross-domain correlations), the proactive digest ("Ana García, who you're meeting tomorrow, sent you an email yesterday"), and the AI agent's contextual awareness.

## The numbers

At the current scale of development:

| Metric | Value |
|--------|-------|
| Graph entities | ~150-300 per active user |
| Entity links | ~500-1000 |
| Expansion query (depth 2) | < 10ms |
| Path query (depth 4) | < 15ms |
| Subgraph for visualization (100 nodes) | < 20ms |
| Memory overhead | 0 (it's just PostgreSQL) |

No new service to deploy. No new port to manage. No new backup strategy. It's tables in the same database that holds everything else, queried with the same ORM, backed up with the same `pg_dump`.

## What I'd do differently

**I'd add `pg_trgm` from day one.** We needed it for merge candidates (fuzzy name matching) and ended up adding it as a later migration. It's a small extension with zero downsides — should have been in the initial schema alongside pgcrypto and pgvector.

**I'd index `entity_links` more aggressively.** The default indexes cover the UNIQUE constraint, but expansion queries benefit from separate indexes on `(source_type, source_id)` and `(target_type, target_id)`. We added them later when profiling showed sequential scans on the edges table.

**I'd build the visualization earlier.** The force-directed graph view in the dashboard was one of the last features built, but it should have been one of the first. Seeing the graph visually — nodes clustering around projects, people forming communities — was the moment the knowledge graph went from "interesting data structure" to "this actually understands my data." It would have motivated better extraction quality earlier.

## The takeaway

A knowledge graph doesn't need a graph database. At personal scale (< 10K nodes, < 50K edges), PostgreSQL with recursive CTEs is fast, simple, and — critically — already there. No new infrastructure, no new dependency, no new operational burden.

Two tables (`graph_entities` + extended `entity_links`), three traversal patterns (expansion, path, subgraph), three entity creation pipelines (structured sync, calendar attendees, LLM extraction), and three levels of entity resolution (deterministic, suggested, sleep-time).

The graph is the connective tissue between everything else in the system — search, heat scoring, the AI agent, the digest engine. And it's all just rows in PostgreSQL.

---

*Next up: heat scoring — how we taught records to fade like memories, and why a simple exponential decay formula changes how search works.*
