import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { bundledValidator } from './bundle-validator.js';

const root = new URL('../', import.meta.url);
const publicDirectory = new URL('website/public/', root);
const generatedDirectory = new URL('website/src/generated/', root);
mkdirSync(publicDirectory, { recursive: true });
mkdirSync(generatedDirectory, { recursive: true });

for (const [source, target] of [
  ['docs/openenv.svg', 'openenv.svg'],
  ['SPEC.md', 'SPEC.md'],
  ['schemas/openenv-0.1.0.schema.json', 'openenv-0.1.0.schema.json'],
  ['examples/openenv.yaml', 'openenv.yaml'],
  ['examples/openenv.json', 'openenv.json'],
]) {
  copyFileSync(new URL(source, root), new URL(target, publicDirectory));
}

await build({
  entryPoints: [new URL('src/index.js', root).pathname],
  outfile: new URL('validator.js', generatedDirectory).pathname,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  plugins: [bundledValidator({ browser: true })],
  legalComments: 'linked',
});

console.log('Prepared local reference assets and browser validator for Astro.');
