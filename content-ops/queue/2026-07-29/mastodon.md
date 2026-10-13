Our coordinator agent kept delegating jobs to itself.

Cause: the delegation tool declares `agentId` optional — and with no description. The model fills in every parameter that was explained and omits the one that wasn't. Optional means the runtime doesn't complain: it spawns you.

A tool schema IS a prompt. An undocumented optional field is a contract clause in invisible ink.

https://micelclaw.com/blog/multi-agent-topology

#selfhosted #ai #llm
image: queue/2026-07-29/agents-tech.jpg
alt: Dark card. Title "The parameter the model could not see". Below, a code line reading agentId: Type.Optional(Type.String()) with the words "no description" highlighted in amber, and the caption "so the model omits it, and the runtime spawns you instead of the specialist".
