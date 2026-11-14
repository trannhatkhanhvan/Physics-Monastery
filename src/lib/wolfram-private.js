import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const SESSION_COOKIE = 'pm_wolfram_session';

const secret = () => process.env.PM_WOLFRAM_PASSWORD || '';
const digest = value => createHash('sha256').update(value).digest();
const equal = (a, b) => timingSafeEqual(digest(a), digest(b));

const signature = expiry =>
  createHmac('sha256', secret())
    .update(`pm-wolfram-v1:${expiry}`)
    .digest('hex');

export function passwordConfigured() {
  return secret().length >= 10;
}

export function validPassword(attempt) {
  return passwordConfigured() &&
    typeof attempt === 'string' &&
    equal(attempt, secret());
}

export function makeSession() {
  const expiry = Math.floor(Date.now() / 1000) + 7 * 86400;
  return `${expiry}.${signature(expiry)}`;
}

export async function authorized() {
  if (!passwordConfigured()) return false;

  const value = (await cookies()).get(SESSION_COOKIE)?.value || '';
  const match = /^(\d{10})\.([a-f0-9]{64})$/.exec(value);
  if (!match) return false;

  const expiry = Number(match[1]);
  const now = Math.floor(Date.now() / 1000);

  return expiry > now &&
    expiry < now + 8 * 86400 &&
    equal(match[2], signature(expiry));
}

function csvRows(source) {
  const rows = [];
  let row = [], cell = '', quoted = false;

  for (let i = 0; i < source.length; i++) {
    const c = source[i];

    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(cell.trim());
      cell = '';

      if (c === '\n') {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else if (c !== '\r' || quoted) {
      cell += c;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows;
}

export async function listedConstants() {
  const file = path.join(
    process.cwd(),
    'constant_engine/symbols/symbols.csv'
  );

  const rows = csvRows(await readFile(file, 'utf8'));
  const head = rows.shift();
  const at = field => head.indexOf(field);

  return rows.map(row => ({
    token: row[at('token')],
    name: row[at('name')],
    value: row[at('value')],
    dimension: row[at('dimension')],
  }))
  .filter(x =>
    x.dimension === '-' &&
    (/^[A-Za-z_][A-Za-z_0-9]*$/.test(x.token) || x.token === 'F*') &&
    x.value &&
    Number.isFinite(Number(x.value)) &&
    Number(x.value) !== 0
  )
  .sort((a, b) => a.name.localeCompare(b.name));
}
