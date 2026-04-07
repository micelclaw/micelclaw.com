---
title: "#11 — Designing an AI approval system: when should your agent ask for permission?"
description: "An AI agent that can send emails, delete files, and configure VPNs needs guardrails. We built a 4-level approval system with shell control, PIN verification, and configurable timeouts — without slowing down everyday operations."
date: 2026-03-30
author: "Víctor"
tags: ["ai", "security", "architecture", "selfhosted"]
image: "/images/approval-system.webp"
---

An AI agent that can only read data is safe but useless. An AI agent that can send emails, delete files, format disks, and configure VPNs is useful but terrifying. The entire value of a personal AI operating system comes from the agent acting on your behalf — and the entire risk comes from the same thing.

We needed a system that says "yes" fast to everyday operations and "are you sure?" to dangerous ones. Not a blanket confirmation on everything (that just trains the user to click "approve" without reading). Not unrestricted access either (one prompt injection away from `rm -rf /`).

This post is about the 4-level approval system we built, the dual-layer architecture (shell + API), and the surprisingly difficult design decision of where to draw the line between "just do it" and "ask me first."

## The two attack surfaces

An AI agent in our system can cause damage in two completely different ways:

**Shell execution.** The agent uses the runtime's `exec` tool to run commands on the host machine. This is raw power — `curl`, `ls`, `grep`, but also `rm`, `dd`, `python3 -c 'import os; os.system("...")'`. The attack surface is the entire operating system.

**API operations.** The agent calls our REST API via `curl`. The `curl` command itself is harmless — it's the endpoint that's dangerous. `POST /storage/pools` creates a RAID array. `DELETE /files/:id` removes a file. `POST /emails/send` sends an email you can't unsend. The business logic is the attack surface.

These need separate control mechanisms because they have different risk profiles and different mitigation strategies.

## Layer 1: Shell control

By default, the agent can only execute a small set of safe binaries:

```
Safe bins: curl, jq, cat, echo, date, wc, head, tail, grep
```

That's it. The agent talks to the outside world through `curl` to our REST API. Everything else — file manipulation, package installation, network commands, scripting — is blocked at the runtime level.

There's an "Unrestricted Shell Mode" toggle in Settings → Security. It's deliberately scary: the toggle is marked in red, requires the user's password (not just a click), and shows a warning explaining that this allows the agent to execute any command on the system.

Even in unrestricted mode, destructive commands (`rm`, `dd`, `mkfs`, `fdisk`) always require per-operation confirmation from the user. Full freedom doesn't mean no guardrails — it means the agent can attempt anything, but the user decides on dangerous operations.

The key design principle: most users never enable unrestricted mode. The agent does everything it needs through the API. Shell access is a power-user feature for people who know what they're doing.

## Layer 2: Operation approvals

This is where it gets interesting. Every API operation has an approval level:

| Level | Name | What happens |
|-------|------|-------------|
| 0 | Auto | Execute immediately, no record. Reads, searches, listings. |
| 1 | Logged | Execute immediately, log to audit trail. Creates, updates, non-destructive writes. |
| 2 | Confirm | Pause and ask the user "Are you sure?" before executing. Sends, deletes, infrastructure changes. |
| 3 | Secure | Pause, ask for confirmation AND a numeric PIN. Format disk, delete volume, system reset. |

The approval level is checked by a Fastify middleware (preHandler) that runs before the route handler. If the request comes from an agent token and the operation requires Level 2+, the middleware returns a `202 Accepted` with an `approval_id` instead of executing the operation. The agent then asks the user for confirmation through whatever channel they're chatting on — Telegram, WhatsApp, or the web dashboard.

### How it looks in practice

**Level 0 — Auto (reading notes):**

```
User: "What notes do I have about the project?"
Agent: GET /notes?search=project&format=compact
→ Executes immediately. User sees results.
```

No friction. Reads are always auto.

**Level 1 — Logged (creating a note):**

```
User: "Save a note about today's meeting decisions"
Agent: POST /notes {title: "Meeting decisions", content: "..."}
→ Executes immediately. Logged to audit trail.
```

Still no friction — the user asked for it. But the audit trail records that agent `francis` created note `abc123` at 14:32. If something goes wrong, there's accountability.

**Level 2 — Confirm (sending an email):**

