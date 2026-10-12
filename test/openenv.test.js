import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { stringify } from 'yaml';
import { checkEnvironment, lintSpec, parseSpec, SpecParseError } from '../src/index.js';

const example = JSON.parse(readFileSync(new URL('../examples/openenv.json', import.meta.url), 'utf8'));
const document = (variable = { description: 'Test variable.', type: 'string' }, name = 'VALUE') => ({ openenv: '0.1.0', info: { title: 'Test', version: '1.0.0' }, variables: { [name]: variable } });
const cliPath = new URL('../bin/openenv.js', import.meta.url).pathname;
const cli = (args, options = {}) => spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8', ...options });

test('YAML and JSON examples describe the same valid contract', () => {
  const yaml = parseSpec(readFileSync(new URL('../examples/openenv.yaml', import.meta.url), 'utf8'));
  const json = parseSpec(JSON.stringify(example), { format: 'json' });
  assert.deepEqual(yaml, json);
  assert.deepEqual(lintSpec(yaml), { valid: true, diagnostics: [] });
});

for (const [name, source, format] of [
  ['duplicate YAML fields', 'openenv: "0.1.0"\nopenenv: "0.1.0"', 'yaml'],
  ['duplicate JSON fields', '{"openenv":"0.1.0","openenv":"0.1.0"}', 'json'],
  ['escaped duplicate JSON fields', '{"a":1,"\\u0061":2}', 'json'],
  ['non-JSON syntax in JSON files', '{"a": 1,}', 'json'],
  ['multiple YAML documents', '---\na: 1\n---\nb: 2', 'yaml'],
  ['YAML aliases', 'a: &a hello\nb: *a', 'yaml'],
  ['YAML merge keys', 'a: {<<: {b: 1}}', 'yaml'],
  ['YAML tags', 'a: !!str hello', 'yaml'],
  ['YAML 1.1', '%YAML 1.1\n---\na: yes', 'yaml'],
  ['non-string keys', '123: value', 'yaml'],
  ['non-finite numbers', 'a: .inf', 'yaml'],
  ['unsafe integers', '{"a":9007199254740993}', 'json'],
  ['oversized input', ' '.repeat(1024 * 1024 + 1), 'yaml']
]) test(`parser rejects ${name}`, () => assert.throws(() => parseSpec(source, { format }), SpecParseError));

test('parser reports no source values on syntax errors', () => {
  try { parseSpec('TOKEN: [sensitive-sentinel'); assert.fail(); }
  catch (error) { assert.ok(!error.message.includes('sensitive-sentinel')); }
});

test('standard YAML scalar rules preserve quoted string values', () => {
  const parsed = parseSpec('a: "true"\nb: true\nc: "8080"\nd: 8080');
  assert.deepEqual(parsed, { a: 'true', b: true, c: '8080', d: 8080 });
});

for (const [name, mutate] of [
  ['unsupported version', (s) => { s.openenv = '9.0.0'; }],
  ['unknown root property', (s) => { s.variable = {}; }],
  ['invalid environment name', (s) => { s.variables['NOT-PORTABLE'] = s.variables.VALUE; }],
  ['missing description', (s) => { delete s.variables.VALUE.description; }],
  ['unknown variable property', (s) => { s.variables.VALUE.requred = true; }],
  ['constraints on wrong type', (s) => { s.variables.VALUE.minimum = 1; }],
  ['invalid regex', (s) => { s.variables.VALUE.pattern = '['; }],
  ['contradictory lengths', (s) => { Object.assign(s.variables.VALUE, { minLength: 5, maxLength: 2 }); }],
  ['contradictory bounds', (s) => { Object.assign(s.variables.VALUE, { type: 'number', minimum: 5, maximum: 2 }); }],
  ['incorrect default type', (s) => { s.variables.VALUE.default = true; }],
  ['incorrect enum type', (s) => { s.variables.VALUE.enum = [true]; }],
  ['duplicate enum values', (s) => { s.variables.VALUE.enum = ['a', 'a']; }],
  ['default outside enum', (s) => { Object.assign(s.variables.VALUE, { enum: ['a'], default: 'b' }); }],
  ['example outside constraints', (s) => { Object.assign(s.variables.VALUE, { minLength: 3, examples: ['x'] }); }],
  ['invalid URI default', (s) => { Object.assign(s.variables.VALUE, { format: 'uri', default: 'invalid uri' }); }],
  ['sensitive default', (s) => { Object.assign(s.variables.VALUE, { sensitive: true, default: 'sentinel' }); }],
  ['sensitive examples', (s) => { Object.assign(s.variables.VALUE, { sensitive: true, examples: ['sentinel'] }); }],
  ['sensitive enum', (s) => { Object.assign(s.variables.VALUE, { sensitive: true, enum: ['sentinel'] }); }],
  ['null default', (s) => { s.variables.VALUE.default = null; }],
  ['unsafe numeric default', (s) => { Object.assign(s.variables.VALUE, { type: 'integer', default: Number.MAX_SAFE_INTEGER + 1 }); }]
]) test(`linter rejects ${name}`, () => {
  const spec = document(); mutate(spec);
  const checked = lintSpec(spec);
  assert.equal(checked.valid, false);
  assert.ok(checked.diagnostics.every((item) => !item.message.includes('sentinel')));
});

