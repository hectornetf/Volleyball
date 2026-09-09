import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

function parseVersion(v) {
  const [major, minor, patch] = String(v)
    .split('.')
    .map(n => parseInt(n, 10) || 0);
  return { major, minor, patch };
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bump(version, type) {
  const v = { ...version };
  if (type === 'major') {
    v.major += 1;
    v.minor = 0;
    v.patch = 0;
  } else if (type === 'minor') {
    v.minor += 1;
    v.patch = 0;
  } else {
    v.patch += 1;
  }
  return formatVersion(v);
}

const targets = [
  { file: path.join(rootDir, 'web', 'package.json'), get: j => j.version, set: (j, v) => { j.version = v; } },
  { file: path.join(rootDir, 'web', 'package-lock.json'), get: j => j.version, set: (j, v) => { j.version = v; } },
  { file: path.join(rootDir, 'mobile', 'package.json'), get: j => j.version, set: (j, v) => { j.version = v; } },
  { file: path.join(rootDir, 'mobile', 'package-lock.json'), get: j => j.version, set: (j, v) => { j.version = v; } },
  { file: path.join(rootDir, 'mobile', 'app.json'), get: j => j.expo?.version, set: (j, v) => { j.expo.version = v; } }
];

const type = process.argv[2] === 'minor' || process.argv[2] === 'major' ? process.argv[2] : 'patch';

try {
  const currentVersions = targets
    .map(t => {
      const file = readFileSync(t.file, 'utf8');
      const json = JSON.parse(file);
      return { target: t, version: t.get(json) };
    })
    .filter(x => x.version);

  const current = currentVersions
    .map(x => parseVersion(x.version))
    .sort((a, b) => a.major - b.major || a.minor - b.minor || a.patch - b.patch)
    .pop();

  const next = bump(current, type);

  for (const { target, version } of currentVersions) {
    if (version === next) continue;
    const json = JSON.parse(readFileSync(target.file, 'utf8'));
    target.set(json, next);
    writeFileSync(target.file, `${JSON.stringify(json, null, 2)}\n`);
  }

  console.log(`${colors.green}✔ ${colors.reset}Versão ${colors.cyan}${formatVersion(current)}${colors.reset} → ${colors.green}${colors.bold}${next}${colors.reset}`);
  console.log(`${colors.yellow}  Arquivos atualizados:${colors.reset}`);
  for (const { target, version } of currentVersions) {
    if (version !== next) console.log(`  • ${path.relative(rootDir, target.file)}`);
  }
} catch (error) {
  console.error(`${colors.bold}✖ Erro ao atualizar versão: ${error.message}${colors.reset}`);
  process.exit(1);
}