'use strict';
const $ = id => document.getElementById(id);
let watched = 0;
let revision = 0;
let pending = false;
const greeting = 'Welcome aboard! Ask about the One Piece episodes you’ve finished. I’ll only share facts inside your watched limit.';

async function post(path, body) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'That request could not be completed.');
  return data;
}
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function message(text, role, sources = []) {
  const item = node('div', text, `message ${role}`);
  if (sources.length) item.append(node('small', `From watched notes · ${[...new Set(sources.map(s => `episode ${s.episode}`))].join(', ')}`));
  $('messages').append(item);
  $('messages').scrollTop = $('messages').scrollHeight;
}
function number(id, minimum) {
  const input = $(id);
  const value = input.valueAsNumber;
  if (!Number.isInteger(value) || value < minimum || value > 100000) throw new Error('Enter a valid whole episode number.');
  return value;
}
$('watch-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    watched = number('watched', 0);
    revision++;
    // Clear content when the limit changes, including any in-flight replies.
    $('episode-result').replaceChildren(node('p', 'Choose an episode within your new watched limit.', 'small'));
    $('messages').replaceChildren();
    message(greeting, 'assistant');
    $('limit-status').textContent = `Spoiler guard on · ${watched ? `Through episode ${watched}` : 'No episodes unlocked'}`;
    $('connection-status').textContent = '';
  } catch (error) { $('connection-status').textContent = error.message; }
});
$('episode-form').addEventListener('submit', async event => {
  event.preventDefault();
  const current = revision;
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  try {
    const episode = number('episode', 1);
    const data = await post('/api/episode', { episode, watched });
    if (revision !== current) return;
    const recap = node('div', undefined, 'recap');
    recap.append(node('h3', `EPISODE ${data.number}`), node('p', data.summary));
    if (!data.images.length) recap.append(node('p', 'No verified episode photo is available yet. This space is reserved for a real episode image with source credit and permission.', 'photo-note'));
    for (const image of data.images) {
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = image.url;
      img.alt = image.alt;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => { img.remove(); figure.prepend(node('p', 'This episode image could not be loaded.', 'small')); });
      const credit = node('figcaption', `${image.credit} · ${image.permission} · `);
      const source = node('a', 'Image source');
      source.href = image.source_url;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      credit.append(source);
      figure.append(img, credit);
      recap.append(figure);
    }
    $('episode-result').replaceChildren(recap);
  } catch (error) {
    if (revision === current) $('episode-result').replaceChildren(node('p', error.message, 'error'));
  } finally { button.disabled = false; }
});
$('chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  const question = $('question').value.trim();
  if (!question) return;
  const current = revision;
  pending = true;
  $('send').disabled = true;
  $('send').textContent = '…';
  message(question, 'user');
  $('question').value = '';
  try {
    const data = await post('/api/chat', { question, watched });
    if (revision !== current) return;
    message(data.answer, 'assistant', data.sources);
    if (data.fallback) message('The AI service is unavailable. This reply used the local fact helper.', 'assistant');
  } catch (error) { if (revision === current) message(error.message, 'assistant'); }
  finally { pending = false; $('send').disabled = false; $('send').textContent = '↑'; }
});
for (const button of document.querySelectorAll('[data-question]')) button.addEventListener('click', () => {
  $('question').value = button.dataset.question;
  $('question').focus();
});
fetch('/api/status').then(response => {
  if (!response.ok) throw new Error('Server unavailable.');
  return response.json();
}).then(data => {
  $('chat-mode').textContent = data.ai_configured ? 'ChatGPT fact selection configured · replies stay in your unlocked notes.' : 'Local fact helper · ChatGPT can be connected with an API key.';
}).catch(() => { $('connection-status').textContent = 'Could not reach the companion. Check that the C++ server is running.'; });
