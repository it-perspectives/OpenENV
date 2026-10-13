import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractReleaseNotes } from '../scripts/release-notes.js';

test('release notes select the exact version and preserve Markdown subsections', () => {
  const changelog = `# Changelog

## Unreleased

Future work.

## 0.1.00 — Other version

Different entry.

## 0.1.0 — Initial specification

Summary.

### Compatibility

No migration required.

## 0.0.1 — Older version

Older changes.
`;
  assert.equal(extractReleaseNotes(changelog, '0.1.0'), 'Summary.\n\n### Compatibility\n\nNo migration required.\n');
});

test('release notes stop at an Unreleased section', () => {
  assert.equal(extractReleaseNotes('## 0.1.0\n\nRelease.\n\n## Unreleased\n\nFuture.\n', '0.1.0'), 'Release.\n');
});

test('release notes handle the last entry and Windows line endings', () => {
  assert.equal(extractReleaseNotes('# Changelog\r\n\r\n## 0.1.0\r\n\r\nNotes.\r\n', '0.1.0'), 'Notes.\n');
});

test('release notes reject a missing version instead of using another entry', () => {
  assert.throws(() => extractReleaseNotes('## 0.1.1\n\nOther release.\n', '0.1.0'), /Missing changelog entry for 0\.1\.0/);
});

test('release notes reject duplicate version entries', () => {
  assert.throws(() => extractReleaseNotes('## 0.1.0 — First\n\nFirst.\n\n## 0.1.0 — Second\n\nSecond.\n', '0.1.0'), /Duplicate changelog entries/);
});

test('release notes reject an empty entry before another version', () => {
  assert.throws(() => extractReleaseNotes('## 0.1.0\n\n## 0.0.1\n\nOlder.\n', '0.1.0'), /Empty changelog entry/);
});

test('release notes reject an empty final entry', () => {
  assert.throws(() => extractReleaseNotes('## 0.1.0\n \n\t\n', '0.1.0'), /Empty changelog entry/);
});