```
User: "Send Ana the budget update"
Agent: POST /emails/send {to: "ana@techcorp.com", subject: "Budget Q3", ...}
→ 202 Accepted {approval_id: "req_xyz"}

Agent: "I'm about to send this email to Ana García:
        Subject: Budget Q3
        [Preview of the body]
        Should I send it?"

User: "Yes"
Agent: POST /approvals/req_xyz/approve
→ Email sent.
```

One confirmation step. The agent shows what it's about to do. The user says yes or no. This catches the common case where the agent misunderstood the intent — "I said Ana, not María" — without making every email a five-step process.

**Level 3 — Secure (deleting a volume):**

```
User: "Delete the old backup volume"
Agent: POST /storage/volumes/vol_old/delete
→ 202 Accepted {approval_id: "req_abc", level: 3}

Agent: "⚠️ This will permanently delete volume vol_old (2.3TB).
        This cannot be undone.
        Please confirm with your security PIN."

User: "4829"
Agent: POST /approvals/req_abc/approve {pin: "4829"}
→ Volume deleted.
```

Two-factor: the user confirms AND enters their PIN. The PIN is a 4-6 digit numeric code set during initial setup, stored hashed with bcrypt. In messaging channels, the PIN message is deleted from chat history after verification (when the channel supports it).

## The approval lifecycle

Every Level 2+ operation creates an `approval_request` record:

```sql
CREATE TABLE approval_requests (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL,
    requested_by    VARCHAR(100) NOT NULL,    -- 'agent:francis'
    operation       VARCHAR(200) NOT NULL,    -- 'POST /emails/send'
    level           SMALLINT NOT NULL,        -- 2 or 3
    summary         TEXT NOT NULL,            -- "Send email to Ana: Budget Q3"
    params          JSONB,                    -- Request body snapshot
    status          VARCHAR(20) DEFAULT 'pending',
    resolved_at     TIMESTAMPTZ,
    pin_verified    BOOLEAN DEFAULT false,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL
);
```

The lifecycle is:

```
Agent triggers operation
    ↓
Middleware: level >= 2? → Create approval_request (status: pending)
    ↓
Notify user via WebSocket (Dash) + Gateway RPC (Telegram/WhatsApp)
    ↓
User approves, rejects, or ignores
    ↓
├── Approved → Execute operation, status: approved
├── Rejected → Return error to agent, status: rejected
└── Timeout (30min) → Auto-expire, status: expired
```

Three timeout stages prevent approvals from hanging forever:

| Stage | Default | What happens |
|-------|---------|-------------|
| Reminder | 5 minutes | Send a reminder to the user |
| Escalation | 15 minutes | Notify the system owner (if different from the user) |
| Expiry | 30 minutes | Auto-reject the request |

All three are configurable in Settings → Security → Approval Timeouts.

## What's configurable and what isn't

The default levels are sensible but not everyone agrees on what's "dangerous." A power user who sends 50 emails a day wants email sending at Level 1 (logged, no confirmation). A cautious user wants it at Level 2 (confirm every one).

Settings → Security shows a table of operations with dropdown selectors:

```
Operation                    Default    Your Level
─────────────────────────────────────────────────
Create note                  Logged     [1 - Logged ▼]
Send email                   Confirm    [2 - Confirm ▼]
Delete files (permanent)     Confirm    [2 - Confirm ▼]
Enable VPN                   Confirm    [2 - Confirm ▼]
Add VPN peer                 Confirm    [2 - Confirm ▼]
Delete volume                Secure     [3 - Secure  ▼]
Format disk                  Secure     [3 - Secure  ▼]
System reset                 Secure     [3 - Secure  ▼]
```

Two constraints prevent dangerous configurations:

1. **Level 3 operations can't go below Level 2.** You can downgrade "Delete volume" from Secure (3) to Confirm (2), but not to Logged (1) or Auto (0). Destructive, irreversible operations always require at least one confirmation.

2. **Level 0 operations can't be upgraded.** Read operations are always auto. Making `GET /notes` require confirmation would break the system — the agent would need approval to answer "what notes do I have?"

Changing approval levels is itself a Level 2 operation — the system asks for confirmation before letting you change the security settings.

![Settings → Security in the Dash: per-operation approval levels for VPN, processes and SSL certificates, and the three timeout knobs (Reminder / Escalation / Expiry) underneath.](/images/approval-system-2.webp)

## Why agents can't approve their own requests

This sounds obvious but it's the most important security decision in the system: **an agent API key cannot approve an approval request.** Only JWT tokens (human login via Dash) or system tokens can call `POST /approvals/:id/approve`.

