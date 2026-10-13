import { readFileSync } from 'node:fs';

// Embed the exact reference schema so builds need no runtime filesystem lookup.
// Browser builds retain the same parser/linter and use TextEncoder for UTF-8 size.
export function bundledValidator({ browser = false } = {}) {
  return {
    name: 'openenv-reference-validator',
    setup(build) {
      build.onLoad({ filter: /[/\\]src[/\\]index\.js$/ }, ({ path }) => {
        let contents = readFileSync(path, 'utf8');
        const schema = readFileSync(new URL('../schemas/openenv-0.1.0.schema.json', import.meta.url), 'utf8');
        const importStatement = "import { readFileSync } from 'node:fs';";
        const schemaStatement = "JSON.parse(readFileSync(new URL('../schemas/openenv-0.1.0.schema.json', import.meta.url), 'utf8'))";
        const sizeStatement = "Buffer.byteLength(source, 'utf8')";
        for (const expected of [importStatement, schemaStatement, ...(browser ? [sizeStatement] : [])]) {
          if (!contents.includes(expected)) throw new Error('Reference validator changed; update the bundling adapter.');
        }
        contents = contents.replace(importStatement, '').replace(schemaStatement, schema.trim());
        if (browser) contents = contents.replace(sizeStatement, 'new TextEncoder().encode(source).byteLength');
        return { contents, loader: 'js' };
      });
    },
  };
}
