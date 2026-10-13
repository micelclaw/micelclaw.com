A self-hosted "personal OS" isn't one service — it's 40 pretending to be one. We unified Docker + systemd + internal workers + Ollama into one process table, with a RAM budget engine that decides what runs, what waits, and what gets evicted on an 8GB box.

https://micelclaw.com/blog/process-manager/
#selfhosted #docker #homelab #devops
image: queue/2026-07-22/ig-process-manager-2.jpg
alt: Micelclaw's process manager — 40 services (Docker, systemd, Ollama, internal workers) in one table with live CPU, memory, GPU and VRAM.
