import { readFileSync } from 'node:fs';

export const LAST_EPISODE = 1156;
export const CATALOG_VERSION = 'offline-1156-vercel-v1';

export function validateCatalog(episodes, movies) {
  if (!Array.isArray(episodes) || episodes.length !== LAST_EPISODE) {
    throw new Error('Offline catalog must contain all 1156 episodes.');
  }
  const seen = new Set();
  const factIds = new Set();
  for (const episode of episodes) {
    if (!Number.isInteger(episode.number) || episode.number < 1 || episode.number > LAST_EPISODE || seen.has(episode.number)) {
      throw new Error('Invalid or duplicate episode.');
    }
    seen.add(episode.number);
    if (typeof episode.summary !== 'string' || !episode.summary.trim()) throw new Error('Blank episode summary.');
    if (!Array.isArray(episode.facts) || !Array.isArray(episode.images)) throw new Error('Invalid episode data.');
    for (const fact of episode.facts) {
      if (typeof fact.id !== 'string' || factIds.has(fact.id) || typeof fact.text !== 'string' ||
          !Array.isArray(fact.keywords) || !fact.keywords.every(word => typeof word === 'string')) {
        throw new Error('Invalid or duplicate fact.');
      }
      factIds.add(fact.id);
    }
    for (const image of episode.images) {
      for (const field of ['url', 'source_url', 'credit', 'permission', 'alt']) {
        if (typeof image[field] !== 'string' || !image[field].trim()) throw new Error('Missing image attribution.');
      }
      if (![image.url, image.source_url].every(url => /^https:\/\/[A-Za-z0-9.-]+\/\S*$/.test(url))) {
        throw new Error('Images and sources require HTTPS URLs.');
      }
    }
  }
  if (!Array.isArray(movies) || movies.length !== 15) throw new Error('Expected 15 theatrical movies.');
  const movieIds = new Set();
  for (const movie of movies) {
    if (!Number.isInteger(movie.id) || movie.id < 1 || movie.id > 15 || movieIds.has(movie.id) ||
        !Number.isInteger(movie.minimum_episode) || movie.minimum_episode < 0 || movie.minimum_episode > LAST_EPISODE ||
        typeof movie.title !== 'string' || !movie.title.trim() || !Number.isInteger(movie.year) ||
        !Array.isArray(movie.sections) || movie.sections.length < 3 ||
        !movie.sections.every(section => typeof section.heading === 'string' && typeof section.text === 'string' && section.text.trim())) {
      throw new Error('Invalid movie data.');
    }
    movieIds.add(movie.id);
  }
}

// Read-only data remains in the function bundle, never the public output directory.
// Explicit includeFiles in vercel.json also retains it during serverless packaging.
const episodes = JSON.parse(readFileSync(new URL('../data/episodes.json', import.meta.url), 'utf8'));
const movies = JSON.parse(readFileSync(new URL('../data/movies.json', import.meta.url), 'utf8'));
validateCatalog(episodes, movies);
const byEpisode = new Map(episodes.map(episode => [episode.number, episode]));
const byMovie = new Map(movies.map(movie => [movie.id, movie]));

export function getEpisode(number) {
  const episode = byEpisode.get(number);
  return episode ? { ...structuredClone(episode), bundled: true, external: false } : null;
}

export function getMovie(id) {
  const movie = byMovie.get(id);
  return movie ? structuredClone(movie) : null;
}

export function listMovies() {
  return movies.map(({ id, title, year, minimum_episode }) => ({ id, title, year, minimum_episode }));
}

export function earlierFacts(watched) {
  return episodes.filter(episode => episode.number <= watched)
    .flatMap(episode => episode.facts.map(fact => ({ ...fact, episode: episode.number })));
}