test('extensions and empty variable maps are supported', () => {
  const spec = document(); spec['x-owner'] = 'platform'; spec.info['x-source'] = 'example'; spec.variables.VALUE['x-stage'] = 'runtime';
  assert.equal(lintSpec(spec).valid, true);
  spec.variables = {};
  assert.equal(lintSpec(spec).valid, true);
});

test('lowercase names are portable but produce a warning', () => {
  const checked = lintSpec(document(undefined, 'lowercase'));
  assert.equal(checked.valid, true);
  assert.equal(checked.diagnostics[0].severity, 'warning');
});

test('string constraints count Unicode code points and use Unicode regex syntax', () => {
  assert.equal(checkEnvironment(document({ description: 'Text.', type: 'string', minLength: 1, maxLength: 1 }), { VALUE: '😀' }).valid, true);
  assert.equal(lintSpec(document({ description: 'Text.', type: 'string', pattern: '^\\p{Letter}+$', default: 'abc' })).valid, true);
});

test('environment checking decodes values, uses defaults, and leaves input untouched', () => {
  const environment = { DATABASE_URL: 'postgresql://example.invalid/orders', API_TOKEN: 'fake-test-token', PORT: '9000', FEATURE_ORDERS_ENABLED: 'false', OTHER: 'ignored' };
  const before = structuredClone(environment);
  const checked = checkEnvironment(example, environment);
  assert.equal(checked.valid, true);
  assert.equal(checked.values.PORT, 9000);
  assert.equal(checked.values.FEATURE_ORDERS_ENABLED, false);
  assert.equal(checked.values.LOG_LEVEL, 'info');
  assert.ok(!Object.hasOwn(checked.values, 'OTHER'));
  assert.deepEqual(environment, before);
});

test('requiredness is checked after default resolution', () => {
  const spec = document({ description: 'Port.', type: 'integer', required: true, default: 8080 });
  assert.equal(checkEnvironment(spec, {}).values.VALUE, 8080);
  delete spec.variables.VALUE.default;
  assert.equal(checkEnvironment(spec, {}).diagnostics[0].code, 'ENV_REQUIRED');
});

test('empty strings are present values; they do not select defaults', () => {
  assert.equal(checkEnvironment(document({ description: 'Text.', type: 'string', required: true, default: 'fallback' }), { VALUE: '' }).values.VALUE, '');
  assert.equal(checkEnvironment(document({ description: 'Text.', type: 'string', minLength: 1 }), { VALUE: '' }).valid, false);
  assert.equal(checkEnvironment(document({ description: 'Number.', type: 'integer', default: 1 }), { VALUE: '' }).valid, false);
});

for (const format of ['json', 'yaml']) {
  test(`array delimiter is required and restricted in ${format} contracts`, () => {
    const parsed = (variable) => {
      const spec = document(variable);
      return parseSpec(format === 'json' ? JSON.stringify(spec) : stringify(spec), { format });
    };
    const variable = { description: 'List.', type: 'array', default: [] };
    assert.equal(lintSpec(parsed(variable)).valid, false);
    for (const delimiter of ['', ';', '\t', '\n', '  ', 'comma', 'space', null, 1]) {
      assert.equal(lintSpec(parsed({ ...variable, delimiter })).valid, false);
    }
    for (const delimiter of [' ', ',']) {
      assert.equal(lintSpec(parsed({ ...variable, delimiter })).valid, true);
      for (const type of ['string', 'integer', 'number', 'boolean']) {
        assert.equal(lintSpec(parsed({ description: 'Scalar.', type, delimiter })).valid, false);
      }
    }
  });
}

