#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { checkEnvironment, lintSpec, parseSpec, specificationVersion } from '../src/index.js';

const help = `OpenENV ${specificationVersion}

Usage:
  openenv lint <file.yaml|file.yml|file.json>... [--format text|json] [--warnings-as-errors]
  openenv check <file.yaml|file.yml|file.json> [--format text|json] [--warnings-as-errors]
  openenv --version

lint validates specification documents. check also validates the current process
environment. Values are never included in diagnostics or CLI output.
Exit codes: 0 success; 1 validation failure; 2 usage or file error.
`;

async function main(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) { process.stdout.write(help); return 0; }
  if (args.length === 1 && args[0] === '--version') { process.stdout.write(`${specificationVersion}\n`); return 0; }
  const command = args.shift();
  let format = 'text';
  let strictWarnings = false;
  const files = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--format') format = args[++index];
    else if (args[index] === '--warnings-as-errors') strictWarnings = true;
    else if (args[index].startsWith('-')) return usage();
    else files.push(args[index]);
  }
  if (!['lint', 'check'].includes(command) || !['text', 'json'].includes(format) || !files.length || (command === 'check' && files.length !== 1)) return usage();
  const reports = [];
  let exitCode = 0;
  for (const file of files) {
    const extension = extname(file).toLowerCase();
    let report;
    try {
      if (!['.yaml', '.yml', '.json'].includes(extension)) {
        report = { valid: false, diagnostics: [{ severity: 'error', code: 'FILE_FORMAT', path: '/', message: 'Expected a .yaml, .yml, or .json file.' }] };
        exitCode = 2;
      } else {
        const spec = parseSpec(await readFile(file, 'utf8'), { format: extension === '.json' ? 'json' : 'yaml' });
        const checked = command === 'lint' ? lintSpec(spec) : checkEnvironment(spec, process.env);
        report = { valid: checked.valid, diagnostics: checked.diagnostics };
      }
    } catch (error) {
      const fileError = !error.code?.startsWith('PARSE_');
      report = { valid: false, diagnostics: [{ severity: 'error', code: fileError ? 'FILE_READ' : error.code, path: '/', message: fileError ? 'Unable to read the specification file.' : error.message }] };
      if (fileError) exitCode = 2;
    }
    report.valid = report.valid && !(strictWarnings && report.diagnostics.some((item) => item.severity === 'warning'));
    if (!report.valid && exitCode === 0) exitCode = 1;
    reports.push({ file, ...report });
  }
  if (format === 'json') process.stdout.write(`${JSON.stringify({ specificationVersion, valid: reports.every((report) => report.valid), reports }, null, 2)}\n`);
  else for (const report of reports) {
    process.stdout.write(`${report.file}: ${report.valid ? 'valid' : 'invalid'}\n`);
    for (const item of report.diagnostics) process.stdout.write(`  ${item.severity} ${item.code} ${item.path}: ${item.message}\n`);
  }
  return exitCode;
}

function usage() { process.stderr.write(help); return 2; }
process.exitCode = await main(process.argv.slice(2));
