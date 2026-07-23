---
title: "#14 — Deterministic agent identity: a before_tool_call hook fills the token the model kept getting wrong"
description: "Our MCP facade needs an auth_token on every tool call. The model kept mangling that 64-hex secret — and subagents spawned via sessions_spawn never got one at all, so delegated tasks failed silently (\"Dalí doesn't answer\"). Here's the native OpenClaw before_tool_call hook that injects each agent's token host-side, keyed by ctx.agentId, so the model never touches it."
date: 2026-07-26
author: "Víctor"
tags: ["ai","security","architecture","llm"]
draft: false
---

Francis is the main agent — the one you talk to in the dashboard. Dalí is the creative one, the sub-agent you hand an audio or an image task to. One day we asked Francis to have Dalí generate a short audio clip, and nothing came back. No error in the dashboard, no red toast, no timeout the user could see. Just silence.

We logged the bug as "Dalí doesn't answer," and it sat in the tracker for a while looking like a flaky model or a bad prompt — the kind of thing you're tempted to blame on a small local model having a bad day.

It was neither. It was an authentication hole with a very specific shape, and closing it meant taking a 64-character secret out of the language model's hands entirely.

## The problem the model couldn't see

Our agents don't talk to Core with `curl`. They call typed tools — `claw_notes`, `claw_calendar`, `claw_audio` — served by an MCP facade that runs host-side at `127.0.0.1:7250` (that's the previous post's subject). Every one of those tool calls has to carry an `auth_token` argument. Core takes the token, resolves it to a `userId` plus a set of scopes, and dispatches the call through its full pipeline via `app.inject()` — auth, scope check, semantic-scope check, approval, handler, audit. The facade reimplements none of that security; the token is the single thing that lets the pipeline know who is asking.

So the whole design rests on one question: where does that token come from?

Before this fix, it came from the prompt. Two bridges injected it — `ws/chat-bridge.ts` for webchat and `ws/voice-bridge.ts` for voice. When you typed to Francis in the dashboard, the chat bridge dropped Francis's token into the prompt, and Francis was instructed to copy it into every `claw_*` call. That works — mostly — for a main agent talking through a bridge.

A subagent spawned with `sessions_spawn` passes through **neither** bridge. When Francis delegates to Dalí, there is no chat bridge and no voice bridge in the path. So Dalí received no token at all. Every `claw_*` call it made failed auth, silently, and the delegated work just stopped. That was "Dalí doesn't answer": not a model refusing, a model that was never handed the credential it needed to do anything.

And even the main agent, on the happy path, was fragile. We were asking a language model to reproduce a 64-hex-character secret, verbatim, on every single call. A capable model does it — most of the time. But a secret the model has to retype is a secret the model will eventually get wrong, and when it improvised a tool it hadn't been shown properly, it improvised the token too.

| Fact | Value |
|---|---|
| Real runtime token | 64 hex characters |
| Copied correctly on a capable model | 6 / 6 (Qwen3.6-35B IQ2_M, ~27K-token context) |
| Value emitted when it improvised a wrong tool | 42 characters — not in the database |
| Subagent success rate before the fix | 0% (no token was ever injected) |

The 6/6 number is the trap. On rails, a strong model looks perfectly reliable, and you conclude the design is fine. Then the same model, one wrong turn later, emits a 42-character string that matches nothing in the database — and the subagents, which you can't watch as closely, get it wrong 100% of the time because they get nothing at all. Fragile by construction.

## Why not just a header

The obvious fix is a header. MCP servers usually authenticate with a static header — so put the token there, stop asking the model to carry it, done.

It doesn't work here. In OpenClaw, the `mcp.servers` config is **global**. The headers are static and shared across every agent — there is no per-agent identity per session. If we hard-coded a token into the server's headers, every agent on the box would authenticate as the same identity. That destroys the entire point of per-agent scopes: Dalí is supposed to have `audio:*`/`media:*` and nothing else; Francis has its full grant. A shared header can't express "this call is Dalí, that call is Francis."

That global-static constraint is exactly why [ADR-10](/blog/mcp-facade) put identity in a tool argument in the first place. ADR-11 doesn't undo that decision — the facade still dispatches `Authorization: Bearer <auth_token>` through `app.inject()`. All that changes is *who fills the argument*. Instead of the model, it's the host.

## The hook

OpenClaw lets a native plugin register a `before_tool_call` hook — a function that runs on the host, sees every tool call before it executes, and can rewrite its params. We wrote one: `openclaw-plugins/claw-identity/index.js`, plain ESM JavaScript, no build step. The core of it is about five lines.