for (const [delimiter, raw, expected] of [
  [',', 'a,b', ['a', 'b']],
  [' ', 'a b', ['a', 'b']],
  [',', 'a, b,,', ['a', ' b', '', '']],
  [' ', ' a  b ', ['', 'a', '', 'b', '']],
  [' ', 'a\tb\nc', ['a\tb\nc']],
  [',', 'true,123,😀', ['true', '123', '😀']],
  [',', 'a,a', ['a', 'a']],
  [',', '', []],
  [' ', '', []]
]) test(`array decoding preserves literal segments ${JSON.stringify([delimiter, raw])}`, () => {
  const spec = document({ description: 'List.', type: 'array', delimiter, required: true, default: ['fallback'] });
  const checked = checkEnvironment(spec, { VALUE: raw });
  assert.equal(checked.valid, true);
  assert.deepEqual(checked.values.VALUE, expected);
});

test('array literals contain only strings and satisfy whole-array enums', () => {
  const variable = { description: 'List.', type: 'array', delimiter: ',', default: ['a'], examples: [['b', 'c'], []], enum: [['a'], ['b', 'c'], []] };
  assert.equal(lintSpec(document(variable)).valid, true);
  assert.equal(checkEnvironment(document(variable), { VALUE: 'b,c' }).valid, true);
  assert.equal(checkEnvironment(document(variable), { VALUE: 'c,b' }).valid, false);
  for (const field of ['default', 'examples', 'enum']) {
    for (const value of ['a,b', [1], [true], [null], [{}], [['a']]]) {
      const literal = field === 'default' ? value : [value];
      assert.equal(lintSpec(document({ ...variable, [field]: literal })).valid, false);
    }
  }
  assert.equal(lintSpec(document({ ...variable, default: ['missing'] })).valid, false);
  assert.equal(lintSpec(document({ ...variable, examples: [['missing']] })).valid, false);
  assert.equal(lintSpec(document({ ...variable, enum: [['a'], ['a']] })).valid, false);
  assert.equal(lintSpec(document({ description: 'Scalar.', type: 'string', default: ['a'] })).valid, false);
});

test('array variables reject scalar constraints and sensitive literals', () => {
  const variable = { description: 'List.', type: 'array', delimiter: ',' };
  for (const [key, value] of Object.entries({ format: 'email', pattern: '^a$', minLength: 1, maxLength: 10, minimum: 1, maximum: 10 })) {
    assert.equal(lintSpec(document({ ...variable, [key]: value })).valid, false);
  }
  for (const field of ['default', 'examples', 'enum']) {
    assert.equal(lintSpec(document({ ...variable, sensitive: true, [field]: field === 'default' ? ['sentinel'] : [['sentinel']] })).valid, false);
  }
  assert.equal(checkEnvironment(document({ ...variable, sensitive: true }), { VALUE: 'a,b' }).valid, true);
});

test('array defaults resolve only absent values and do not share mutable arrays', () => {
  const spec = document({ description: 'List.', type: 'array', delimiter: ',', required: true, default: ['fallback'] });
  const checked = checkEnvironment(spec, {});
  assert.deepEqual(checked.values.VALUE, ['fallback']);
  checked.values.VALUE.push('changed');
  assert.deepEqual(spec.variables.VALUE.default, ['fallback']);
  assert.deepEqual(checkEnvironment(spec, {}).values.VALUE, ['fallback']);
  delete spec.variables.VALUE.default;
  assert.equal(checkEnvironment(spec, {}).diagnostics[0].code, 'ENV_REQUIRED');
  spec.variables.VALUE.required = false;
  assert.ok(!Object.hasOwn(checkEnvironment(spec, {}).values, 'VALUE'));
});