If the agent could approve its own requests, a prompt injection attack could chain: trigger the operation → intercept the approval request → approve it. The human-in-the-loop is only meaningful if the human is the one doing the approving.

In messaging channels (Telegram, WhatsApp), the approval flows through the agent — the user says "yes" in the chat, and the agent calls the approve endpoint. But the approve endpoint verifies that the approval was triggered by a user message, not by the agent itself. The `requested_by` field records which agent requested the operation, and the same agent cannot resolve it.

## The middleware: 15 lines that matter

The approval check is a Fastify preHandler that runs on every route with an assigned level:

```typescript
// Simplified — the real version handles edge cases
async function approvalMiddleware(req, reply) {
  // Skip for human (JWT) requests — the Dash IS the confirmation
  if (req.authType === 'jwt') return;

  const level = getOperationLevel(req.method, req.url, req.userId);

  if (level <= 1) return; // Auto or Logged — proceed

  // Level 2 or 3: create approval request and pause
  const approval = await createApprovalRequest({
    userId: req.userId,
    requestedBy: `agent:${req.apiKeyName}`,
    operation: `${req.method} ${req.url}`,
    level,
    summary: buildSummary(req),
    params: req.body,
  });

  // Notify user
  await notifyApproval(approval);

  // Return 202 — the agent knows to ask the user
  reply.code(202).send({
    data: { approval_id: approval.id, level, summary: approval.summary },
    hint: level === 3
      ? "Ask user to confirm with PIN"
      : "Ask user to confirm"
  });
}
```

The `hint` field in the 202 response tells the agent's skill what kind of confirmation to request. Level 2: ask for a yes/no. Level 3: ask for the PIN.

Human requests from the Dash skip the middleware entirely. When you click "Send" in the email composer, you ARE the confirmation. The approval system only gates agent-initiated operations.

## The skill: teaching the agent to ask

The `claw-approvals` skill teaches the agent how to handle the approval flow:

```markdown
## Approval Protocol

When you receive a 202 response with an approval_id:
1. Show the user what you're about to do (use the summary field)
2. For Level 2: ask "Should I proceed?"
3. For Level 3: ask "Please confirm with your security PIN"
4. On "yes" or PIN: POST /approvals/{id}/approve (with pin if Level 3)
5. On "no" or "cancel": POST /approvals/{id}/reject
6. Never approve your own requests — always wait for user input
```

The skill also handles `/pending` (show pending approvals), `/history` (show past approvals), and edge cases like expired requests.

## What I learned about where to draw the line

The hardest part wasn't building the system — it was deciding which operations go at which level. Some were obvious:

- **Read anything → Level 0.** No debate.
- **Format disk → Level 3.** No debate.

The middle ground is where every conversation happened:

**Email sending: Level 1 or Level 2?** We went with Level 2 (Confirm) as default. Email is irreversible — you can't unsend it. A misunderstood intent ("send Ana the budget" when you meant "draft Ana the budget") has real consequences. But we made it configurable because power users find the confirmation annoying.

**Creating a note: Level 0 or Level 1?** We went with Level 1 (Logged). Creating a note is harmless — but logging it means the audit trail shows everything the agent did. If the agent starts creating garbage notes due to a bug, the log tells you when it started. Zero friction, full accountability.

**VPN operations: Level 2.** Enabling or disabling VPN changes network topology. Adding a peer grants network access to a device. These aren't destructive (you can undo them) but they affect security posture. Confirmation is appropriate.

**Deleting files: Level 2, not Level 3.** Files have soft delete with restore capability. "Delete" doesn't mean "gone forever" — it means "moved to trash." If deletion were permanent (bypassing soft delete), it would be Level 3.

The general heuristic: **reversible actions need less approval than irreversible ones.** Creating is Level 1 (you can delete it). Sending is Level 2 (you can't unsend it). Destroying is Level 3 (it's gone forever).

## The dual-layer interaction

The two layers (shell + API) work together:

```
User: "Check my disk space"

Agent: exec "df -h"
→ Layer 1: "df" is in safe bins → Execute immediately

Agent: GET /storage/overview?format=compact
→ Layer 2: Level 0 (read) → Execute immediately

Agent: "You have 450GB free on /data. The backup volume is 78% full."
```

No approvals needed — both layers allowed the operations silently.

