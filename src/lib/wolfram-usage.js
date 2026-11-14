import os from 'node:os';
import path from 'node:path';
import { mkdir, appendFile, readFile } from 'node:fs/promises';

const ALLOWANCE = 2000;
const ZONE = 'America/Denver';

const FILE = path.join(
  os.homedir(),
  '.cache/physics-monastery/wolfram-usage.jsonl'
);

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date());

  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;

  return `${year}-${month}`;
}

export async function recordWolframAttempt() {
  await mkdir(path.dirname(FILE), { recursive: true });

  await appendFile(
    FILE,
    JSON.stringify({
      month: currentMonth(),
      timestamp: new Date().toISOString()
    }) + '\n',
    { mode: 0o600 }
  );
}

export async function getWolframUsage() {
  const month = currentMonth();
  let contents = '';

  try {
    contents = await readFile(FILE, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  let used = 0;

  for (const line of contents.split('\n')) {
    if (!line.trim()) continue;

    const entry = JSON.parse(line);
    if (entry.month === month) used++;
  }

  const [year, number] = month.split('-').map(Number);
  const nextYear = number === 12 ? year + 1 : year;
  const nextMonth = number === 12 ? 1 : number + 1;

  return {
    allowance: ALLOWANCE,
    used,
    remaining: Math.max(0, ALLOWANCE - used),
    nextReset: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
    timeZone: ZONE
  };
}