```javascript
// The core of openclaw-plugins/claw-identity/index.js — the before_tool_call hook
api.on("before_tool_call", async (event, ctx) => {
  const toolName = event?.toolName ?? "";
  if (!toolName.startsWith("claw-os__")) return;      // only the MCP facade tools
  const token = loadTokenMap(mapPath)[ctx?.agentId];  // map keyed by ctx.agentId
  if (!token) return;                                  // no entry -> don't touch the call
  return { params: { ...event.params, auth_token: token } }; // override host-side
}, { priority: 100 });
```

That's the whole idea. For any tool whose name starts with the facade prefix `claw-os__`, the hook looks up the calling agent by `ctx.agentId` in a token map and rewrites `params.auth_token` to that agent's token. Whatever value the model put there is overwritten. If there's no map entry for the agent, the hook returns `undefined` and leaves the call untouched — it never breaks a call it doesn't recognize.

The model never sees the token, never types it, never hallucinates it. And because the key is `ctx.agentId`, a subagent spawned via `sessions_spawn` gets *its own* token injected host-side, with *its own* scopes — the exact case that used to fail silently. Determinism, keyed on who is actually running the tool.

## The per-agent token and the map

Where does the map come from? Core mints it. `syncUserRuntimeTokens(userId)` in `core/src/services/agent-runtime-token.service.ts` creates exactly one canonical `agent_tokens` row per agent, with `name='runtime'`. The database stores only the sha256 hash; the plaintext exists only in an on-disk map.

That map is `~/.config/micelclaw/agent-tokens.json`, and its shape is deliberately dull:

```json
{
  "paco--francis": "…64 hex chars…",
  "paco--dali":    "…64 hex chars…"
}
```

The keys are exactly the `ctx.agentId` values the hook looks up — `<prefix>--<agent>`, one per user-agent. Writing that file is where we were careful, because the plugin reads it live:

```javascript
// Atomic map write — core/src/services/agent-runtime-token.service.ts
async function writeMapAtomic(map) {
  const path = runtimeTokenMapPath();               // ~/.config/micelclaw/agent-tokens.json
  await mkdir(configDir(), { recursive: true, mode: 0o700 });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(map, null, 2), { mode: 0o600 });
  await rename(tmp, path);                           // atomic swap: the plugin never reads a half file
}
```

`mkdir` with mode `0o700`, the file itself `0o600`, and a temp-file-plus-rename so the swap is atomic. The plugin reads through an mtime cache (`loadTokenMap`): it only re-reads from disk when Core actually rewrites the file, and on any read error it falls back to the last-known map and never throws. That mtime-triggered re-read is exactly why the write has to be atomic — if we wrote the file in place, the plugin could catch it half-written and hand out a truncated token.

The scopes matter as much as the token. The desired scope set is derived from the agent's live role grant:

```
deriveScopesFromSkills(skillScopeDomains(skills), roleScopesFor(agentDbId), perms)
```

`roleScopesFor` returns the agent's broadest base token — so Francis keeps its full grant (~17 scopes) and Dalí keeps `audio:*`/`media:*`. Nothing is downgraded, nothing is escalated: the runtime token carries exactly the identity the agent already had. And it is re-minted **only** when the scopes actually change — a `scopesEqual` guard keeps it stable otherwise, so we're not churning credentials on every sync.

Here's the whole thing in four pieces:

| Piece | File | Role |
|---|---|---|
| The hook | `openclaw-plugins/claw-identity/index.js` | `before_tool_call` → injects `auth_token`, priority 100 |
| Token service | `core/src/services/agent-runtime-token.service.ts` | Mints one `runtime` token per agent, writes the map |
| Registration | `core/src/services/openclaw-bootstrap.service.ts` | Idempotent `configPatch` at boot + on regenerate-tools |
| The facade | `core/src/mcp/claw-os-mcp-server.ts` | Serves `claw_*` at `127.0.0.1:7250`, dispatches via `app.inject()` |

## Rollout and verification

The hook only helps if the plugin actually loads. Registration is an idempotent `configPatch` — `plugins.load.paths` plus `plugins.entries.claw-identity.enabled` — done by `ensureClawIdentityPluginRegistered()` in `openclaw-bootstrap.service.ts`, both at boot and from `regenerate-tools`. The plugin then loads on the next Gateway reload.

We didn't trust that it worked until the logs said so. Two lines in the Gateway log (`/tmp/openclaw/openclaw-YYYY-MM-DD.log`) tell the whole story:

```
[claw-identity] plugin cargado; mapa de tokens = /home/victor/.config/micelclaw/agent-tokens.json
[claw-identity] before_tool_call tool=claw-os__claw_notes agent=paco--francis token=ok
```

The first line says the plugin loaded and resolved its map. The second says the hook fired for a real MCP tool call, for the right agent, and injected a token that Core accepted (`token=ok`).

