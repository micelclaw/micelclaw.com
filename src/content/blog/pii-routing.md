---
title: "#10 — PII-aware routing: how to use cloud AI and keep your sensitive data local"
description: "When your personal AI system needs cloud models for complex reasoning but handles sensitive data, you need a privacy router. Here's how we built one with regex, pseudonyms, and a routing table — no ML required."
date: 2026-03-27
author: "Víctor"
tags: ["privacy", "ai", "architecture", "selfhosted"]
---

Here's the tension at the heart of every personal AI system: cloud models are better at reasoning, but your data is private. A self-hosted system can run everything locally — but a 2B parameter model on a mini-PC isn't going to draft a nuanced email response or analyze a complex financial situation the way a frontier model can.

The naive solutions are both bad. "Send everything to the cloud" means your diary entries, medical notes, and financial records pass through someone else's servers. "Run everything locally" means accepting worse reasoning on tasks where model quality actually matters.

We built a third option: a PII-aware routing layer that classifies every piece of data by sensitivity, routes it to the right model, and pseudonymizes anything sensitive that needs cloud reasoning power.

## The classification: four levels, zero LLM calls

Every record in the system gets a sensitivity level. The classification is entirely deterministic — regex patterns and domain rules. No LLM in the classification loop, because sending data to an LLM to decide if the data is too sensitive to send to an LLM is a circular problem.

| Level | What it means | Example domains |
|-------|-------------|----------------|
| `low` | Public or low-risk data | Events, bookmarks |
| `normal` | Common personal data | Notes, contacts, files, diary |
| `high` | Sensitive personal data | Emails, financial transactions |
| `critical` | Never leaves the device | Medical/health data |

Each domain has a default sensitivity level. Events are `low` — knowing you have a meeting at 3pm isn't particularly sensitive. Emails are `high` — they contain names, addresses, business context, and sometimes confidential information. Health entries are `critical` — always local, no exceptions.

But domains are just the baseline. The classifier also scans content for PII patterns that override the default:

```
Email addresses     → elevate to high minimum
Phone numbers       → elevate to high minimum
Credit card numbers → elevate to high minimum
IBAN codes          → elevate to high minimum
SSN / DNI / NIE     → elevate to high minimum
Medical terminology → elevate to critical
```

A note titled "Grocery list" stays at `normal`. A note containing "Dr. García prescribed 20mg omeprazole" gets elevated to `critical` because the regex matched medical terminology. The content drives the classification, not just the domain.

This is deliberately conservative. The regex patterns over-match — "Dr." triggers medical detection even if it's "Dr. Pepper." False positives mean data gets routed locally when it could have gone to the cloud. False negatives mean sensitive data leaks. Over-matching is the correct failure mode.

## The routing decision

Once classified, the router decides where each piece of data goes:

```
low / normal  → Cloud LLM — best reasoning
high          → Cloud LLM WITH pseudonymization — good reasoning, protected data
critical      → Local model only (Ollama) — or skip if Ollama unavailable
```

The decision isn't binary "local vs cloud." There's a middle path: pseudonymize the sensitive parts, send to the cloud for reasoning, and de-pseudonymize the response before the user sees it.

This matters because most tasks involving sensitive data don't need the sensitive parts for reasoning. "Summarize this email thread" needs the content structure and topic — not the actual names and email addresses. "What's the sentiment of this diary entry?" needs the emotional content — not the specific people mentioned.

## The pseudonymizer

When a `high` sensitivity record needs cloud processing, the pseudonymizer replaces PII with consistent tokens:

| Entity type | Pseudonym format | Example |
|------------|-----------------|---------|
| Person | `Person_XXXX` | "Ana García" → `Person_A3F2` |
| Email | `email_XXXX@example.com` | "ana@techcorp.com" → `email_7B1C@example.com` |
| Phone | `+00-XXXX-0000` | "+34 612 345 678" → `+00-E5D9-0000` |
| Organization | `Org_XXXX` | "TechCorp" → `Org_4C8A` |
| Location | `Location_XXXX` | "Calle Sagasta 15" → `Location_B2E1` |

Three properties make this work:

**Consistency.** The same value always produces the same pseudonym (SHA-256 of the original value, truncated). "Ana García" is always `Person_A3F2`, in every record, in every session. This means the cloud model can reason about relationships: "Person_A3F2 sent 3 emails to Person_B7D1 about Org_4C8A" preserves the structure even though the names are hidden.

