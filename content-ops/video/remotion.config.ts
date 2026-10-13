import { Config } from '@remotion/cli/config';

// Reusar el chrome-headless-shell que Playwright ya tiene instalado (sin descargar otro Chrome).
Config.setBrowserExecutable(
  '/home/victor/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell',
);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
