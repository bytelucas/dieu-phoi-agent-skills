#!/usr/bin/env node

const { readFileSync } = require('fs');
const { resolve, join } = require('path');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

const repo = resolve(option('--repo', process.cwd()));
const input = option('--input');
const label = option('--label', 'DB');
const requireClean = hasFlag('--require-clean');
if (!input) {
  console.error('Usage: check-endpoint-drift.cjs --repo <path> --input <dry-run-output> [--label name] [--require-clean]');
  process.exit(1);
}

const requiredEnv = [
  'DB_ORGANIZING_HOST',
  'DB_ORGANIZING_PORT',
  'DB_ORGANIZING_USERNAME',
  'DB_ORGANIZING_PASSWORD',
  'DB_ORGANIZING_DB_NAME',
];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`Missing environment: ${missingEnv.join(', ')}. Run through with-organizing-env.cjs.`);
  process.exit(1);
}

const discovered = new Map();
let current = null;
for (const line of readFileSync(resolve(input), 'utf8').split(/\r?\n/)) {
  const endpoint = line.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S+)\s+\|/);
  if (endpoint) {
    current = `${endpoint[1]} ${endpoint[2]}`;
    discovered.set(current, []);
    continue;
  }
  const permissions = line.match(/↳ bắt buộc:\s*(.+)$/);
  if (permissions && current) {
    discovered.set(
      current,
      permissions[1].split(',').map((value) => value.trim()).filter(Boolean),
    );
  }
}
if (!discovered.size) {
  console.error(`No endpoints parsed from ${input}`);
  process.exit(1);
}

const oracledb = require(join(repo, 'node_modules', 'oracledb'));
const sorted = (items) => [...items].sort((a, b) => a.localeCompare(b));
const printItems = (title, items) => {
  console.log(`${title}: ${items.length}`);
  for (const item of sorted(items)) console.log(`  ${item}`);
};

(async () => {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_ORGANIZING_USERNAME,
      password: process.env.DB_ORGANIZING_PASSWORD,
      connectString: `${process.env.DB_ORGANIZING_HOST}:${process.env.DB_ORGANIZING_PORT}/${process.env.DB_ORGANIZING_DB_NAME}`,
    });
    const query = async (sql) =>
      (await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows;

    const [endpoints, links, permissions] = await Promise.all([
      query('SELECT ID, PATH, METHOD, DELETED_AT FROM ENDPOINTS'),
      query(`SELECT p.CODE, e.METHOD, e.PATH, pe.SOURCE, e.DELETED_AT AS EP_DEL
               FROM PERMISSION_ENDPOINTS pe
               JOIN PERMISSIONS p ON p.ID = pe.PERMISSION_ID
               JOIN ENDPOINTS e ON e.ID = pe.ENDPOINT_ID`),
      query('SELECT CODE, DELETED_AT FROM PERMISSIONS'),
    ]);

    const liveEndpoints = new Set(
      endpoints.filter((row) => row.DELETED_AT === null).map((row) => `${row.METHOD} ${row.PATH}`),
    );
    const missingEndpoints = [...discovered.keys()].filter((key) => !liveEndpoints.has(key));
    const staleEndpoints = [...liveEndpoints].filter((key) => !discovered.has(key));

    const databaseDecoratorLinks = new Set(
      links
        .filter((row) => row.SOURCE === 'DECORATOR' && row.EP_DEL === null)
        .map((row) => `${row.CODE} @ ${row.METHOD} ${row.PATH}`),
    );
    const codeDecoratorLinks = new Set();
    for (const [endpoint, codes] of discovered) {
      for (const code of codes) codeDecoratorLinks.add(`${code} @ ${endpoint}`);
    }
    const missingLinks = [...codeDecoratorLinks].filter((key) => !databaseDecoratorLinks.has(key));
    const staleLinks = [...databaseDecoratorLinks].filter((key) => !codeDecoratorLinks.has(key));

    const livePermissions = new Set(
      permissions.filter((row) => row.DELETED_AT === null).map((row) => row.CODE),
    );
    const usedCodes = new Set([...discovered.values()].flat());
    const missingPermissionCodes = [...usedCodes].filter((code) => !livePermissions.has(code));
    const manualLinkCount = links.filter((row) => row.SOURCE !== 'DECORATOR').length;

    console.log(`\n=== ${label} ===`);
    console.log(`discovered=${discovered.size} liveEndpoints=${liveEndpoints.size} manualLinks=${manualLinkCount}`);
    printItems('missing endpoints', missingEndpoints);
    printItems('stale endpoints', staleEndpoints);
    printItems('missing decorator links', missingLinks);
    printItems('stale decorator links', staleLinks);
    printItems('missing permission codes', missingPermissionCodes);

    const driftCount =
      missingEndpoints.length +
      staleEndpoints.length +
      missingLinks.length +
      staleLinks.length +
      missingPermissionCodes.length;
    console.log(`drift=${driftCount}`);
    if (requireClean && driftCount > 0) process.exitCode = 2;
  } finally {
    if (connection) await connection.close();
  }
})().catch((error) => {
  console.error(`Drift check failed: ${error.message}`);
  process.exit(1);
});
