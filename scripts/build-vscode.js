import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { bundledValidator } from './bundle-validator.js';

const root = new URL('../', import.meta.url);
const extension = new URL('extensions/vscode/', root);
mkdirSync(new URL('dist/', extension), { recursive: true });
copyFileSync(new URL('LICENSE', root), new URL('LICENSE', extension));
await build({
  entryPoints: [new URL('src/index.js', root).pathname],
  outfile: new URL('dist/validator.cjs', extension).pathname,
  bundle: true, platform: 'node', format: 'cjs', target: 'node22', minify: true,
  plugins: [bundledValidator()], legalComments: 'linked',
});
console.log('VS Code preview built in extensions/vscode (schema and dependencies embedded).');
