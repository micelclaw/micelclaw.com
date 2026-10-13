# Reddit — 2026-08-05 · nivel 1 (subs tranquilos)

Este es el que hay que probar: **r/docker publica 2 posts al día**, así que el filtro es mucho más
flojo que el de r/selfhosted, que te retiró el anterior.

Todo lo que empieza por ▸ son notas mías: **no forma parte del comentario**.

---

## 1 · r/docker — varios Postgres, ¿cuestan más recursos?

### 🔗 [ABRIR EL HILO Y COMENTAR](https://www.reddit.com/r/docker/comments/1vg35id/can_anyone_help_me_understand_about_running/)

Comentario:

Two things nobody's mentioned yet that answer your actual question.

Disk: two Postgres containers from the same image don't cost you two images. Docker stores image layers once, so the second container adds only its data volume. docker images will still show a single postgres entry.

RAM: the cost of a second instance isn't your app, it's Postgres' own defaults — shared_buffers is 128MB out of the box. So you're looking at a couple hundred MB per extra instance, not gigabytes.

And to your follow-up about copy-pasting a guide's compose file: yes, you'll get two separate stacks, each with its own Postgres and its own network. That's the normal outcome and it's fine. Sharing one instance means both apps' migrations and version upgrades are coupled — the day you upgrade Postgres for app 1, app 2 comes along whether it's ready or not. That coupling costs you more than the RAM does.

▸ **Por qué este:** 1,2 h de antigüedad cuando lo detecté, en un sub de 2 posts/día. Hay 10
comentarios y **dos se contradicen**: uno recomienda un Postgres con dos esquemas, otro separarlos.
Nadie ha respondido lo que el chaval preguntaba —*cuánto* cuesta de verdad— ni su duda de novato
sobre qué pasa si copia y pega un compose de un tutorial. Y uno le ha contestado *"study the
fundamentals"*, así que una respuesta clara destaca sola.
▸ **Riesgo:** bajo. Las dos afirmaciones son comportamiento documentado de Docker y de Postgres: las
capas de imagen se almacenan una vez, y `shared_buffers` viene en 128MB por defecto. Lo de acoplar
las actualizaciones es razonamiento, y va como razonamiento.
▸ **No medido:** no he podido darte una cifra de RAM medida en tu caja porque tu Postgres no corre
en contenedor (`claw-firefly-db` lleva 5 semanas parado). Por eso el comentario no cita números
propios, solo el valor por defecto documentado.

---

▸ **Segunda opción, por si esa no cuaja:** r/HomeServer, *"Debian server for NAS OS? (want
details)"* — 9,8 h, alguien que deja OMV porque quiere trastear en la terminal. Cae de lleno en lo
tuyo (Debian, ZFS, SMB/NFS). Dímelo y lo preparo.
▸ Los demás candidatos, en `2026-08-05-reddit-candidatos.json`.
