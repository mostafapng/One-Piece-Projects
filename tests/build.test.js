import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateCatalog } from '../lib/catalog.js';

const episodes = JSON.parse(readFileSync(new URL('../data/episodes.json', import.meta.url)));
const movies = JSON.parse(readFileSync(new URL('../data/movies.json', import.meta.url)));

test('incomplete, blank, and duplicate catalogs cannot ship', () => {
  assert.throws(() => validateCatalog(episodes.slice(0, -1), movies));
  const bad = structuredClone(episodes);
  bad[1014].summary = '   ';
  assert.throws(() => validateCatalog(bad, movies));
  bad[1014].summary = episodes[1014].summary;
  bad[1155].number = 1;
  assert.throws(() => validateCatalog(bad, movies));
  assert.throws(() => validateCatalog(episodes, movies.slice(0, -1)));
});

test('Vercel build publishes only frontend assets; server catalogs and environment stay private', () => {
  const result = spawnSync(process.execPath, ['scripts/build-web.js'], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = new URL('../public/', import.meta.url);
  assert.deepEqual(readdirSync(output).sort(), ['app.js', 'assets', 'index.html', 'style.css']);
  for (const forbidden of ['data', 'episodes.json', 'movies.json', '.env', 'api', 'src', 'vendor', 'node_modules']) {
    assert.equal(existsSync(new URL(forbidden, output)), false, forbidden);
  }
  const client = readFileSync(new URL('app.js', output), 'utf8');
  assert.ok(!client.includes('process.env'));
  assert.ok(!client.includes('Bearer '));
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));
  assert.equal(config.outputDirectory, 'public');
  assert.equal(config.functions['api/*.js'].includeFiles, 'data/**');
  assert.equal(readdirSync(new URL('../api/', import.meta.url)).filter(path => path.endsWith('.js')).length, 6);
});
