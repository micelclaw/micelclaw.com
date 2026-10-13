// brand.ts — tokens de marca Micelclaw para el vídeo.
// Regla de acento MIXTO (decisión del usuario): cian en title cards/outro/logo
// (marca web), ámbar en lower-thirds/karaoke/cursor (convive con la UI del dash).
export const BRAND = {
  bg: '#050509',
  surface: '#0e0e16',
  card: '#1a1a24',
  border: '#22232e',
  text: '#ededf4',
  dim: '#9aa0aa',
  amber: '#d4a017',
  amberHover: '#e0b030',
  cyan: '#00c8ff',
  cyanBright: '#40dfff',
  fontSans: 'InterVideo',
  fontMono: 'JetBrainsMonoVideo',
} as const;

export const fontCss = `
@font-face {
  font-family: 'InterVideo';
  src: url('FONT_INTER') format('truetype');
  font-weight: 100 900;
}
@font-face {
  font-family: 'JetBrainsMonoVideo';
  src: url('FONT_MONO') format('truetype');
  font-weight: 400;
}
`;
