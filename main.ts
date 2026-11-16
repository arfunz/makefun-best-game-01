// WAYANG CLASH — the entrypoint make.fun runs.
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json with buildDossier from the kit's
// vendor/makefun-game.ts. Paths resolve from this file's own location, never
// from the working directory, and the output is byte-identical on every run.

import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// The gate needs 3 or 4 screenshots, each within the size cap, and the first
// by name is the cover. Refuse to hand in an entry whose shots are missing
// or oversized instead of letting the dossier build fail later.
function validateScreenshots(screenshotsDir) {
  const names = readdirSync(screenshotsDir).filter((name) => !name.startsWith('.')).sort();
  if (names.length < 3 || names.length > dossierCaps.screenshots.max) {
    throw new Error(`screenshots: expected 3 to ${dossierCaps.screenshots.max} images, found ${names.length}`);
  }
  for (const name of names) {
    const size = statSync(join(screenshotsDir, name)).size;
    if (size > dossierCaps.screenshots.max_bytes) {
      throw new Error(`screenshots: ${name} is ${size} bytes, over the ${dossierCaps.screenshots.max_bytes} byte cap`);
    }
  }
  console.log(`screenshots: ${names.length} images, cover is ${names[0]}`);
}

validateScreenshots(join(here, 'screenshots'));

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(join(here, 'game'), join(outputDir, 'game'), { recursive: true });
cpSync(join(here, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, dossierCaps);
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`WAYANG CLASH dossier written to ${join(outputDir, 'dossier.json')}`);
