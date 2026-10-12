# Changelog

## 0.1.0 — prepared initial draft

- Define environment variable contracts in equivalent YAML 1.2 and JSON forms.
- Specify primitive types, requiredness, sensitivity, defaults, examples, enums,
  string constraints, numeric bounds, extensions, and version identities.
- Add string arrays with a mandatory space or comma delimiter and typed array literals.
- Add a JSON Schema Draft 2020-12 document schema.
- Add the reference CLI and library for semantic linting and environment checking.
- Add conformance tests, isolated npm consumer verification, and release packaging.
- Add Node.js 22/24 CI and a version-tagged GitHub release workflow.

Compatibility: this is the first draft. Only the exact `openenv: "0.1.0"`
format is supported. There is no previous OpenENV format to migrate from.
No release date or registry publication is claimed until maintainers publish it.