```
User: "Set up a RAID1 mirror with the two new drives"

Agent: POST /storage/pools {name: "mirror1", level: "raid1", devices: ["sda", "sdb"]}
→ Layer 2: Level 2 (Confirm) → 202 Accepted

Agent: "I'm about to create a RAID1 pool using sda and sdb.
        This will erase all data on both drives. Confirm?"

User: "Yes"
→ Pool created.
```

And in unrestricted shell mode:

```
User: "Install htop on the server"

Agent: exec "apt-get install htop"
→ Layer 1: Not in safe bins + unrestricted mode → Ask for confirmation

Agent: "I want to run: apt-get install htop
        This will install a package on your system. OK?"

User: "Go ahead"
→ Layer 1: Approved → Execute
```

Both layers enforce independently. An operation that passes Layer 1 (shell) can still be blocked by Layer 2 (API). An operation that bypasses Layer 2 (because it's a direct shell command) is still caught by Layer 1.

## What I'd do differently

**I'd add batch approvals from the start.** When the agent needs to send 15 emails from a mail merge, asking for 15 individual confirmations is absurd. A "batch approve" mechanism ("Send these 15 emails? Here's the list.") should have been in v1. It's now on the backlog.

**I'd make the approval history more visible.** The audit trail exists (`GET /approvals/history`), and there's an "Approvals History" section in the sidebar, but it should be more prominent. A weekly summary — "Your agent executed 340 operations this week: 280 auto, 55 logged, 5 confirmed" — would build trust and help users understand their agent's activity.

**I'd reconsider the messaging channel PIN flow.** Sending a PIN via Telegram is not ideal — it's visible in chat history even if the agent tries to delete the message. For Level 3 operations, maybe the system should redirect to the Dash where a secure input modal exists, rather than accepting PINs in plain text through messaging.

## What's next: the sandbox

There's a missing piece between "restricted mode" (curl only) and "unrestricted mode" (everything, with confirmations). What if the agent could have a place to go completely wild — install packages, run services, break things — without any risk to your real system?

We're planning **sandbox environments**: Docker containers that the agent can create from Settings → Security. Not one — as many as you need. Each sandbox is an isolated machine with full root access. `apt install`, `pip install`, `systemctl`, custom scripts, databases, web servers — anything goes. Zero approval, zero restrictions, zero risk to the host.

The workflow we're designing around:

```
Sandbox "deploy-test"     → experimenting with nginx + certbot config
Sandbox "ml-pipeline"     → building a data processing pipeline with pandas
Sandbox "new-skill"       → developing and testing a new agent skill

Each one: independent, disposable, unrestricted.
```

The agent knows which sandbox it's working in. Commands routed to a sandbox go to that container. Commands on the real system go through normal approval layers. The two worlds don't touch — no shared volumes, no network bridge to internal services, no mount to `/data`.

The key is the **promote-to-production** flow. Once you've got something working in the sandbox — a configuration, a script, a service setup — you tell the agent "promote this to production." At that point, and only at that point, normal approval rules kick in. The agent needs Level 2 confirmation to copy files to the host, Level 2 to install a package on the real system, Level 3 to modify infrastructure. The sandbox is the drafting table; production is the real thing.

If a sandbox gets trashed, nuke it and spawn a fresh one in seconds. The sandboxes are cheap — a base Debian image with internet access and a persistent volume for the workspace. Multiple sandboxes can run simultaneously for different experiments without interfering with each other or with the host.

This isn't implemented yet, and there are open design questions: should sandboxes have read-only access to the real API (for testing skills against real data)? Should there be resource limits per sandbox (CPU, RAM, disk)? What's the UX for promoting — file-by-file or snapshot the whole container? We'd love input from anyone who's built agent sandboxing — this is genuinely uncharted territory for personal AI systems.

## The takeaway

An AI approval system needs two properties: it must be **fast for safe operations** (no friction on reads, minimal friction on writes) and **deliberate for dangerous ones** (explicit confirmation, PIN for irreversible actions, timeout for stale requests).

Four levels handle this: auto (reads), logged (writes), confirm (irreversible), secure (destructive + PIN). Two layers: shell control for host-level commands, API control for business operations. One principle: agents cannot approve their own requests.

The system processes ~95% of operations at Level 0 or 1 — invisible to the user. The 5% that require confirmation are the operations where a mistake actually matters: sending an email to the wrong person, deleting a volume, configuring network access. Those 5% are where trust is built or broken.

---

*Next up: building a process manager — how we manage Docker containers, systemd services, and Ollama models from a single dashboard with auto-start, health monitoring, and graceful shutdown.*
