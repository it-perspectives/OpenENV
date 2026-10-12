# OpenENV 0.1.0

Status: initial draft, prepared for release.

OpenENV describes an application's environment variable contract. It specifies
names, meaning, types, requiredness, defaults, constraints, and sensitivity.
The words MUST, MUST NOT, SHOULD, and MAY express conformance requirements.

## 1. Scope

Version 0.1.0 describes environment variables only. A sensitive environment
variable is represented by `sensitive: true` in the same contract. Secret stores,
deployment manifests, APIs, messaging, telemetry, file-based configuration,
profiles, imports, interpolation, and executable resolvers are outside this version.

A conforming document describes variables; it does not contain their deployed
values. Non-sensitive defaults and examples MAY appear in the document.

## 2. Serialization

A document MUST be a single JSON object serialized as UTF-8 JSON or YAML 1.2.
Recommended filenames are `openenv.json` and `openenv.yaml`; `.yml` is supported.
Both serializations represent the same data model and have the same semantics.

Mapping keys MUST be strings and unique, including keys written with different
escape sequences that decode to the same string. JSON MUST use strict JSON syntax.
YAML aliases, explicit tags, merge keys, and multiple documents MUST NOT be used.
The key `<<` is reserved and MUST NOT appear in either serialization.
An unused YAML anchor has no semantic effect. YAML scalar values MUST be
JSON-compatible. Quote defaults such as `"true"` or `"8080"` when their type is
`string`. YAML 1.1 coercion rules MUST NOT be used.

Numbers MUST be finite. Integers MUST lie between -9007199254740991 and
9007199254740991, inclusive, to support interoperable JSON tooling. The reference
parser limits individual documents to 1 MiB.

## 3. Root object

| Field | Required | Description |
| --- | --- | --- |
| `openenv` | Yes | Exact specification version: `"0.1.0"`. |
| `info` | Yes | Information about this application contract. |
| `variables` | Yes | Map from environment variable name to Variable Object. An empty map is valid. |
| `$schema` | No | Exact URI of the versioned OpenENV JSON Schema. Primarily useful for JSON editors. |
| `x-*` | No | Extension properties containing JSON-compatible values. |

`openenv` identifies this specification's version. `info.version` identifies
the application's environment contract; these versions are independent.

An extension name MUST match `^x-[A-Za-z0-9][A-Za-z0-9._-]*$`. Extensions MAY
appear at the root, in `info`, or in a Variable Object. Consumers MUST ignore
unrecognized extensions. Unknown properties without the `x-` prefix are errors.
Extensions MUST NOT change the meaning of standard fields.

## 4. Info Object

| Field | Required | Description |
| --- | --- | --- |
| `title` | Yes | Non-empty human-readable name. |
| `version` | Yes | Non-empty application contract version. SemVer is recommended. |
| `description` | No | Human-readable description. |

## 5. Variable Object

Variable names MUST match `^[A-Za-z_][A-Za-z0-9_]*$`. Names are case-sensitive.
Uppercase names are recommended; the reference linter warns on lowercase names.

| Field | Type | Meaning |
| --- | --- | --- |
| `description` | string | Required, non-empty description of purpose. |
| `type` | string | Required: `string`, `integer`, `number`, `boolean`, or `array`. |
| `delimiter` | string | Required for `array`, forbidden for other types. Exactly `" "` (space) or `","` (comma). |
| `required` | boolean | Whether a value must be available after resolving a default. Omission means `false`. |
| `sensitive` | boolean | Whether values need secret handling. Omission means `false`. |
| `deprecated` | boolean | Whether users should stop using this variable. Omission means `false`. |
| `default` | scalar or array of strings | Typed fallback used only when the variable is absent. |
| `examples` | array | Non-empty list of typed examples that satisfy all constraints. |
| `enum` | array | Non-empty list of unique permitted typed values. |
| `format` | string | String-only format; supported values are listed below. |
| `pattern` | string | String-only regular expression. |
| `minLength` / `maxLength` | integer | Non-negative minimum/maximum string length. |
| `minimum` / `maximum` | number | Inclusive numeric bounds; permitted for `integer` and `number` only. |

`default`, `examples`, and `enum` MUST contain values of the declared type.
For `array`, each value MUST be an array containing only strings; `examples` and
`enum` are lists of these arrays. An `enum` constrains the entire array, including
element order, rather than individual elements. Nulls, objects, and nested arrays
as variable values are unsupported. All declared
defaults and examples MUST satisfy every constraint, including `enum`.
Every `enum` member MUST satisfy the other constraints. Lower bounds MUST NOT
exceed upper bounds. Invalid regular expressions are errors.

Formats are `uri`, `uri-reference`, `email`, `hostname`, `ipv4`, and `ipv6`, with
the corresponding JSON Schema Draft 2020-12 format semantics. Implementations
MUST assert the selected format, rather than treating it only as an annotation.
`pattern` uses ECMAScript regular expression syntax with Unicode mode and no
other flags. Matching is unanchored unless the author includes `^` and `$`.
String length is measured in Unicode code points, as in JSON Schema.

### Array variables

