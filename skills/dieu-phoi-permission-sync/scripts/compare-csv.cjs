#!/usr/bin/env node

const { readFileSync } = require('fs');
const { resolve } = require('path');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const expectedPath = option('--expected');
const actualPath = option('--actual');
const requestedColumns = Number(option('--columns', '0'));
if (!expectedPath || !actualPath) {
  console.error('Usage: compare-csv.cjs --expected <file> --actual <file> [--columns 20]');
  process.exit(1);
}

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  while (rows.length && rows[rows.length - 1].every((cell) => cell === '')) rows.pop();
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
  return rows;
};

const expected = parseCsv(readFileSync(resolve(expectedPath), 'utf8'));
const actual = parseCsv(readFileSync(resolve(actualPath), 'utf8'));
const columns = requestedColumns || Math.max(expected[0]?.length || 0, actual[0]?.length || 0);
const rowCount = Math.max(expected.length, actual.length);
const differences = [];
for (let row = 0; row < rowCount; row += 1) {
  for (let column = 0; column < columns; column += 1) {
    const left = String(expected[row]?.[column] ?? '');
    const right = String(actual[row]?.[column] ?? '');
    if (left !== right) differences.push({ row: row + 1, column: column + 1, expected: left, actual: right });
  }
}

if (!differences.length) {
  console.log(`MATCH rows=${expected.length} columns=${columns}`);
  process.exit(0);
}
console.error(`DIFF count=${differences.length} expectedRows=${expected.length} actualRows=${actual.length} columns=${columns}`);
for (const difference of differences.slice(0, 100)) console.error(JSON.stringify(difference));
if (differences.length > 100) console.error(`... ${differences.length - 100} more differences`);
process.exit(1);
