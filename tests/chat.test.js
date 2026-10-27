import test from 'node:test';
import assert from 'node:assert/strict';
import { answer, aiAuthorized, aiConfigured, renderSelection, selectWithAI, recapFacts, movieFacts, UNKNOWN } from '../lib/chat.js';
import { getEpisode, getMovie } from '../lib/catalog.js';

const env = { ONE_PIECE_API_KEY: 'not-a-real-key', ONE_PIECE_AI_ACCESS_CODE: 'test-private-code-123456' };

test('a deployed key alone cannot enable anonymous paid calls', async () => {
  assert.equal(aiConfigured({ ONE_PIECE_API_KEY: 'not-a-real-key' }), false);
  assert.equal(aiConfigured({ ...env, ONE_PIECE_AI_ACCESS_CODE: 'short' }), false);
  assert.equal(aiAuthorized('wrong', env), false);
  assert.equal(aiAuthorized(env.ONE_PIECE_AI_ACCESS_CODE, env), true);
  let calls = 0;
  const result = await answer('Luffy', recapFacts(getEpisode(1)), {
    env, selector: async () => { calls++; throw new Error('Should not execute'); },
  });
  assert.equal(calls, 0);
  assert.equal(result.mode, 'local');
});

test('unknown and future AI IDs never introduce model prose or other episodes', async () => {
  const facts = recapFacts(getEpisode(1));
  const selected = renderSelection([facts[0].id, 'e1015-future', facts[0].id], facts, { mode: 'ai' });
  assert.equal(selected.sources.length, 1);
  assert.equal(selected.sources[0].episode, 1);
  assert.equal(renderSelection(['invented-prose'], facts).answer, UNKNOWN);
  const response = await answer('Luffy', facts, {
    env, accessCode: env.ONE_PIECE_AI_ACCESS_CODE,
    selector: async (_question, suppliedFacts) => {
      assert.ok(suppliedFacts.every(fact => fact.episode === 1));
      return { kind: 'answer', fact_ids: ['future-episode'], prose: 'DO_NOT_DISPLAY' };
    },
  });
  assert.deepEqual(response.sources, []);
  assert.ok(!response.answer.includes('DO_NOT_DISPLAY'));
});

test('AI failure or malformed selection falls back to free catalog text', async () => {
  for (const selector of [async () => { throw new Error('private-upstream-error'); }, async () => ({ kind: 'answer', fact_ids: [42] })]) {
    const result = await answer('Luffy', recapFacts(getEpisode(1)), { env, accessCode: env.ONE_PIECE_AI_ACCESS_CODE, selector });
    assert.equal(result.fallback, true);
    assert.equal(result.mode, 'local');
    assert.ok(!result.answer.includes('private-upstream-error'));
  }
});

test('Responses API adapter sends only selected facts and keeps the key in a server header', async () => {
  const facts = movieFacts(getMovie(10));
  const result = await selectWithAI('Tell me about Shiki', facts, {
    env,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      assert.equal(options.headers.Authorization, 'Bearer not-a-real-key');
      const request = JSON.parse(options.body);
      assert.equal(request.store, false);
      assert.ok(!options.body.includes('not-a-real-key'));
      assert.ok(!options.body.includes('Uta'));
      assert.ok(JSON.parse(request.input).available_facts.every(fact => fact.movie === 10));
      return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ kind: 'answer', fact_ids: [facts[0].id] }) }] }] }) };
    },
  });
  assert.deepEqual(result.fact_ids, [facts[0].id]);
});
