Our tool catalogue was 508,782 bytes. About 133k tokens of it were the descriptions of TWO fields — repeated across 409 tools — that the model never fills in, because a host-side hook injects them.

Emptied those descriptions, moved a 211-char boilerplate out of 408 tool descriptions into the system prompt once.

278,533 bytes. −45.3%, zero capability lost. The whole change is deletion.

https://micelclaw.com/blog/agent-token-budget

#llm #selfhosted #optimization
image: queue/2026-08-02/budget-tech.jpg
alt: Dark card showing the context budget panel of an agent in the Micelclaw dashboard, with the bar reading 78k of 80k tokens (97%) and each installed app's token cost listed below.
