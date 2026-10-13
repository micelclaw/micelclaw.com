# Platform: Telegram (channel)

**Audience:** mixed — channel followers / early adopters. **Angle:** announcements + digests, close and personal
("here's what's new"). Medium-low jargon.

## Mechanism (Bot API — trivial, free)

```
POST https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage
{ "chat_id": "{TELEGRAM_CHAT_ID}", "text": "<text>", "parse_mode": "Markdown", "disable_web_page_preview": false }
```

With an image: `POST .../sendPhoto` with `photo` (URL or multipart) + `caption`.

> Note: this is a **dedicated content bot**, NOT the Micelclaw OS product's Telegram bridge (that mirrors the
> user's real account). Keep them separate.

## Setup

1. Talk to **@BotFather** → `/newbot` → get the **bot token** → `.env.local` as `TELEGRAM_BOT_TOKEN`.
2. Create a public channel (e.g. `@micelclaw`) and **add the bot as an administrator** with "Post messages".
3. Get the `chat_id`:
   - For a public channel you can use `@channelusername` directly as `TELEGRAM_CHAT_ID`.
   - For the numeric id (`-100…`): post something, then `GET https://api.telegram.org/bot{TOKEN}/getUpdates`
     and read `channel_post.chat.id`.

## Format

- Markdown, up to ~4096 chars (keep it tight: a short intro + the link + a couple of bullets).
- Link preview ON (it renders the blog card). Emojis fine but sparse.
- No hashtags (Telegram doesn't use them for discovery).

## Publish command

```bash
node scripts/post-telegram.mjs --file queue/<date>/telegram.md
```

The daily/weekly ops notifications also go through this bot (see `NOTIFY_TELEGRAM_CHAT_ID`) — point that at a
private chat with yourself, not the public channel.

## Native video (added 2026-07-25)

A `video:` line (local file path) posts with `sendVideo` + `supports_streaming` instead of a photo
or plain text. Two hard limits: the Bot API caps uploads at **50 MB** (the script fails fast above
that) and media captions at **1024 chars** (longer text is truncated with a warning) — unlike the
4096 of a text post. Vertical 9:16 clips play inline in the channel.

```
video: /abs/path/to/clip.mp4
```
