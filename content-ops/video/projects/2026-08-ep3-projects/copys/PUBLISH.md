# Episode 3 — publishing runbook

Status: **YouTube long + Short and social derivatives published 2026-08-20; TikTok inbox pending manual publish.**

Publication is gated on presenting both masters and receiving `approved:true`.

Technical QA completed on 2026-08-07; horizontal correction revalidated on 2026-08-20:

- Horizontal: 1920×1080, 152.1 s, H.264 High/AAC, 30 fps, faststart, −14.8 LUFS, −1.3 dBFS true peak.
- Horizontal correction: native-scale continuous drag verified in source and master; every camera scene checked at start, midpoint and end with full-frame coverage and no exposed black canvas.
- Vertical: 1080×1920, 38.4 s, H.264 High/AAC, 30 fps, −14.9 LUFS; `video-gate` passed.
- Vertical no-music: 1080×1920, 38.4 s, −14.6 LUFS; `video-gate` passed.
- Signature card verified through the API in Ready with high priority, the August 8 due date and all three checklist items.

| Network | Format | Current state |
|---|---|---|
| YouTube long | 1920×1080 | published: https://youtu.be/J2LdfMXvyq0 |
| YouTube Short | 1080×1920 | published: https://youtube.com/shorts/Lj-DQytfETk?feature=share |
| Instagram | native Reel | published 2026-08-20 |
| Facebook | native video | published 2026-08-20 |
| Telegram | native video | published 2026-08-20 |
| Mastodon | native video + alt | published 2026-08-20 |
| Bluesky | link + card | published 2026-08-20 |
| TikTok | no-music draft | uploaded to inbox; María must complete it |
| X | manual draft | delivered to María by Telegram |

## Expected deliverables

| Piece | Path | Specification |
|---|---|---|
| Horizontal master | `_artifacts/video/2026-08-ep3-projects/exports/ep3-projects.mp4` | H.264/AAC, 1920×1080, 145–160 s, faststart, −14±1 LUFS |
| Vertical master | `_artifacts/video/2026-08-ep3-projects-vertical/exports/ep3-projects-vertical.mp4` | H.264/AAC, 1080×1920, 35–42 s, −14±1 LUFS |
| TikTok master | `_artifacts/video/2026-08-ep3-projects-vertical/exports/ep3-projects-vertical-nomusic.mp4` | same vertical cut, no music |
| Thumbnail | `_artifacts/video/2026-08-ep3-projects/thumbs/duo-ep3.png` | duo, 1280×720 |
| Vertical cover | `_artifacts/video/2026-08-ep3-projects/thumbs/duo-ep3-cover.png` | 1080×1920 |
| Thumbnail QA | `_artifacts/video/2026-08-ep3-projects/thumbs/duo-ep3-qa120.png` | contact sheet at 120 px |
| Captions | `projects/2026-08-ep3-projects/subs/captions.srt` | English |
| Word timings | `projects/2026-08-ep3-projects/subs/words.json` | aligned word timings |

## Gate checklist

- [ ] Horizontal and vertical masters reviewed by the user.
- [ ] User supplied `approved:true`.
- [ ] YouTube URL replaces `<youtube-link>` in every copy.
- [ ] Playlist URL replaces `<link-playlist>` when available.
- [ ] Publish date replaces `<publish-date>` in hosted-media paths.
- [ ] TikTok uses only the `-nomusic` master and María is notified.
- [ ] X remains a manual draft for María.

No commit, push, upload or publication is part of the preparation phase.
