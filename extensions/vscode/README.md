# OpenENV Preview for VS Code

Local prototype for `openenv.yaml`, `openenv.yml`, and `openenv.json`. Opens a
read-only contract preview beside the source, similar to Markdown preview.

## Run from this repository

Requires Node.js 22+ for the build and VS Code 1.100+ for the extension.

From the repository root:

```sh
npm ci --ignore-scripts
npm run vscode:build
code extensions/vscode
```

Press F5 in the extension directory to start an Extension Development Host.
In that window open `examples/openenv.yaml` from this repository. Use the preview
button in the editor title or **OpenENV: Open Preview to the Side** in the Command
Palette. Shortcut: **Cmd+K, V** on macOS, **Ctrl+K, V** on Windows/Linux.
The same command appears in the Explorer context menu for supported filenames.

To launch the host directly from the repository root:

```sh
code --new-window --extensionDevelopmentPath="$PWD/extensions/vscode" "$PWD/examples/openenv.yaml"
```

## Behavior

- Displays title, contract/specification versions, counts, descriptions, types,
  requiredness, defaults, constraints, examples, enums and deprecated markers.
- Uses unsaved TextDocument content, updating after a 180 ms debounce.
- Reuses one panel per document URI; closes listeners and timers with the panel.
- Displays current parser/linter diagnostics instead of a stale valid preview.
- Parses JSON strictly, and applies the same YAML restrictions as the CLI.
- Uses VS Code theme variables, including light and high-contrast themes.
- Reads only the selected document. Does not read `.env`, process environment,
  execute workspace commands, fetch remote schemas, or render Markdown/HTML from
  descriptions. Webview scripts and local resource access are disabled.

The reference schema, parser, linter, and their dependencies are bundled locally
in `dist/validator.cjs`. No globally installed CLI or published npm package is
needed. A build must run before launching or packaging the extension.

## Architecture and choice of API

`TextDocument → parseSpec → lintSpec → escaped HTML → WebviewPanel`.

The [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
also underlies VS Code's built-in Markdown preview. A side panel preserves the
normal YAML editor, undo/redo and existing language-server completion. A
`CustomTextEditorProvider` can be added later for **Reopen Editor With**, but is
not needed for this read-only side preview.

JSON Schema language-server completion remains separate: this prototype does not
override `yaml.schemas` or replace the YAML extension. It renders semantic lint
diagnostics in the preview. Problems-panel ranges and click-to-source navigation
are possible next steps, with YAML/JSON source mapping required for precision.

## Verify and package

From the repository root:

```sh
npm run previews:verify
npm run verify
```

Lifecycle tests exercise concurrent opening, panel reuse, unsaved edits, invalid
contracts, strict JSON, HTML escaping, sensitive literals, and listener cleanup.
Bundle checks compare browser and extension results with the reference validator.
These tests do not replace manual checks inside the real VS Code host.

Build a local VSIX from the repository root using the pinned packaging tool:

```sh
npm run vscode:package
code --install-extension dist/openenv-preview-0.1.0.vsix
```

The command builds the validator and packages `dist/openenv-preview-X.Y.Z.vsix`,
with the version from the extension manifest. It includes bundled dependencies
and needs no globally installed CLI or registry token. GitHub Actions keeps this
file as a downloadable artifact on PRs, pushes to `main`, and release tags.

The prototype is not published to Marketplace. The proposed `it-perspectives`
publisher ID must be confirmed before publication. Marketplace release should
also add a PNG icon, verify desktop/remote hosts and light/high-contrast themes,
and include an Extension Host integration test in CI.
