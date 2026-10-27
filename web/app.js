'use strict';
const $ = id => document.getElementById(id);
let watched = 0;
let revision = 0;
let movieRevision = 0;
let loadedEpisode = null;
let loadedMovie = null;
let movies = [];
let chatPending = false;
let movieChatPending = false;
const episodeGreeting = 'Welcome aboard, captain! Open an episode recap, then ask me about it. I’ll leave the discoveries ahead of you out of the conversation.';
const movieGreeting = 'Welcome to the movie den! Choose a movie you’ve finished and open its log. This chat stays inside that movie’s story.';
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
async function post(path, body) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The ship’s radio lost its signal. Please try again.');
  return data;
}
function message(target, text, role, sources = []) {
  const item = node('div', text, `message ${role}`);
  const labels = [...new Set(sources.map(source => source.movie ? 'Selected movie notes' : `Episode ${source.episode}`))];
  if (labels.length) item.append(node('small', labels.join(' · ')));
  $(target).append(item);
  $(target).scrollTop = $(target).scrollHeight;
}
function number(id, minimum) {
  const value = $(id).valueAsNumber;
  if (!Number.isInteger(value) || value < minimum || value > 1156) throw new Error(`Enter a whole episode number from ${minimum} to 1156.`);
  return value;
}
function resetEpisode() {
  loadedEpisode = null;
  $('episode-result').replaceChildren(node('p', 'Choose an episode within your watched limit to open a fresh page.', 'context-note'));
  $('episode-pager').hidden = true;
  $('messages').replaceChildren();
  message('messages', episodeGreeting, 'assistant');
  $('episode-scope').textContent = 'Open a recap to ask about that episode.';
}
function resetMovie() {
  movieRevision++;
  loadedMovie = null;
  $('movie-result').replaceChildren(node('p', 'Open a watched movie’s log to reveal its story.', 'context-note'));
  $('movie-messages').replaceChildren();
  message('movie-messages', movieGreeting, 'assistant');
  $('movie-scope').textContent = 'No movie unlocked yet.';
}
$('watch-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    watched = number('watched', 0);
    revision++;
    resetEpisode();
    resetMovie();
    $('movie-watched').checked = false;
    $('limit-status').querySelector('span').textContent = `Spoiler guard on · ${watched ? `Through episode ${watched}` : 'No episodes unlocked'}`;
    $('connection-status').textContent = '';
  } catch (error) { $('connection-status').textContent = error.message; }
});
function sourceLink(target, data) {
  const credit = node('p', data.source || 'Log Pose original notes', 'source-note');
  if (data.source_url && /^https:\/\//.test(data.source_url)) {
    credit.append(document.createTextNode(' · '));
    const link = node('a', 'Read the source');
    link.href = data.source_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    credit.append(link);
  }
  target.append(credit);
}
async function openEpisode() {
  const current = ++revision;
  const button = $('episode-form').querySelector('button');
  button.disabled = true;
  $('episode-pager').hidden = true;
  // Clear stale chat immediately, even when the new source is unavailable.
  resetEpisode();
  $('episode-result').replaceChildren(node('p', 'Unrolling your episode log…', 'loading'));
  try {
    const episode = number('episode', 1);
    const data = await post('/api/episode', { episode, watched });
    if (current !== revision) return;
    loadedEpisode = episode;
    const recap = node('article', undefined, 'recap');
    recap.append(node('p', `EPISODE ${data.number} · THE STORY SO FAR`, 'recap-label'));
    if (data.title) recap.append(node('h4', data.title));
    recap.append(node('p', data.summary));
    if (data.external) recap.append(node('p', 'This is an episode description from an external source. Its wording may include context beyond the episode; source descriptions are not independently spoiler-audited.', 'external-warning'));
    for (const image of data.images || []) {
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = image.url;
      img.alt = image.alt;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => img.remove());
      const credit = node('figcaption', `${image.credit} · ${image.permission}`);
      figure.append(img, credit);
      recap.append(figure);
    }
    sourceLink(recap, data);
    $('episode-result').replaceChildren(recap);
    $('episode-scope').textContent = `Aboard the log · Episode ${episode} only`;
    $('page-number').textContent = `${episode} / 1156`;
    $('previous').disabled = episode <= 1;
    $('next').disabled = episode >= Math.min(watched, 1156);
    $('episode-pager').hidden = false;
  } catch (error) {
    if (current === revision) $('episode-result').replaceChildren(node('p', error.message, 'error'));
  } finally { button.disabled = false; }
}
$('episode-form').addEventListener('submit', event => { event.preventDefault(); openEpisode(); });
for (const [id, delta] of [['previous', -1], ['next', 1]]) $(id).addEventListener('click', () => {
  if (loadedEpisode === null) return;
  $('episode').value = String(loadedEpisode + delta);
  openEpisode();
});
$('chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (chatPending) return;
  const question = $('question').value.trim();
  if (!question) return;
  if (loadedEpisode === null) { message('messages', 'Open an unlocked episode recap first, captain. I need that page to answer safely.', 'assistant'); return; }
  const current = revision;
  chatPending = true;
  $('send').disabled = true;
  $('send').textContent = '…';
  message('messages', question, 'user');
  $('question').value = '';
  try {
    const data = await post('/api/chat', { question, watched, episode: loadedEpisode });
    if (current !== revision) return;
    message('messages', data.answer, 'assistant', data.sources);
    if (data.fallback) message('messages', 'The AI radio is unavailable. These are local notes from your selected episode.', 'assistant');
  } catch (error) { if (current === revision) message('messages', error.message, 'assistant'); }
  finally { chatPending = false; $('send').disabled = false; $('send').textContent = '↑'; }
});
function showPanel(mode) {
  const episode = mode === 'episode';
  $('episode-panel').hidden = !episode;
  $('movie-panel').hidden = episode;
  for (const [id, active] of [['episode-tab', episode], ['movie-tab', !episode]]) {
    $(id).classList.toggle('active', active);
    $(id).setAttribute('aria-pressed', String(active));
  }
}
$('episode-tab').addEventListener('click', () => showPanel('episode'));
$('movie-tab').addEventListener('click', () => showPanel('movie'));
$('movie').addEventListener('change', () => {
  $('movie-watched').checked = false;
  resetMovie();
  const movie = movies.find(item => item.id === Number($('movie').value));
  $('movie-context').textContent = movie ? `Recommended anime context: through episode ${movie.minimum_episode}. Current limit: ${watched}. ${watched < movie.minimum_episode ? 'Locked until you reach that episode.' : 'Anime threshold reached.'}` : 'Choose a movie to check its anime viewing threshold.';
});
$('movie-watched').addEventListener('change', () => { if (!$('movie-watched').checked) resetMovie(); });
$('movie-form').addEventListener('submit', async event => {
  event.preventDefault();
  const current = revision;
  const currentMovie = movieRevision;
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  $('movie-result').replaceChildren(node('p', 'Opening the picture show…', 'loading'));
  try {
    const data = await post('/api/movie', { movie: Number($('movie').value), watched, movie_watched: $('movie-watched').checked });
    if (current !== revision || currentMovie !== movieRevision) return;
    loadedMovie = data.id;
    const recap = node('article', undefined, 'recap');
    recap.append(node('p', `FEATURE FILM · ${data.year} · FULL STORY`, 'recap-label'), node('h4', data.title));
    for (const section of data.sections) recap.append(node('h5', section.heading), node('p', section.text));
    sourceLink(recap, data);
    $('movie-result').replaceChildren(recap);
    $('movie-scope').textContent = `Now discussing · ${data.title}`;
  } catch (error) { if (current === revision && currentMovie === movieRevision) $('movie-result').replaceChildren(node('p', error.message, 'error')); }
  finally { button.disabled = false; }
});
$('movie-chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (movieChatPending) return;
  const question = $('movie-question').value.trim();
  if (!question) return;
  if (loadedMovie === null || !$('movie-watched').checked) { message('movie-messages', 'Open a movie you’ve finished before using its chat, captain.', 'assistant'); return; }
  const current = revision;
  const currentMovie = movieRevision;
  movieChatPending = true;
  $('movie-send').disabled = true;
  $('movie-send').textContent = '…';
  message('movie-messages', question, 'user');
  $('movie-question').value = '';
  try {
    const data = await post('/api/movie-chat', { movie: loadedMovie, watched, movie_watched: true, question });
    if (current !== revision || currentMovie !== movieRevision) return;
    message('movie-messages', data.answer, 'assistant', data.sources);
    if (data.fallback) message('movie-messages', 'The AI radio is unavailable. This reply used local movie notes.', 'assistant');
  } catch (error) { if (current === revision && currentMovie === movieRevision) message('movie-messages', error.message, 'assistant'); }
  finally { movieChatPending = false; $('movie-send').disabled = false; $('movie-send').textContent = '↑'; }
});
for (const button of document.querySelectorAll('[data-question]')) button.addEventListener('click', () => {
  $('question').value = button.dataset.question;
  $('question').focus();
});
for (const button of document.querySelectorAll('[data-movie-question]')) button.addEventListener('click', () => {
  $('movie-question').value = button.dataset.movieQuestion;
  $('movie-question').focus();
});
async function initialize() {
  try {
    const [statusResponse, movieResponse] = await Promise.all([fetch('/api/status'), fetch('/api/movies')]);
    if (!statusResponse.ok || !movieResponse.ok) throw new Error('Could not load the ship’s logs. Check that the C++ server is running.');
    const status = await statusResponse.json();
    movies = (await movieResponse.json()).movies;
    for (const movie of movies) {
      const option = node('option', `${String(movie.id).padStart(2, '0')} · ${movie.title} (${movie.year})`);
      option.value = String(movie.id);
      $('movie').append(option);
    }
    $('chat-mode').textContent = status.ai_configured ? 'ChatGPT selection configured · only unlocked notes are displayed.' : 'Local fact helper · no API key needed to set sail.';
  } catch (error) { $('connection-status').textContent = error.message; }
}
initialize();