Then the end-to-end proof — the one that actually closed "Dalí doesn't answer." We sent Dalí a direct message: *"genera un audio que diga Hola caracola."* The log showed `before_tool_call tool=claw-os__claw_audio agent=paco--dali token=ok`. Dalí called the real `claw_audio` tool — not a shell workaround, the actual tool — and an `.ogg` file landed in Drive with a real `file_id`. The subagent that had never received a token now authenticates like any other agent.

## The gotchas

None of this was clean the first time, and the credibility of a fix like this is in the sharp edges we hit getting there:

- **`plugins.entries.<id>` rejects `env`.** The entry schema only accepts `enabled`, `hooks`, and `config`. A `configPatch` with an `env` key returns `INVALID_REQUEST: Unrecognized key: "env"` — and the *whole* patch is dropped, not just the bad key. So the plugin resolves the map path by its default (`~/.config/micelclaw/agent-tokens.json`) rather than reading it from the entry's env.
- **The MCP SDK strips undeclared params.** Any tool-call argument not declared in the tool's `inputSchema` disappears silently. We host-inject an internal `_conversation_id` (so Core can route L2 approval cards back to the chat they came from) — and it *must* be declared in the schema, or the SDK drops it on the floor and the routing quietly breaks. Same class of trap as the token itself.
- **The plugin needs a local SDK symlink in dev.** `index.js` imports `openclaw/plugin-sdk/plugin-entry`; from its own directory, Node needs a local `node_modules/openclaw` symlink pointing at `/usr/lib/node_modules/openclaw` (gitignored). A packaged deploy installs the plugin with its own dependencies; dev has to fake it.
- **Boot registration can lose the WS race.** If the Gateway WebSocket isn't up yet when Core tries to register the plugin, the `configPatch` is dropped and retried. That's why `POST /managed-agents/regenerate-tools` re-ensures registration once the WS is reliably up — it's the belt to the boot-time suspenders.
- **`tsx watch` doesn't hot-reload reliably on WSL.** Code changes need a full Core restart to take effect, and the plugin itself only loads on a Gateway reload. Edit-and-refresh does not apply here; you verify against the real, restarted runtime or you verify nothing.

## Where it grew

Worth being honest about how this file aged. It started as ~40 lines that did one thing: fill `auth_token`. The current `index.js` is 327 lines, because the hook turned out to be the natural place to enforce anything that has to be true *host-side, keyed by agent identity*.

It now also redirects `sessions_spawn`→`sessions_send` for cross-agent delegation; enforces a deny-by-default cross-**user** `sessions_send` guard (`crossUserSendBlock`); injects a `wb_<prefix>` `boardId` into the five board-scoped workboard tools; ensures a dedicated delegation session per (conversation × specialist); and injects the `_conversation_id` mentioned above. Each of those is a place where the model shouldn't be trusted to get identity right, and the hook is already sitting on the one chokepoint every tool call passes through — so it kept accreting responsibilities.

That's powerful and it's a smell at the same time. What began as "the auth_token hook" is really "the per-agent host-side identity layer" now, and the name on the tin no longer describes it.

## What I'd do differently

**Ship identity out of the prompt from day one.** Having the model copy its own token "works" on a strong model and fails silently for subagents and weak ones. The 6/6 copy rate lulled us into thinking the design was sound; the host-side hook should have been the first design, not the fix that arrived after "Dalí doesn't answer." If a component has to reproduce a secret to function, that's the bug, no matter how reliable the reproduction looks in a demo.

**Decide up front whether the hook is single-purpose or the identity chokepoint.** It has since absorbed delegation redirection, a cross-user deny guard, workboard board-scoping, and conversation-id routing. That's a coherent set of responsibilities — but nobody *decided* it should be one file, it just grew from ~40 to ~330 lines one commit at a time. I'd name and document it as "the per-agent host-side identity layer" from the start, so its scope is a choice rather than an accident.

**Finish the cleanup.** Two follow-ups are still open in the source doc. The chat and voice bridges still inject the identity token into the prompt as a fallback — redundant now that the hook overwrites it — and `auth_token` is still a declared field on the tool input schema. Once the hook is proven in production, both should go: drop `auth_token` from the schema, and slim the now-pointless token out of the bridge prompts. Leaving a fallback in place feels safe, but a fallback the model can still fill is a value the model can still get wrong.

## The takeaway

If your model has to copy a secret, it will eventually get it wrong — and the calls you never see, the ones subagents make, will get it wrong 100% of the time. Move identity out of the prompt and into a host-side `before_tool_call` hook: deterministic, per-agent, each agent keeps its own scopes, and the model can't hallucinate what it never handles.

---

*Next up: #15 — Multi-agent topology: 7 agents per user, delegation, and the failure modes.*