test('CLI checks array contracts in JSON and YAML without printing elements', () => {
  const directory = mkdtempSync(join(tmpdir(), 'openenv-array-tests-'));
  const spec = document({ description: 'List.', type: 'array', delimiter: ',', enum: [['array-sentinel', 'b']], required: true });
  for (const format of ['json', 'yaml']) {
    const filename = join(directory, `openenv.${format}`);
    writeFileSync(filename, format === 'json' ? JSON.stringify(spec) : stringify(spec));
    assert.equal(cli(['lint', filename]).status, 0);
    const checked = cli(['check', filename, '--format', 'json'], { env: { ...process.env, VALUE: 'array-sentinel,b' } });
    assert.equal(checked.status, 0, checked.stderr);
    assert.ok(!checked.stdout.includes('array-sentinel'));
    const invalid = cli(['check', filename, '--format', 'json'], { env: { ...process.env, VALUE: 'array-sentinel,c' } });
    assert.equal(invalid.status, 1);
    assert.ok(!invalid.stdout.includes('array-sentinel'));
  }
});

for (const [type, raw] of [['integer', '01'], ['integer', '+1'], ['integer', '1e2'], ['integer', ' 1'], ['integer', '1.5'], ['integer', '9007199254740992'], ['number', 'NaN'], ['number', '1e999'], ['number', '.5'], ['number', '0x10'], ['boolean', 'TRUE'], ['boolean', '1']]) {
  test(`environment rejects ${type} input ${raw}`, () => {
    assert.equal(checkEnvironment(document({ description: 'Value.', type }), { VALUE: raw }).valid, false);
  });
}

test('number values support decimal fractions and scientific notation', () => {
  const spec = document({ description: 'Number.', type: 'number' });
  assert.equal(checkEnvironment(spec, { VALUE: '1.25e-2' }).values.VALUE, 0.0125);
});

test('runtime constraints are enforced without echoing values', () => {
  const spec = document({ description: 'Token.', type: 'string', sensitive: true, pattern: '^allowed$' });
  const checked = checkEnvironment(spec, { VALUE: 'sensitive-sentinel' });
  assert.equal(checked.valid, false);
  assert.ok(!Object.hasOwn(checked, 'values'));
  assert.ok(!JSON.stringify(checked).includes('sensitive-sentinel'));
});

test('environment accepts only own string properties', () => {
  const spec = document({ description: 'Value.', type: 'string', required: true });
  assert.equal(checkEnvironment(spec, Object.create({ VALUE: 'inherited' })).valid, false);
  assert.equal(checkEnvironment(spec, { VALUE: 123 }).valid, false);
  assert.equal(checkEnvironment(spec, null).valid, false);
});

test('prototype-like names do not affect object prototypes', () => {
  const spec = parseSpec(JSON.stringify(document({ description: 'Value.', type: 'string' }, '__proto__')), { format: 'json' });
  const checked = checkEnvironment(spec, JSON.parse('{"__proto__":"value"}'));
  assert.equal(checked.valid, true);
  assert.equal(Object.getPrototypeOf(checked.values), null);
  assert.equal(checked.values.__proto__, 'value');
});

test('CLI validates examples and emits a machine-readable report', () => {
  const output = cli(['lint', new URL('../examples/openenv.yaml', import.meta.url).pathname, '--format', 'json']);
  assert.equal(output.status, 0, output.stderr);
  assert.equal(JSON.parse(output.stdout).valid, true);
});

test('CLI warning policy and failure exit codes are predictable', () => {
  const directory = mkdtempSync(join(tmpdir(), 'openenv-tests-'));
  const filename = join(directory, 'warning.yml');
  writeFileSync(filename, stringify(document(undefined, 'lowercase')));
  assert.equal(cli(['lint', filename]).status, 0);
  assert.equal(cli(['lint', filename, '--warnings-as-errors']).status, 1);
  writeFileSync(filename, 'invalid: [');
  assert.equal(cli(['lint', filename]).status, 1);
  assert.equal(cli(['lint', join(directory, 'missing.json')]).status, 2);
  assert.equal(cli(['lint', filename, '--format', 'invalid']).status, 2);
  assert.equal(cli(['check', filename, filename]).status, 2);
  assert.equal(cli(['--version']).stdout.trim(), '0.1.0');
});

test('CLI runtime reports omit resolved values and secrets', () => {
  const filename = new URL('../examples/openenv.json', import.meta.url).pathname;
  const output = cli(['check', filename, '--format', 'json'], { env: { ...process.env, DATABASE_URL: 'postgresql://test.invalid/orders', API_TOKEN: 'sensitive-sentinel' } });
  assert.equal(output.status, 0, output.stderr);
  assert.equal(JSON.parse(output.stdout).valid, true);
  assert.ok(!output.stdout.includes('sensitive-sentinel'));
  assert.ok(!output.stdout.includes('postgresql://'));
});
