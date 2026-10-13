import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as reference from '../src/index.js';
import * as browser from '../website/src/generated/validator.js';

const require = createRequire(import.meta.url);
const extension = require('../extensions/vscode/dist/validator.cjs');
const yaml = readFileSync(new URL('../examples/openenv.yaml', import.meta.url), 'utf8');
const json = readFileSync(new URL('../examples/openenv.json', import.meta.url), 'utf8');
for (const implementation of [browser, extension]) {
  for (const [source, format] of [[yaml, 'yaml'], [json, 'json'], [yaml.replace('default: 8080', 'default: 70000'), 'yaml'], [yaml.replace('minLength: 1', 'minLength: 3\n    maxLength: 1'), 'yaml']]) {
    const spec = reference.parseSpec(source, { format });
    assert.deepEqual(implementation.parseSpec(source, { format }), spec);
    assert.deepEqual(implementation.lintSpec(spec), reference.lintSpec(spec));
  }
  for (const [source, format, code] of [['a: 1\na: 2', 'yaml', 'PARSE_DOCUMENT'], ['{"a":1,}', 'json', 'PARSE_JSON'], ['a: &x 1\nb: *x', 'yaml', 'PARSE_YAML_FEATURE'], ['#'.repeat(1024 * 1024) + 'я', 'yaml', 'PARSE_SIZE']]) {
    assert.throws(() => implementation.parseSpec(source, { format }), error => error.code === code);
  }
}
const manifest = JSON.parse(readFileSync(new URL('../extensions/vscode/package.json', import.meta.url), 'utf8'));
assert.equal(manifest.contributes.commands[0].command, 'openenv.openPreviewToSide');
assert.equal(manifest.capabilities.untrustedWorkspaces.supported, true);
console.log('Browser and VS Code bundles match reference parsing/linting; manifest and offline bundles verified.');