An `array` variable represents a list of strings. Its `delimiter` MUST be a single
ASCII space (`U+0020`) or comma (`U+002C`) and MUST be present even when a default
is declared. String and numeric constraint fields MUST NOT appear on arrays.

```yaml
ALLOWED_HOSTS:
  description: Hosts allowed to access the service.
  type: array
  delimiter: ","
  default: [localhost]
  examples:
    - [localhost, example.invalid]
```

For this contract, `ALLOWED_HOSTS=localhost,example.invalid` resolves to
`["localhost", "example.invalid"]`. Defaults and examples use native JSON/YAML
arrays, not delimiter-separated strings.

### Sensitive variables

When `sensitive` is `true`, `default`, `examples`, and `enum` MUST NOT appear.
Descriptions and extensions MUST NOT contain actual secret values.
Consumers SHOULD redact sensitive values in their own logs and reports.
The marker itself does not encrypt a value or make arbitrary application code
safe. The reference CLI never prints any environment values, sensitive or otherwise.

## 6. Environment interpretation

Environment values are strings. A conforming checker MUST:

1. Validate the specification before checking environment values.
2. Consider only declared variables. Unrelated environment entries are ignored.
3. Use `default` when a variable is absent. An explicitly undefined entry is absent
   in the JavaScript API. Empty strings are present and MUST NOT select a default.
4. Report a missing required variable if neither an entry nor a default exists.
   An absent optional variable without a default is omitted from the result.
5. Decode present strings using the rules below, without trimming whitespace.
6. Validate decoded values against all declared constraints.
7. Return failure if any variable is invalid. Input environment values MUST NOT
   be changed. Invalid present values MUST NOT silently fall back to defaults.

| Type | Decoding |
| --- | --- |
| `string` | Preserve the value exactly, including whitespace and empty strings. |
| `array` | An empty string becomes `[]`. Otherwise split on every literal occurrence of `delimiter`, preserving whitespace, order, duplicates, and empty elements. |
| `boolean` | Accept only the exact strings `true` and `false`. |
| `integer` | Accept `^-?(?:0\|[1-9][0-9]*)$`, within the supported integer range. |
| `number` | Accept JSON-style decimal syntax: `^-?(?:0\|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$`. The result must be finite; integral results must be in the supported integer range. |

Numeric decoding uses IEEE 754 binary64. Fractions follow ordinary binary64
rounding. Integer syntax rejects leading `+`, leading zeros, fractions, and
exponents. Number syntax accepts fractions and exponents, but rejects hexadecimal,
`NaN`, infinity, and surrounding whitespace. Boolean syntax rejects `1`, `0`,
`yes`, and uppercase spellings.

Array decoding has no quoting or escaping rules. With `delimiter: ","`,
`a, b,,` becomes `["a", " b", "", ""]`. With `delimiter: " "`, `a  b` becomes
`["a", "", "b"]`; tabs and newlines are not separators. An empty array satisfies
`required: true` because requiredness checks presence, not the number of elements.

## 7. Validation and linting

There are three different checks:

- **Document schema validation:** required fields, supported types, unknown
  fields, portable names, and type-specific constraint fields.
- **Semantic linting:** default/example/enum consistency, valid regular
  expressions, and non-contradictory bounds. These checks supplement JSON Schema.
- **Environment checking:** presence, decoding, and validation of deployed values.

The supplied JSON Schema validates OpenENV documents; it is not a schema for
`process.env`. A generic JSON Schema validator alone does not perform every
semantic check. The OpenENV linter implements both document and semantic checks.
Neither the linter nor the schema proves that application code follows the contract.

The CLI reports `severity`, `code`, a JSON Pointer `path`, and `message` for each
diagnostic. Warnings do not fail by default. `--warnings-as-errors` makes them
fail. Exit codes are `0` for success, `1` for invalid contracts/environments,
and `2` for usage or file errors. Parser errors never include source excerpts.

## 8. Versioning and compatibility

Each release publishes a versioned specification and schema. Consumers MUST
pin an exact specification version. Validators MUST reject unsupported versions.
Historical release artifacts and schema URLs MUST remain immutable.

During `0.x`, breaking specification changes increment the minor version.
Once `1.0.0` is reached, breaking changes increment the major version. Additive
features increment the minor version; compatible corrections increment patch.
Old validators are not required to accept newer documents. A new release MUST
document its compatibility and migration impact, including changes to validation.

Application contract versions evolve separately. Adding a required variable,
removing a variable, tightening constraints, or changing decoding/type is normally
a breaking application contract change, even if the OpenENV version stays fixed.

## 9. Conformance artifacts

The normative source is this document. The JSON Schema and reference linter
are executable companions; discrepancies MUST be corrected before release.
The paired YAML/JSON example demonstrates equivalent serialization. The
conformance tests cover valid and invalid documents, duplicate keys, semantic
constraints, decoding, diagnostics, and CLI behavior.

Reference material: [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12),
[JSON Schema Validation](https://json-schema.org/draft/2020-12/json-schema-validation),
and [YAML 1.2.2](https://yaml.org/spec/1.2.2/).
