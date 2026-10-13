import React from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

// Carga Inter + JetBrains Mono vía FontFace API con delayRender (bloquea el
// frame hasta que la fuente está lista — sin FOUT en el render).
let loaded = false;

export const useBrandFonts = () => {
  const [handle] = React.useState(() => (loaded ? null : delayRender('fonts')));
  React.useEffect(() => {
    if (loaded || handle === null) return;
    const inter = new FontFace('InterVideo', `url(${staticFile('fonts/InterVariable.ttf')})`, {
      weight: '100 900',
    });
    const mono = new FontFace('JetBrainsMonoVideo', `url(${staticFile('fonts/JetBrainsMono-Regular.ttf')})`);
    Promise.all([inter.load(), mono.load()])
      .then((fonts) => {
        fonts.forEach((f) => document.fonts.add(f));
        loaded = true;
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
};
