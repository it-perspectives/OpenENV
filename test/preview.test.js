import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { parseSpec, lintSpec } from '../src/index.js';

const require = createRequire(import.meta.url);
const { renderPreview } = require('../extensions/vscode/src/render.cjs');
const { createExtension, supported } = require('../extensions/vscode/src/extension.cjs');
const yaml = readFileSync(new URL('../examples/openenv.yaml', import.meta.url), 'utf8');

test('preview renders valid contract rules, array delimiter, deprecation and typed defaults', () => {
  const spec = parseSpec(yaml);
  spec.variables.PORT.deprecated = true;
  const html = renderPreview(spec, lintSpec(spec), 'testnonce');
  assert.match(html, /7 variables · 2 required · 2 sensitive/);
  assert.match(html, /array&lt;string&gt;/);
  assert.match(html, /delimiter: &quot;,&quot;/);
  assert.match(html, /maximum: 65535/);
  assert.match(html, /DEPRECATED/);
  assert.match(html, /style-src 'nonce-testnonce'/);
  assert.doesNotMatch(html, /<script/);
});

test('invalid sensitive literals never render in preview diagnostics', () => {
  const spec = parseSpec(yaml);
  spec.variables.API_TOKEN.default = 'private-literal-must-not-render';
  const html = renderPreview(spec, lintSpec(spec), 'testnonce');
  assert.match(html, /Invalid OpenENV contract/);
  assert.doesNotMatch(html, /private-literal-must-not-render/);
});

test('preview escapes HTML in titles, descriptions and defaults', () => {
  const spec = parseSpec(yaml);
  spec.info.title = '<img src=x onerror=alert(1)>';
  spec.variables.LOG_LEVEL.description = '<script>alert(1)</script>';
  const html = renderPreview(spec, lintSpec(spec), 'testnonce');
  assert.doesNotMatch(html, /<img|<script/);
  assert.match(html, /&lt;script&gt;/);
});

test('preview supports only exact OpenENV filenames including remote URIs', () => {
  for (const path of ['/root/openenv.yaml', '/openenv.yml', '/openenv.json', 'openenv.yaml']) assert.equal(supported({ path }), true);
  for (const path of ['/root/other.yaml', '/root/myopenenv.yaml', '/root/openenv.yaml.bak']) assert.equal(supported({ path }), false);
});

function host(source = yaml, path = '/workspace/openenv.yaml') {
  const uri = { path, toString: () => `test:${path}` };
  const document = { uri, getText: () => source };
  const panels = [];
  const listeners = new Set();
  const notices = [];
  const vscode = {
    ViewColumn: { Beside: 2 },
    window: {
      activeTextEditor: { document },
      showInformationMessage: message => notices.push(message),
      createWebviewPanel: (_, title, column, options) => {
        const panel = { title, column, options, webview: {}, reveals: 0, reveal() { this.reveals++; }, onDidDispose(callback) { this.cleanup = callback; }, dispose() { this.cleanup(); } };
        panels.push(panel); return panel;
      },
    },
    workspace: {
      openTextDocument: async () => document,
      onDidChangeTextDocument(callback) { listeners.add(callback); return { dispose() { listeners.delete(callback); } }; },
    },
    commands: { registerCommand: () => ({ dispose() {} }) },
  };
  return { vscode, uri, panels, notices, listeners, setSource(value) { source = value; }, change(resource = uri) { for (const callback of listeners) callback({ document: { uri: resource } }); } };
}

test('extension opens beside, reuses a panel, updates unsaved content and cleans listeners', async () => {
  const h = host();
  const extension = createExtension(h.vscode, { parseSpec, lintSpec });
  await Promise.all([extension.openPreview(), extension.openPreview()]);
  assert.equal(h.panels.length, 1);
  const panel = h.panels[0];
  assert.equal(panel.column, 2);
  assert.equal(panel.options.enableScripts, false);
  assert.deepEqual(panel.options.localResourceRoots, []);
  await extension.openPreview();
  assert.equal(panel.reveals, 2);
  h.setSource(yaml.replace('default: 8080', 'default: 70000'));
  h.change();
  await new Promise(resolve => setTimeout(resolve, 230));
  assert.match(panel.webview.html, /LITERAL_INVALID/);
  assert.doesNotMatch(panel.webview.html, /<td><strong>PORT/);
  h.setSource(yaml); h.change(); panel.dispose();
  await new Promise(resolve => setTimeout(resolve, 230));
  assert.equal(h.listeners.size, 0);
  assert.match(panel.webview.html, /Invalid OpenENV contract/);
});

test('extension uses strict JSON parsing and refuses unrelated YAML', async () => {
  const json = host('{"openenv": "0.1.0",}', '/workspace/openenv.json');
  await createExtension(json.vscode, { parseSpec, lintSpec }).openPreview();
  assert.match(json.panels[0].webview.html, /PARSE_JSON/);
  const other = host(yaml, '/workspace/application.yaml');
  await createExtension(other.vscode, { parseSpec, lintSpec }).openPreview();
  assert.equal(other.panels.length, 0);
  assert.equal(other.notices.length, 1);
});
