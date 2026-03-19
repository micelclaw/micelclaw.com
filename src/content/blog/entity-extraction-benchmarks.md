---
title: "#03 — Entity extraction with a 2B model: benchmarks from a personal knowledge graph"
description: "We benchmarked qwen3-vl (2B parameters, quantized) for NER on personal data — notes, emails, diary entries, and photos. The results surprised us, but not in the way F1 scores suggest."
date: 2026-03-14
author: "Víctor"
tags: ["ai", "nlp", "ollama", "selfhosted"]
---

When you're building a personal knowledge graph — the kind that automatically discovers that "Ana García" appears in your emails, your calendar, and tomorrow's meeting notes — you need entity extraction. The industry answer is to throw GPT-4 at it and move on. But when your system runs on a mini-PC in someone's living room, you need something that fits in 2GB of RAM.

We benchmarked `qwen3-vl:2b-instruct-q4_K_M` — a 2-billion parameter multimodal model, quantized to 4-bit — running locally through Ollama. The same model that describes our photos also extracts entities from text. One model, two jobs, less RAM.

Here's what we found.

## The setup

We built a benchmark suite with two tasks:

**Text extraction** — 15 cases across notes, emails, and diary entries. Mix of Spanish and English. Each case has human-annotated ground truth: which persons, projects, locations, and topics should be extracted.

**Vision extraction** — 10 photos ranging from restaurant dinners to construction sites to landscape shots. Each photo goes through two stages: the model describes the image, then a second pass extracts entities from that description.

The extraction prompt is deliberately simple:

```
Extract named entities from the following text. Return ONLY a JSON object:
- persons: array of person names mentioned
- projects: array of project/product names mentioned
- locations: array of place names mentioned
- topics: array of key topics/themes (max 3)

Rules:
- Only extract what is EXPLICITLY mentioned
- Do not invent or infer entities not present
- Normalize names (capitalize properly)
```

Matching uses embedding similarity (qwen3-embedding, 1024d) with a 0.75 threshold instead of exact string matching. "Parte Vieja" matches "Parte Vieja" obviously, but "edge caching" also matches "edge caching approach" because the embeddings are close enough.

## Text extraction: the numbers

Overall F1: **0.645**. Zero parse errors across all 15 cases — the model always returned valid JSON. Average latency: 2-4 seconds per case on CPU.

But the overall F1 hides a story. Let's break it down by entity type:

| Entity type | Avg F1 | What happened |
|-------------|--------|--------------|
| Persons | ~0.87 | Near-perfect. The model's strongest category by far |
| Locations | ~0.72 | Handles Spanish geography beautifully |
| Projects | ~0.65 | Good when names are explicit, invents sometimes |
| Topics | ~0.30 | Weakest — but also the most subjective category |

### Persons: the killer feature

The model nails names. Full names, first names, Spanish names with accents — it gets them right:

- "Marta Ibáñez", "Javier Losada", "Rubén" — all extracted from a construction note. ✓
- "Carmen Pueyo", "Víctor García", "Diego Martínez" — from an email thread. ✓
- "Tom Preston-Werner" — from an English conference note. ✓
- "José Miguel Aguirre" — from a text full of nicknames. ✓
- "Roberto Casas", "Víctor", "Lucía", "Sandra" — four people from a sprint review email. All four. ✓

Where it stumbles: a diary entry mentioning "Papá" and "Mamá" — the model extracted them as persons. Technically correct (they are persons), but the human ground truth didn't include them because they're not named individuals. This is a recurring pattern: **the model extracts more than the human annotated**, which hurts precision without being wrong.

The other pattern: the model extracted "Javier" as a separate person from "Javier Losada". Both in the same note. That's an entity resolution problem, not an extraction problem — and the knowledge graph handles it downstream with merge candidates.

### Locations: surprisingly good at Spanish geography

"Valdespartera", "Villanueva de Gállego", "La Ternasca", "Parte Vieja", "Urgull", "Benasque", "Añisclo" — these aren't exactly world-famous cities. They're neighborhoods, hiking valleys, and small towns in Aragon and the Basque Country. The model got them all.

It also correctly classified "San Sebastián" as a location (not a person), "Ordesa" as a location (not a project), and "calle San Miguel" as a variant of "San Miguel." The embedding similarity matching helped here — "calle San Miguel" and "San Miguel" have near-perfect similarity.

One amusing misclassification: "eu-west-1" (an AWS region) was extracted as a location. I mean... it is a location. Just not the kind we meant.

### Projects: good when explicit, creative when not

When the text says "Micelclaw OS" or "MACP Protocol" or "OpenClaw Gateway", the model finds them with 100% accuracy. Named projects are easy.

The problem is when the model decides something is a project that isn't. "Pilotaje" (a construction technique) got classified as a project. "Txuletón" (a steak cut) became a project. "Barna" (slang for Barcelona) appeared as a project. The model is trying to be helpful — if it can't figure out which category something fits, it hedges by putting it in projects.

### Topics: where F1 lies

Topics scored ~0.30 F1. That sounds terrible. But look at what actually happened:

A diary entry about a trip to San Sebastián. Human ground truth: `["viaje", "desconexión"]` (trip, disconnecting). Model output: `["pintxos", "txuletón", "playa"]` (pintxos, steak, beach).

Both are correct summaries of the same diary entry. The human abstracted ("it was a trip about disconnecting"), the model got specific ("there were pintxos and beach"). The embedding similarity between "viaje" and "txuletón" is 0.67 — below the 0.75 threshold — so it counts as a miss.

This pattern repeats across almost every case. The human writes abstract topics; the model extracts concrete ones. For a knowledge graph, the model's approach is arguably better — "pintxos" is more searchable than "desconexión."

