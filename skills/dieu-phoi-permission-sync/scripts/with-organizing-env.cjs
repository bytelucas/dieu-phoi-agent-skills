#!/usr/bin/env node

const { readFileSync } = require('fs');
const { resolve, join } = require('path');
const { spawnSync } = require('child_process');

const argv = process.argv.slice(2);
const separator = argv.indexOf('--');
if (separator < 0 || separator === argv.length - 1) {
  console.error('Usage: with-organizing-env.cjs --repo <path> --target <local|dev> -- <command> [args...]');
  process.exit(1);
}

const options = argv.slice(0, separator);
const command = argv.slice(separator + 1);
const getOption = (name, fallback) => {
  const index = options.indexOf(name);
  return index >= 0 ? options[index + 1] : fallback;
};

const repo = resolve(getOption('--repo', process.cwd()));
const target = getOption('--target');
if (!['local', 'dev'].includes(target)) {
  console.error('--target must be local or dev');
  process.exit(1);
}

const envPath = join(repo, '.env');
const raw = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
const keys = [
  'DB_ORGANIZING_HOST',
  'DB_ORGANIZING_PORT',
  'DB_ORGANIZING_USERNAME',
  'DB_ORGANIZING_PASSWORD',
  'DB_ORGANIZING_DB_NAME',
];

const assignments = new Map(keys.map((key) => [key, []]));
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match || !assignments.has(match[1])) continue;
  assignments.get(match[1]).push(match[2]);
}

for (const key of keys) {
  if (!assignments.get(key).length) {
    console.error(`Missing active ${key} in ${envPath}`);
    process.exit(1);
  }
}

const dotenv = require(join(repo, 'node_modules', 'dotenv'));
const selectedLines = keys.map((key) => {
  const values = assignments.get(key);
  const value = target === 'local' ? values[0] : values[values.length - 1];
  return `${key}=${value}`;
});
const selected = dotenv.parse(Buffer.from(`${selectedLines.join('\n')}\n`));

const host = selected.DB_ORGANIZING_HOST;
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(String(host).toLowerCase());
if (target === 'local' && !isLocal) {
  console.error(`Refusing local target: selected host is ${host}`);
  process.exit(1);
}
if (target === 'dev' && isLocal) {
  console.error(`Refusing dev target: selected host is ${host}`);
  process.exit(1);
}

console.error(
  `Oracle organizing target=${target} ${host}:${selected.DB_ORGANIZING_PORT}/${selected.DB_ORGANIZING_DB_NAME} user=${selected.DB_ORGANIZING_USERNAME}`,
);

const result = spawnSync(command[0], command.slice(1), {
  cwd: repo,
  env: { ...process.env, ...selected },
  stdio: 'inherit',
});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