**Reversibility.** The `pseudonym_map` table stores every mapping. When the cloud model's response comes back, the system replaces all pseudonyms with real values before storing or displaying the result. The user never sees `Person_A3F2` — they see "Ana García."

**Persistence.** Mappings survive across sessions. If "Ana García" was pseudonymized yesterday and appears again today, she gets the same pseudonym. This means the cloud model can build consistent context across multiple interactions without ever learning the real name.

The detection itself uses regex — no LLM call. It's the same NER-lite approach as the sensitivity classifier: pattern matching for emails, phones, card numbers, and named entity patterns for persons and organizations. Not perfect, but fast and deterministic.

## What this looks like in practice

**Scenario 1: Calendar event (low sensitivity)**

User asks: "What's on my calendar tomorrow?"

The system fetches tomorrow's events. Events are `low` sensitivity. The full data — titles, locations, attendees — goes straight to the cloud model. No pseudonymization needed. The model reasons about the schedule and responds with a natural summary.

Cost: one cloud API call. Privacy: no sensitive data exposed.

**Scenario 2: Email analysis (high sensitivity)**

User asks: "Summarize the email thread about the partnership."

The email thread is `high` sensitivity (default for emails). Before sending to the cloud model:

```
Original: "Ana García <ana@techcorp.com> wrote: Hi Paco,
regarding the TechCorp partnership with NexaTech..."

Pseudonymized: "Person_A3F2 <email_7B1C@example.com> wrote:
Hi Person_0D4E, regarding the Org_4C8A partnership with Org_9F3B..."
```

The cloud model receives the pseudonymized version. It can still analyze the thread structure, identify that Person_A3F2 is negotiating with Person_0D4E, and summarize the key points. The reasoning quality is nearly identical — the model doesn't need to know the real names to understand the negotiation dynamics.

The response comes back with pseudonyms:

```
"Person_A3F2 proposed a revenue-sharing model with Org_9F3B.
Person_0D4E agreed in principle but requested..."
```

The system de-pseudonymizes:

```
"Ana García proposed a revenue-sharing model with NexaTech.
Paco agreed in principle but requested..."
```

Cost: one cloud API call + ~2ms pseudonymization. Privacy: no real names or emails left the device.

**Scenario 3: Health data (critical sensitivity)**

User asks: "What medications am I taking?"

Health entries are `critical`. They never leave the device, period. The system routes to the local Ollama model. If Ollama is unavailable, the query fails gracefully — it does NOT fall back to the cloud.

The local model's response might be less polished, but for medical data retrieval, the task is usually simple: find the records and list them. A 2B model handles that fine.

Cost: one local model call. Privacy: absolute — zero data exposure.

**Scenario 4: Note with accidental PII (elevated sensitivity)**

User creates a note: "Meeting with Dr. López about the lab results. Blood pressure 140/90."

The note's domain is `normal`, but the content contains medical terminology ("Dr.", "lab results", "blood pressure"). The classifier elevates it to `critical`. From this point on, this note is treated like health data — local only.

The user didn't tag it as medical. They didn't configure anything. The system caught it automatically. Conservative false positives are the design choice: if a note mentions "Dr. Pepper," it gets elevated too. That's a minor inconvenience (one note processed locally instead of on the cloud) with zero privacy risk.

## The audit trail

Every routing decision is logged:

| Field | What it records |
|-------|----------------|
| `domain` | Which data domain (notes, emails, etc.) |
| `record_id` | Which specific record |
| `sensitivity` | Classified sensitivity level |
| `action` | What happened: `sent_pseudonymized`, `sent_plain`, `blocked` |
| `destination` | Where it went: `embeddings`, `contextual_retrieval`, `sleep_time` |

The `pii_routing_log` table creates a complete audit of what data was exposed to which processing pipeline. If you ever need to answer "did my medical data ever touch a cloud service?", the answer is in the log.

This is also how we verify the system works correctly. The log shows every routing decision. If a `critical` record ever appears with action `sent_plain` and a cloud destination, that's a bug — and the log caught it.

## Where routing applies

PII-aware routing isn't just for chat interactions. It applies everywhere the system sends data to an LLM:

**Embeddings.** When generating semantic embeddings, the text is classified before being sent to the embedding model. If you're using a cloud embedding API (future option), `high` and `critical` records get embedded locally via Ollama instead.

**Contextual retrieval.** The HyDE pipeline (generating hypothetical answers for better search) uses LLM calls. If the search touches sensitive domains, those calls route through the pseudonymizer.

