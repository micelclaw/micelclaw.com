# Micelclaw OS Ep. 3 — Projects: boards that move from chat

## Production contract

- Language: English.
- Voice: Kokoro `am_michael`; calm engineer, first-person plural, no hype.
- Target duration: 145–160 seconds.
- Pacing: hold for 2–3 seconds after every meaningful action.
- Signature segment: prompt → visible tool calls → entity chip → click the chip → land on the exact Projects card, all on camera.
- Next episode: Contacts.
- Phase gate: this document and `storyboard.json` must be approved before staging or capture begins.

## Scene script

| Scene | Target | Picture and action | Voiceover |
|---|---:|---|---|
| `cold` | 12 s | Open the populated Valencia Beach Show board. Travel across the five columns and settle on `Order shells`. No mutation in this shot. | **The Valencia beach show has stopped being a pile of follow-ups. Every job is visible now. Every deadline has a place. And when the plan moves, the board moves with it.** |
| `card` | 4 s | Series card: `Ep. 3 · Projects`, with the standard thud and chime. | No voiceover. |
| `tour1-board` | 18 s | Show Backlog, Ready, In Progress, Review, and Done. Hold on dates, priorities, and checklist progress. Drag `Order shells` from In Progress to Done and hold on the result. | **Backlog. Ready. In progress. Review. Done. Priorities, dates, and checklist progress are visible without opening a thing. And when the work changes state, you move the card. That is the whole form.** |
| `tour2-detail` | 19 s | Open `Firing sequence`. Show its summary fields and checklist, scroll, then expand Dependencies and Linked Items. | **Open one card, and the detail is already there: what it means, how urgent it is, when it is due, what is checked off, what blocks it, and which records belong beside it.** |
| `tour3-views` | 18 s | Switch through Table, Gantt, Calendar, and Dashboard. Leave each view readable for 2–3 seconds. | **The same work can become a table, a calendar, a Gantt plan, or a dashboard. Nothing is copied between them. The board changes shape. The data stays put.** |
| `chat1-prompt` | 15 s | In a fresh Francis conversation with Insights collapsed, type and submit the approved prompt. | **Now, from the chat. We ask Francis for one thing: add a high-priority card called Print run of show, due Saturday, with three checks. We never open Projects.** |
| `chat2-result` | 20 s | Stay in the same take. Show the completed response, visible tool pills, and the new `Print run of show` chip. | **Francis finds the right board, creates the card, and builds the checklist. The tool calls stay visible, so we can see what changed. Then the new card comes back as a chip.** |
| `chat3-chip` | 16 s | Click the chip in that same take. Hold after navigation on the exact card and its checklist. | **And the chip is the door. Click it, and we land on the exact card: the right board, the right deadline, and all three checks waiting. The conversation has become work we can act on.** |
| `connect` | 18 s | Open `Order shells`, expand Linked Items, then hold first on the rain note and then on Professor Flash McBang. | **The board does not live alone. The rain plan from Notes sits beside the work. The supplier sits there too. Next week, we follow those people into Contacts — the crew and companies behind the show.** |
| `outro` | 12 s | Standard outro with `Next: Ep. 4 — Contacts`. | **That's Projects — boards that move from chat, on your own hardware. Next week: Contacts.** |

## Dry-duration result

Measured with `.venv/bin/python scripts/10-tts.py --project 2026-08-ep3-projects --dry-durations` on 2026-08-07:

| Scene | Voice | Final window |
|---|---:|---:|
| `cold` | 10.82 s | 12.12 s |
| `card` | 0.00 s | 4.00 s |
| `tour1-board` | 13.23 s | 18.00 s |
| `tour2-detail` | 11.26 s | 19.00 s |
| `tour3-views` | 10.30 s | 18.00 s |
| `chat1-prompt` | 10.84 s | 15.00 s |
| `chat2-result` | 11.46 s | 20.00 s |
| `chat3-chip` | 11.76 s | 16.00 s |
| `connect` | 13.23 s | 18.00 s |
| `outro` | 5.67 s | 12.00 s |
| **Total** |  | **152.12 s** |

Every voiced scene fits inside its visual floor. The remaining time is intentional reading and action hold time, not additional narration.

## Exact on-camera prompt

> Reply in English. In the Projects module, on the Valencia Beach Show board, create a high-priority card called "Print run of show" in Ready, due Saturday, August 8, with this checklist: crew call times, firing order, and weather sign-off.

## Chat take and offsets

`chat1-prompt` is the only chat capture. It records the complete sequence in one continuous take: typing, submission, agent response, tool pills, chip, and chip click. During production:

1. Capture `chat1-prompt` only after the board has been reset to its baseline and the demo conversation list is clean.
2. Copy its footage file to `chat2-result.mp4` and `chat3-chip.mp4`; do not link the whole footage directory.
3. Read `actions.json` and inspect the raw take to replace the provisional offsets `5`, `88`, and `132` seconds with the real starts of the prompt, completed response, and chip click.
4. Keep the chip click inside the raw take so the navigation shown by `chat3-chip` is the actual result of the recorded agent action.

## Step 1 acceptance checklist

- [ ] Ten scenes in the fixed series order: cold open, series card, three tour beats, three chat beats, connection, outro.
- [ ] Narration remains within 145–160 seconds after `--dry-durations`.
- [ ] Every meaningful screen state gets a 2–3 second hold.
- [ ] No invented metric or unsupported product claim.
- [ ] The chat prompt creates one card with one embedded three-item checklist.
- [ ] Tool pills, chip, and chip navigation are visible in the planned footage.
- [ ] The outro announces Contacts as Episode 4.

## Deferred until approval

No Paco staging, authentication refresh, agent conversation cleanup, capture, audio generation, rendering, vertical project, thumbnail, copywriting, publication asset, commit, push, or publication is part of Step 1.
