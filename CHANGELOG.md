# Changelog

## 0.1.0 — Initial specification

The first OpenENV specification draft defines environment-variable contracts
independently of programming languages and frameworks, with a Node.js reference
implementation for validation and runtime checking.

### Specification

- Equivalent YAML 1.2 and JSON contract formats.
- Primitive types, requiredness, sensitivity, defaults, examples, enums,
  string constraints, numeric bounds, and extensions.
- String arrays with an explicit space or comma delimiter and typed array literals.
- Version identities and compatibility rules.
- JSON Schema Draft 2020-12 for structural validation and editor completion.

### Reference implementation

- `openenv lint` validates contract structure and semantics.
- `openenv check` validates environment values against a contract.
- Library APIs: `parseSpec`, `lintSpec`, and `checkEnvironment`, including typed
  values and default resolution for application startup.
- Conformance tests, isolated npm consumer checks, and CI on Node.js 22 and 24.
- Source and npm archives, standalone schema and examples, and SHA-256 checksums.

### Compatibility

This is the initial specification draft. The reference implementation supports
exactly `openenv: "0.1.0"`; there is no previous OpenENV format to migrate from.
The Node.js package requires **Node.js 22 or newer**.

### Getting started

Download `it-perspectives-openenv-0.1.0.tgz` and the `openenv.yaml` example from
the release assets, then run:

```sh
npm install --save-dev --save-exact ./it-perspectives-openenv-0.1.0.tgz
npx openenv lint openenv.yaml --warnings-as-errors
```

For editor integration or another language, use the standalone
`openenv-0.1.0.schema.json` and `SPEC.md`. The schema covers structural validation;
implementations must also follow the specification's semantic and decoding rules.
