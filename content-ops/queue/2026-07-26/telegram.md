*New on the blog: the auth bug that made our helper agents go silent.*

Every AI agent here proves who it is to the backend with a token. We used to make the model type that token into every call — so it sometimes typo'd it, and the specialist helper agents (the ones a task gets handed off to) never received one at all. That's why delegated jobs died with no error. The fix: a small host-side hook now injects the right token for each agent automatically, before the call ever leaves the machine — deterministic, and every agent keeps its own permissions.

https://micelclaw.com/blog/agent-identity
image: queue/2026-07-26/gif-b2-delegation-concept.gif
