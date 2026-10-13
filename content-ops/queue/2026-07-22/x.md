1/ A self-hosted "personal OS" isn't one service. It's ~40 — Docker, systemd, Ollama, internal workers — pretending to be one. Here's how we run them all on an 8GB box. 🧵

2/ First problem: visibility. Four systems, four interfaces. We unified them into one table with one namespace: docker:claw-mailu-imap, systemd:postgresql, internal:scheduler.

3/ Then a RAM budget engine: before starting an on-demand service it checks the budget, and if it's full it evicts the longest-idle one. Always-on services (mail, DB) are never touched.

4/ Lifecycle policies do the rest: always-on / on-demand / scheduled / triggered. 5 always-on, 22 on-demand, 8 scheduled — but usually only 2-3 on-demand are actually running.

5/ Result: 40 services on 8GB, and you see one coherent system instead of a pile of containers.

6/ Full write-up (with the numbers): https://micelclaw.com/blog/process-manager/

[visual: attach queue/2026-07-22/ig-process-manager-2.jpg to tweet 1]