**Sleep-time compute.** The background intelligence jobs process records during idle periods. The enrichment job (re-extracting entities from hot records) respects the same routing rules — a `critical` record only gets re-extracted if Ollama is available.

**Entity extraction.** When the CRUD hooks pipeline sends text to the LLM for entity extraction, the same classification applies. A health-related note gets extracted locally.

The routing layer sits between every LLM consumer in the system and the actual model call. It's middleware — invisible to the features that use it, enforced consistently everywhere.

## The multi-agent dimension

With a multi-agent topology (7 agents in our system), PII routing gets another layer: agent scoping.

Each agent has a scoped token that defines what domains it can access:

```
Francis (main):     notes:*, events:*, emails:*, contacts:*, diary:*
Sentinel (infra):   storage:*, hal:*, network:*
Dalí (creative):    photos:read, files:read
Ledger (finance):   finance:*, crm:*
Darwin (analytics): graph:*, insights:*
```

Sentinel can't access emails. Dalí can't read the diary. This is enforced at the API level — even if a prompt injection tricks Dalí into requesting diary entries, the scoped token blocks it.

Combined with PII routing, this creates defense in depth:

1. **Agent scoping** prevents access to domains the agent shouldn't touch
2. **Sensitivity classification** catches PII regardless of domain
3. **Pseudonymization** protects data that needs cloud processing
4. **Audit logging** records everything for verification

A prompt injection attack would need to bypass all four layers to exfiltrate sensitive data. The scoping blocks the API call. The classification catches the content. The pseudonymizer strips the PII. The audit log records the attempt.

## What we explicitly don't do

**We don't use ML for classification.** A fine-tuned classifier could be more accurate than regex patterns. But it would need to see the data to classify it — which means sending potentially sensitive data to a model before deciding if it's safe to send to a model. Regex is dumber but has zero data exposure during classification.

**We don't redact — we pseudonymize.** Redaction (`[REDACTED]`) destroys information the cloud model needs for reasoning. Pseudonymization preserves structure ("Person_A sent an email to Person_B") while hiding identity. The cloud model can still reason about relationships, quantities, and patterns.

**We don't let the user override `critical`.** You can change a record's sensitivity from `normal` to `high` manually. You cannot downgrade `critical` to anything else. Health data stays local regardless of user preferences. This is a deliberate paternalistic choice — the privacy risk of accidentally exposing medical data outweighs the convenience of sending it to a better model.

**We don't route based on the LLM provider's privacy policy.** Whether provider A's privacy policy is better than provider B's is irrelevant. The system treats all cloud LLMs identically: external services that should never see `critical` data and should only see `high` data in pseudonymized form. Trust the math, not the terms of service.

## What I'd do differently

**I'd add per-field sensitivity, not just per-record.** Currently, a contact record is `normal` even though the `phones` field is arguably more sensitive than the `company` field. Per-field classification would let us pseudonymize just the phone number while sending the company name to the cloud. More precise, but also more complex — the pseudonymizer would need to understand JSON field structure.

**I'd build a sensitivity dashboard earlier.** The `pii_routing_log` has all the data, but there's no UI for it yet. A dashboard showing "this week: 450 records processed, 380 sent plain, 65 pseudonymized, 5 blocked" would build user trust and make the privacy system tangible.

**I'd make the regex patterns configurable.** Different users have different sensitivity needs. A doctor might want "aspirin" to be flagged as medical. A pharmacist might want it treated as normal. The current patterns are one-size-fits-all, which means they're too aggressive for some users and not aggressive enough for others.

## The takeaway

The privacy problem in personal AI isn't "local vs cloud." It's "which data goes where." Most of your data is fine to send to a cloud model — your calendar events and bookmark titles aren't secrets. Some data needs protection but can still benefit from cloud reasoning — pseudonymize it and send the structure without the identity. A small fraction of data should never leave your device — route it locally and accept the quality trade-off.

Three components: a regex classifier (zero LLM calls, deterministic), a SHA-256 pseudonymizer (consistent, reversible, persistent), and a routing table (domain defaults + content elevation). No ML, no fine-tuning, no privacy policy trust assumptions.

The system processes your medical notes with a 2B local model and your calendar queries with a cloud model. It knows the difference because a regex matched "blood pressure" — not because it asked an AI what's sensitive.

---

*Next up: designing an AI approval system — when should your agent ask for permission, and how do you build a confirmation workflow that doesn't slow everything down?*
