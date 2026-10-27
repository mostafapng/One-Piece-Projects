import { LAST_EPISODE, CATALOG_VERSION, getEpisode, getMovie, listMovies, earlierFacts } from './catalog.js';
import { aiConfigured, answer, recapFacts, movieFacts, asksForSummary, words, MOVIE_UNKNOWN } from './chat.js';

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
const BODY_LIMIT = 8192;
const METHODS = { status: 'GET', movies: 'GET', episode: 'POST', chat: 'POST', movie: 'POST', 'movie-chat': 'POST' };

class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function jsonResponse(res, body, status = 200) {
  res.statusCode = status;
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export function integer(body, name, minimum = 0) {
  const n = body[name];
  if (!Number.isInteger(n) || n < minimum || n > LAST_EPISODE) throw new InputError(`Use a whole-number ${name} from ${minimum} to ${LAST_EPISODE}.`);
  return n;
}

function questionFrom(body) {
  const question = body.question;
  if (typeof question !== 'string' || !question.trim() || Buffer.byteLength(question) > 1000 || !words(question).size) {
    throw new InputError('Ask a question using 1–1000 characters.');
  }
  return question;
}

async function readBody(req) {
  if ((req.headers['content-type'] || '').toLowerCase().split(';')[0].trim() !== 'application/json') {
    throw new InputError('Send requests as application/json.', 415);
  }
  // Vercel may have parsed the body already. Local Node requests remain streams.
  let body;
  if (req.body !== undefined) {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
    if (Buffer.byteLength(typeof raw === 'string' ? raw : JSON.stringify(raw)) > BODY_LIMIT) throw new InputError('Request too large.', 413);
    body = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } else {
    const length = Number(req.headers['content-length']);
    if (Number.isFinite(length) && length > BODY_LIMIT) throw new InputError('Request too large.', 413);
    const buffers = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size <= BODY_LIMIT) buffers.push(chunk);
    }
    if (size > BODY_LIMIT) throw new InputError('Request too large.', 413);
    body = JSON.parse(Buffer.concat(buffers).toString('utf8'));
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Send a JSON object.');
  return body;
}

function checkOrigin(req) {
  if (req.headers['sec-fetch-site'] === 'cross-site') throw new InputError('Cross-origin requests are not allowed.', 403);
  const origin = req.headers.origin;
  if (!origin) return; // Local CLI callers and same-origin requests without Origin.
  try {
    const parsed = new URL(origin);
    // Works behind Vercel's HTTPS termination as well as local HTTP.
    if (!['https:', 'http:'].includes(parsed.protocol) || origin !== `${parsed.protocol}//${req.headers.host}`) throw new Error();
  } catch {
    throw new InputError('Cross-origin requests are not allowed.', 403);
  }
}

export async function execute(route, body = {}, { accessCode, env = process.env } = {}) {
  if (route === 'status') return {
    catalog_version: CATALOG_VERSION, episode_min: 1, episode_max: LAST_EPISODE,
    offline_episode_count: LAST_EPISODE, ai_configured: aiConfigured(env), ai_requires_access_code: true,
    episode_source: 'Bundled episode catalog · no external episode service or API key required',
    spoiler_policy: 'Episode recaps require a watched limit; movie summaries require separate confirmation.',
  };
  if (route === 'movies') return { movies: listMovies() };
  const watched = integer(body, 'watched');
  if (route === 'episode') {
    const episode = integer(body, 'episode', 1);
    if (episode > watched) throw new InputError('That episode is beyond your watched limit. No details have been loaded.', 403);
    return getEpisode(episode);
  }
  if (route === 'chat') {
    const question = questionFrom(body);
    let facts;
    if (Object.hasOwn(body, 'episode')) {
      const episode = integer(body, 'episode', 1);
      if (episode > watched) throw new InputError('That episode is beyond your watched limit.', 403);
      facts = recapFacts(getEpisode(episode));
    } else {
      facts = earlierFacts(watched);
    }
    return answer(question, facts, { accessCode, env });
  }
  if (route === 'movie' || route === 'movie-chat') {
    const id = integer(body, 'movie', 1);
    if (body.movie_watched !== true) throw new InputError('Confirm you have finished this movie before opening its full summary or chat.', 403);
    const movie = getMovie(id);
    if (!movie) throw new InputError('Choose a movie from the catalog.', 404);
    if (watched < movie.minimum_episode) throw new InputError('This movie is locked at your anime limit. It can reveal characters or abilities you have not reached yet.', 403);
    if (route === 'movie') return movie;
    const question = questionFrom(body);
    if (asksForSummary(question)) return {
      answer: movie.sections.map(section => section.text).join('\n\n'),
      mode: 'local', sources: [{ movie: id }],
    };
    return answer(question, movieFacts(movie), { accessCode, env, unknown: MOVIE_UNKNOWN });
  }
  throw new InputError('Not found.', 404);
}

export function createHandler(route) {
  return async function handler(req, res) {
    try {
      if (!METHODS[route]) throw new InputError('Not found.', 404);
      if (req.method !== METHODS[route]) {
        res.setHeader('Allow', METHODS[route]);
        throw new InputError('Method not allowed.', 405);
      }
      let body = {};
      if (req.method === 'POST') { checkOrigin(req); body = await readBody(req); }
      jsonResponse(res, await execute(route, body, { accessCode: req.headers['x-companion-access-code'] }));
    } catch (error) {
      const status = error instanceof InputError ? error.status : error instanceof SyntaxError ? 400 : 500;
      // No stack traces, provider error bodies, environment values, or keys in responses.
      jsonResponse(res, { error: status === 500 ? 'The companion could not complete that request.' : error instanceof SyntaxError ? 'Send valid JSON.' : error.message }, status);
    }
  };
}
