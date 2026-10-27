import { cpSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { getEpisode, LAST_EPISODE } from '../lib/catalog.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'public');
// Fail the build before deploying an incomplete catalog. lib/catalog also validates movies.
for (let n = 1; n <= LAST_EPISODE; n++) {
  if (!getEpisode(n)?.summary?.trim()) throw new Error(`Missing episode ${n}`);
}
rmSync(output, { recursive: true, force: true });
mkdirSync(resolve(output, 'assets'), { recursive: true });
// Allowlisted UI files only: no source, JSON catalogs, .env files, or dependencies.
for (const file of ['index.html', 'app.js', 'style.css']) cpSync(resolve(root, 'web', file), resolve(output, file));
for (const folder of ['art', 'fonts']) cpSync(resolve(root, 'web', folder), resolve(output, 'assets', folder), { recursive: true });
const html = readFileSync(resolve(output, 'index.html'), 'utf8');
if (!html.includes('All 1,156 episode summaries are onboard')) throw new Error('Unexpected frontend build.');
console.log('Built public/ for Vercel. All 1156 summaries remain server-side; 15 movies validated.');
