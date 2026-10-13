// tiktok-file.mjs — parser del `queue/<fecha>/tiktok.md`. En una lib porque lo necesitan DOS:
// `post-tiktok.mjs` (para publicar) y `publish-day.mjs` (para avisar a quien publica con la
// descripción a pegar). No se puede importar de post-tiktok: ese fichero ejecuta main() al
// importarse, o sea que importarlo publicaría.
export function parseTikTokFile(text) {
  const images = [];
  let title = '', cover = 0, videoUrl = '', videoPath = '', coverUrl = '';
  const body = [];
  for (const line of text.split('\n')) {
    let m;
    if ((m = line.match(/^image_url:\s*(.+)$/i))) images.push(m[1].trim());
    else if ((m = line.match(/^video_url:\s*(.+)$/i))) videoUrl = m[1].trim();
    else if ((m = line.match(/^video:\s*(.+)$/i))) videoPath = m[1].trim();
    else if ((m = line.match(/^title:\s*(.+)$/i))) title = m[1].trim();
    // `cover:` es un ÍNDICE y solo aplica a carruseles de FOTOS (cuál de las imágenes es la
    // portada); TikTok la usa sola. `cover_url:` (o `cover_file:`) es la PORTADA de un VÍDEO,
    // que la API del buzón no puede adjuntar → hay que pasársela a quien publica a mano.
    else if ((m = line.match(/^cover:\s*(\d+)$/i))) cover = Number(m[1]);
    else if ((m = line.match(/^cover_(?:url|file):\s*(.+)$/i))) coverUrl = m[1].trim();
    else body.push(line);
  }
  return { title, images, cover, coverUrl, videoUrl, videoPath, description: body.join('\n').trim() };
}
