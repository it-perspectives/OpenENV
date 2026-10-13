const { randomBytes } = require('node:crypto');
const { renderPreview } = require('./render.cjs');
const supported = (uri) => /(?:^|\/)openenv\.(yaml|yml|json)$/.test(uri.path);

// Dependency injection keeps lifecycle tests independent of the VS Code host.
function createExtension(vscode, validator) {
  const panels = new Map();
  async function openPreview(uri) {
    const resource = uri || vscode.window.activeTextEditor?.document.uri;
    if (!resource || !supported(resource)) {
      vscode.window.showInformationMessage('Open openenv.yaml, openenv.yml or openenv.json to preview its contract.');
      return;
    }
    const key = resource.toString();
    const existing = panels.get(key);
    if (existing) { existing.panel.reveal(vscode.ViewColumn.Beside); return; }
    const document = await vscode.workspace.openTextDocument(resource);
    // A second invocation may have arrived while the document was opening.
    if (panels.has(key)) { panels.get(key).panel.reveal(vscode.ViewColumn.Beside); return; }
    const panel = vscode.window.createWebviewPanel('openenv.preview', 'OpenENV Preview', vscode.ViewColumn.Beside, {
      enableScripts: false, localResourceRoots: [],
    });
    let timer;
    const update = () => {
      let spec;
      let result;
      try {
        spec = validator.parseSpec(document.getText(), { format: resource.path.endsWith('.json') ? 'json' : 'yaml' });
        result = validator.lintSpec(spec);
      } catch (error) {
        result = { valid: false, diagnostics: [{ code: error.code || 'PREVIEW_ERROR', path: '/', message: error.code ? error.message : 'Unable to validate this document.' }] };
      }
      panel.webview.html = renderPreview(spec, result, randomBytes(16).toString('hex'));
    };
    const changes = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== key) return;
      clearTimeout(timer);
      timer = setTimeout(update, 180);
    });
    panel.onDidDispose(() => { clearTimeout(timer); changes.dispose(); panels.delete(key); });
    panels.set(key, { panel });
    update();
  }
  function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('openenv.openPreviewToSide', openPreview));
    context.subscriptions.push({ dispose() { for (const { panel } of [...panels.values()]) panel.dispose(); } });
  }
  return { activate, openPreview };
}

function activate(context) {
  const vscode = require('vscode');
  const validator = require('../dist/validator.cjs');
  createExtension(vscode, validator).activate(context);
}
module.exports = { activate, createExtension, supported };