### Bilingual without trying

We mixed Spanish and English cases without telling the model which language to expect. It handled both without issues. "Tom Preston-Werner" from an English note and "José Miguel Aguirre" from a Spanish one were extracted with the same accuracy. The extraction prompt is in English; the input text is in whatever language the user writes in. The model doesn't care.

### The nickname challenge

The hardest test case was a Spanish note full of nicknames: "Pepe", "Tere", "Boli", "Txe", plus the full name "José Miguel Aguirre."

The model extracted "Pepe" and "José Miguel Aguirre" as separate persons — it didn't connect the nickname to the full name. It found "Tere" and "Txe" but missed "Boli." Three out of four nicknames is honestly better than expected for a 2B model.

Resolving "Pepe" = "José Miguel Aguirre" is entity resolution, not extraction. That's handled by the knowledge graph's merge candidate system — when two person nodes co-occur frequently, the system flags them for manual or automated merging.

## Vision extraction: description first, entities second

The photo pipeline works in two stages: the model describes the image, then the same extraction prompt runs on that description. This means the quality of entity extraction depends entirely on the quality of the description.

Overall vision F1: **0.532**. But the descriptions themselves are far better than the F1 suggests.

### The descriptions are impressive

A photo of an olive grove landscape:

> *"This image captures a vast, sunlit landscape of rolling hills and valleys, likely in a rural or agricultural region. The scene is dominated by rows of olive trees planted in a dense, geometric pattern across the slopes."*

A construction site photo:

> *"A red and silver laser level is set up on a tripod, indicating precise work is being done. The site is surrounded by dirt, sand, and a few trees."*

The model identified olive trees, a laser level on a tripod, and even recognized a 3D structural engineering model from a screenshot. For 2B parameters quantized to 4-bit, running on CPU, this is remarkable.

### Where vision extraction breaks down

The main issue: when photos contain people, the model says "four people sitting at a table" or "three people walking on a boardwalk." It counts them, describes what they're doing, but can't identify them. This is expected — face recognition requires a separate pipeline (we use InsightFace for that).

The problem for the benchmark is that "four people" gets extracted as a person entity, which counts as a false positive against a ground truth that says "no specific persons." This systematically tanks the persons F1 for vision.

### The ground truth problem

Here's what we learned about benchmarking entity extraction: **the human is the bottleneck, not the model.**

For photo 7 (construction site), the human annotated objects as: `["tripod", "briefcase", "net", "brick", "concrete"]`. The model found: `["red brick wall", "large concrete block", "red and silver laser level", "tripod", "dirt", "sand", "trees", "house", "sunlight", "clear sky"]`.

The model extracted 10 objects where the human listed 5. The model's list is more complete and more accurate — "red and silver laser level" is a better description than what the human wrote. But the F1 score penalizes the model for being thorough, because every "extra" extraction hurts precision.

This is a fundamental issue with evaluating extraction against human annotations. The human annotates what they think is important. The model extracts what is present. For a knowledge graph that needs to be comprehensive, the model's approach is correct — you want to capture everything and let the search ranking decide what's relevant.

## Latency: the real constraint

| Task | Average | Range |
|------|---------|-------|
| Text extraction | ~3s | 1.5–4.2s |
| Vision description | ~2.4s | 1.4–6.2s |
| Vision extraction | ~1.8s | 1.1–4.4s |

All on CPU, all sequential through a single Ollama instance with a priority semaphore. These numbers are for the async pipeline — the user never waits for them. A note gets created in ~50ms; the entity extraction happens 2-4 seconds later in the background.

The first request after a cold start took 66 seconds (model loading into RAM). After that, Ollama keeps the model loaded and subsequent requests are fast. This is why we keep a single model in memory — loading and unloading models per task would destroy latency.

## What we'd change

**Lower the similarity threshold for topics.** The 0.75 threshold is too strict for abstract concepts. "Viaje" and "pintxos" are obviously related in context, but their embeddings are only 0.67 similar. For persons and locations, 0.75 is fine. For topics, 0.60 might be more appropriate.

**Post-process the "N people" pattern.** When the vision model says "four women" or "three people," the extraction prompt shouldn't classify that as a person entity. A simple regex filter on the extraction output would fix the most common false positive.

**Embrace the verbosity.** The model extracts more than a human would annotate. Instead of fighting this, design the knowledge graph to handle it — use confidence scores and the heat system to surface what matters and let the rest decay naturally.

## The takeaway

A 2B parameter model, quantized to 4-bit, running on CPU:

- **Persons:** F1 0.87 — production-ready for a personal knowledge graph
- **Locations:** F1 0.72 — solid, handles non-English geography
- **Projects:** F1 0.65 — good enough with downstream deduplication
- **Topics:** F1 0.30 — misleading number, the model is actually more thorough than the human
- **Parse reliability:** 0 errors in 25 cases — always returns valid JSON
- **Latency:** 2-4 seconds async, invisible to the user

Is it as good as GPT-4? No. Is it good enough to build a personal knowledge graph that automatically discovers connections between your notes, emails, and calendar? Yes. And it runs on your hardware, processes your data locally, and costs zero per extraction.

For a personal system processing maybe 50-100 new records per day, a 2B model with 3-second extraction time and ~0.87 F1 on the entities that matter most (people and places) is more than enough. The knowledge graph doesn't need to be perfect — it needs to be useful. And "Ana García appears in 3 emails and tomorrow's meeting" is useful even if the system also extracted "txuletón" as a project.

---

*Next up: how we built a knowledge graph using just PostgreSQL — no Neo4j, no Apache AGE, just recursive CTEs and an entity_links table.*
