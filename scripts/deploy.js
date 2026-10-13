import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function runCommand(command, args, { cwd, capture = false }) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status}).${result.stderr ? `\n${result.stderr.trim()}` : ''}`);
  return result.stdout?.trim() ?? '';
}

export function deployRelease(args, { cwd = process.cwd(), run = runCommand } = {}) {
  const [version] = args;
  if (args.length !== 1 || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('Usage: npm run deploy X.Y.Z (for example: npm run deploy 0.1.0).');
  }
  const metadata = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8'));
  if (metadata.version !== version) throw new Error(`Requested version ${version} does not match package.json (${metadata.version}). Prepare and commit the version first.`);

  const git = (gitArgs, capture = true) => run('git', gitArgs, { cwd, capture });
  const assertReady = () => {
    if (git(['branch', '--show-current']) !== 'main') throw new Error('Release must be run from the main branch.');
    if (git(['status', '--porcelain', '--untracked-files=all'])) throw new Error('Working tree must be clean. Commit release changes before deploying.');
  };
  assertReady();
  const commit = git(['rev-parse', '--verify', 'HEAD']);
  const tag = `v${version}`;
  if (git(['tag', '--list', tag])) throw new Error(`Local tag ${tag} already exists. Tags must not be overwritten.`);
  if (git(['ls-remote', '--refs', 'origin', `refs/tags/${tag}`])) throw new Error(`Remote tag ${tag} already exists. Tags must not be overwritten.`);

  run('npm', ['run', 'release:prepare'], { cwd });
  run(process.execPath, ['scripts/smoke-package.js'], { cwd });
  assertReady();
  if (git(['rev-parse', '--verify', 'HEAD']) !== commit) throw new Error('HEAD changed during release checks. Run deploy again for the reviewed commit.');

  git(['tag', '-a', tag, commit, '-m', `OpenENV ${tag}`], false);
  try {
    git(['push', '--atomic', 'origin', 'refs/heads/main', `refs/tags/${tag}`], false);
  } catch (error) {
    throw new Error(`${error.message}\nLocal tag ${tag} is retained. Inspect origin before retrying; no force push was attempted.`);
  }
  return tag;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const tag = deployRelease(process.argv.slice(2));
    process.stdout.write(`Pushed main and ${tag} to origin. GitHub Actions will build and publish the GitHub release.\n`);
  } catch (error) {
    process.stderr.write(`Deploy failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
