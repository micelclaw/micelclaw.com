highlight: Productividad

Módulo 1 de 12 — Drive. Notas para revisar; nada de esto se publica (una story no lleva pie).

INCOMPLETA: faltan los fotogramas 6 y 7. El 7 (chat con el agente) está BLOQUEADO — ver abajo.
No publicar hasta cerrarlos: el destacado admite 100 stories y una tanda coja gasta huecos.

frame_url: https://micelclaw.com/social/2026-08-20/story-drive-1.jpg
alt: Portada del módulo Drive con tres características: encuentra copias, devuelve la versión anterior, miniaturas listas.
frame_url: https://micelclaw.com/social/2026-08-20/story-drive-2.jpg
alt: La carpeta de una empresa pequeña en Drive, con sus ocho departamentos y una foto con miniatura.
frame_url: https://micelclaw.com/social/2026-08-20/story-drive-3.jpg
alt: La pantalla de duplicados: la misma foto en tres carpetas, una de ellas con otro nombre.
frame_url: https://micelclaw.com/social/2026-08-20/story-drive-4.jpg
alt: El historial de versiones de un documento, con tres versiones fechadas y una anotada antes de la revisión de seguridad.
frame_url: https://micelclaw.com/social/2026-08-20/story-drive-5.jpg
alt: La pestaña Recent con la sección Hot Now, donde los ficheros más abiertos suben solos.
frame_url: https://micelclaw.com/social/2026-08-20/story-drive-8.jpg
alt: Cierre: autoalojado en tu propia máquina, próximamente en micelclaw.com, mañana el módulo Contactos.

---

## Fotograma 6 — pendiente

Una capacidad más de Drive. Descartadas por falta de datos: Shared y Trash salen vacías.
Candidata viva: Starred. Por verificar antes de componerla.

## Fotograma 7 — BLOQUEADO (chat con el agente)

Tres hallazgos apilados, ninguno inventado:

1. **Francis no tiene la skill de Ficheros.** Al pedirle crear una carpeta intentó auto-asignársela
   y saltó una tarjeta de aprobación L2 (`skills.assign`).
2. **Sin la skill, responde mal**: dijo que necesitaba «instalar el plugin de Google Drive». Drive es
   un módulo propio; se inventó una integración externa. En una story eso sería desastroso.
3. **Darwin sí tiene Ficheros, pero su modelo no responde**: `mistral/devstral-medium-latest`
   devuelve **402 (pago requerido)** — créditos agotados.

Además, el selector de agentes del chat **anuncia capacidades que el agente no tiene**: Atlas se
describe como «Productividad — archivos, fotos, office, proyectos, diagramas» y solo tiene
Inventory; Francis se describe con «notas, diario, bookmarks» y no tiene ninguna de las tres.

No se toca el modelo ni las skills de ningún agente sin decisión del usuario.
