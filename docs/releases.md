# Releasing and consuming OpenENV

## Release unit

A specification release is a versioned contract plus companion
tooling. Its contents are:

| Artifact | Purpose |
| --- | --- |
| `SPEC.md` | Normative data model, serialization, semantics, and compatibility rules. |
| `openenv-X.Y.Z.schema.json` | Versioned JSON Schema for document validation and editor completion. |
| `openenv.yaml`, `openenv.json` | Equivalent examples of the same contract. |
| `openenv-X.Y.Z.tar.gz` | Source, schema, documentation, tests, linter, and lockfile. |
| `it-perspectives-openenv-X.Y.Z.tgz` | Installable npm distribution of the linter/checker and schema. |
| `SHA256SUMS` | SHA-256 checksums for the release assets. |
| `CHANGELOG.md` | Full release history, included in both archives and attached separately. |
| `release-notes.md` | Current version's changelog entry, also used as the GitHub release description. |
| `LICENSE` | MIT license included in both distributions. |

The npm package includes the reference implementation, schema, specification,
documentation, and examples. The source archive also includes tests and release
scripts. Tests are run before producing release assets.

YAML and JSON are document serializations. The validation schema is distributed
as JSON; a second YAML schema would duplicate the same source of truth.

## Version identities

- `openenv` pins the specification format, for example `0.1.0`.
- `info.version` is owned by the application author and versions its variables.
- The initial npm version and Git tag match the specification release.

The initial implementation supports exactly `0.1.0`. Future implementations may
support several versions, but must select validation by the declared version.
Specification releases are immutable. Never replace an existing schema or tag.
Pre-1.0 breaking format changes use a new minor version; after 1.0 they use a new
major version. See SPEC.md for the complete compatibility policy.

## Prepare a release

1. Review normative wording and update the schema, examples, and tests together.
2. Update `openenv` version, package version, schema filename/ID, example versions,
   and supported version constants together. Record migration impact in the changelog.
   Use a `## X.Y.Z — Title` heading and `###` subsections for the release entry.
3. Run `npm ci --ignore-scripts`, `npm run release:prepare`, and
   `node scripts/smoke-package.js`. Review the generated archive, npm file list,
   and `dist/release-notes.md` as the exact description to be published.
4. Verify the Node.js 22 and 24 CI jobs. Local checks establish only the local runtime.
5. Commit the reviewed release source and create an annotated `vX.Y.Z` Git tag.
6. Push the commit and tag when publication is intended.

Pushing a `v*` tag triggers the supplied GitHub release workflow. The workflow
checks that the tag matches the package and specification, runs validation,
builds assets, tests the packed consumer, and creates a GitHub release with assets.
The description comes from the matching version's entry in `CHANGELOG.md`, via
`--notes-file dist/release-notes.md`. Other versions and the top-level changelog
heading are excluded; Markdown subsections are preserved. Preparation fails if
the entry is missing, duplicated, or empty. Both Markdown assets are covered by
`SHA256SUMS`. Edit the changelog before tagging to control the published wording.
It needs the repository's GitHub Actions `contents: write` permission. Publishing
is a maintainer action; creating files locally does not run that workflow.

For local use, verify checksums from inside `dist/`:

```sh
shasum -a 256 -c SHA256SUMS
```

The npm tarball can be installed directly before registry publication:

```sh
npm install --save-dev --save-exact ./it-perspectives-openenv-0.1.0.tgz
```

## npm publication

`@it-perspectives/openenv` is the proposed scoped package name. Confirm that the
organization scope is available to the publisher; rename the package and update
consumer instructions if needed. GitHub repository ownership does not prove npm
namespace ownership.

This initial workflow publishes GitHub assets only. After confirming npm access,
a maintainer can publish the verified tarball:

```sh
npm publish ./dist/it-perspectives-openenv-0.1.0.tgz --access public
```

No registry token is stored in this repository. npm publication can later be
automated using the publisher's chosen authentication mechanism. Before announcing
the release, install the published exact version in a fresh consumer and check its
CLI and schema export. Never document an unpublished package as already available.

## Consumer integration modes

1. **Editor only:** pin the release schema URL or vendor the schema. This covers
   structural validation and completion, with semantic limitations stated in SPEC.md.
2. **CI:** install the exact npm package as a dev dependency, commit the lockfile,
   and run `openenv lint openenv.yaml --warnings-as-errors`.
3. **Startup:** install as a production dependency and call `checkEnvironment`
   before application initialization. Use its returned typed values and defaults.
4. **Other languages:** parse JSON/YAML, validate the document schema, and implement
   SPEC.md decoding and semantic rules. Use the source archive tests as reference cases.

Only the startup/API mode resolves defaults for the application. Running the CLI
checker does not inject defaults into another process. A schema URL is an editor
hint, not permission for the linter to download or execute remote content.
