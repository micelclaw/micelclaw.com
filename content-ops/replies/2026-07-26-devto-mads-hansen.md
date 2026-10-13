# Respuesta a Mads Hansen — comentario en dev.to #13 (The MCP facade)

- **Destino**: comentario en https://dev.to/micelclaw/the-mcp-facade-how-agents-talk-to-the-backend-without-curl-3pmo
- **Estado**: LISTO PARA PUBLICAR (decisión del usuario 2026-07-26: publicar **sin** contar los hallazgos).
- **Voz**: `VOICE.md` §1 (inglés, primera persona del plural, ingeniero contando una decisión real, números
  y nombres reales, sin hype). Sin prometer fechas.
- Esta carpeta está a propósito FUERA de `queue/` (los scripts de publicación solo miran `queue/<fecha>/`).

## Qué se ha dejado FUERA a propósito (por si algún día se quiere ampliar)

Decisión del usuario: no contar en público los defectos que su revisión destapó. Concretamente NO se
mencionan (siguen anotados en `docs/roadmap/04_pending-debt.md` §Mads Hansen):

1. La carrera del **doble consumo de aprobación** (`markExecuted` era un UPDATE incondicional).
2. El **salto de nivel** dentro de un dominio concedido, que no se bloqueaba en la puerta.
3. Que el **fallback imprimía el token literal en el system prompt**, o sea que salía hacia el proveedor
   del modelo. El texto sí afirma —en positivo y sin confesar el pasado— que hoy el modelo no ve la
   credencial, que es cierto tras el arreglo.
4. Que **nadie ejecutaba la suite unitaria** (29 fallos fosilizados al cablear el script `test`).

Lo que SÍ se le reconoce es que sus cuatro escenarios son ahora una suite que corre contra la fachada:
le da el crédito de que su revisión tuvo efecto sin detallar qué encontró.

---

Thanks — this is a good comment, and both halves are aimed at the right place.

On the credential: you're describing almost exactly what we shipped three days after your comment, in
#14. A native `before_tool_call` hook fills `auth_token` host-side from a per-agent token map, keyed by
the calling agent. It overwrites whatever the model produced, and it also covers subagents — which
previously got no token at all, so delegated work just failed. The model no longer sees the credential
at any point in the flow.

The field is still *declared* in the tool schema, though, and that part isn't laziness — it's the SDK.
MCP validates tool arguments with a zod object in **strip** mode and hands the handler the
already-parsed args, so an *undeclared* parameter is dropped before the handler ever sees it, and the
host-side injection dies with it. We have a regression test pinned to that exact behaviour, because the
strip once broke approval-card routing and it took a while to find. What we did instead was make the
field `.optional()` and remove its description, so nothing in the schema invites the model to fill it.
The version you're describing — the parameter gone from the announced schema entirely — is on our list;
it needs the server bridged at a lower level than the convenience wrapper we use today, which is a
change we want to verify on its own rather than as a side effect.

Precedent that your stricter design does work, for what it's worth: our external n8n endpoint takes the
token from a header out-of-band, and there the model genuinely never touches bearer material.

Your second half was the more useful one, and less comfortable: we had no tests treating the facade as a
confused-deputy boundary. Session expiry was only ever exercised against the REST API directly, never
through the facade itself — which is the surface that actually holds the authority. Your four scenarios
are now a test suite that runs against it on every change. Thanks for the free review; this is the kind
of comment that's worth more than the post.
