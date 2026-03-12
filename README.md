# micelclaw.com

Landing page for [Micelclaw OS](https://micelclaw.com) — a self-hosted
AI productivity OS that runs on your hardware.

## Stack

Static HTML + CSS + vanilla JS. Deployed on Cloudflare Pages.

## Development

Just open `index.html` in a browser. No build step needed.

## Deployment

Auto-deployed via Cloudflare Pages on push to `main`.

## Waitlist

Email capture is handled by a Cloudflare Worker (`micelclaw-waitlist`)
with KV storage. The form in `index.html` POSTs to the worker endpoint.

## License

Copyright (c) 2026 Micelclaw (Víctor García Valdunciel). All rights reserved.
