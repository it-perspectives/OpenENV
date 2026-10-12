import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const tarball = resolve('dist', `it-perspectives-openenv-${version}.tgz`);
assert.ok(readdirSync('dist').includes(`it-perspectives-openenv-${version}.tgz`));
const directory = mkdtempSync(join(tmpdir(), 'openenv-consumer-'));
writeFileSync(join(directory, 'package.json'), '{"private":true,"type":"module"}\n');
const run = (command, args) => {
  const output = spawnSync(command, args, { cwd: directory, encoding: 'utf8' });
  assert.equal(output.status, 0, output.stderr || output.stdout);
  return output.stdout;
};
run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', tarball]);
writeFileSync(join(directory, 'consumer.js'), `
import assert from 'node:assert/strict';
import { parseSpec, lintSpec, checkEnvironment } from '@it-perspectives/openenv';
import schema from '@it-perspectives/openenv/schema' with { type: 'json' };
assert.equal(schema.properties.openenv.const, '${version}');
const spec = parseSpec('openenv: "${version}"\\ninfo: {title: Consumer, version: "1"}\\nvariables: {}');
assert.equal(lintSpec(spec).valid, true);
assert.equal(checkEnvironment(spec, {}).valid, true);
const arrays = { ...spec, variables: { LIST: { description: 'List.', type: 'array', delimiter: ',' } } };
assert.equal(lintSpec(arrays).valid, true);
assert.deepEqual(checkEnvironment(arrays, { LIST: 'a,b' }).values.LIST, ['a', 'b']);
delete arrays.variables.LIST.delimiter;
assert.equal(lintSpec(arrays).valid, false);
`);
run(process.execPath, ['consumer.js']);
assert.equal(run(join(directory, 'node_modules', '.bin', 'openenv'), ['--version']).trim(), version);
process.stdout.write('Packed npm package: imports, schema export, and CLI passed in an isolated consumer.\n');
