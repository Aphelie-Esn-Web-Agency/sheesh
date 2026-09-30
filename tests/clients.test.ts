import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { askJev, MAX_STATE_CHARACTERS, type Questions } from '../src/lib/jev.js';
import { askLlm } from '../src/lib/llm.js';

const questions = { signal: { type: 'noul', instructions: 'Un signal est présent.' } } satisfies Questions;
// Données synthétiques, exclusivement destinées au test du transport et du schéma.
const response = { model: 'identifiant-synthetique', answers: { signal: { type: 'noul', noul: 0.5 } }, usage: { input_tokens: 1, output_tokens: 1, cost: 0 } };
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubEnv('OPENROUTER_API_KEY', randomUUID());
  vi.stubEnv('JEV_MODEL', 'jev-1.13');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
it('renvoie les réponses, l’usage, le modèle et la latence', async () => {
  fetchMock.mockResolvedValue(Response.json(response));
  const result = await askJev('Contexte', questions);
  expect(result).toMatchObject({ ...response, truncated: false });
  expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  expect(fetchMock.mock.calls[0]?.[0]).toBe('https://openrouter.ai/api/v1/systemone');
});
it.each([429, 500, 503])('réessaie une seule fois après HTTP %s', async status => {
  fetchMock.mockResolvedValueOnce(new Response('', { status })).mockResolvedValueOnce(Response.json(response));
  await expect(askJev('Contexte', questions, { retryDelayMs: 0 })).resolves.toMatchObject({ answers: response.answers });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('ne fait jamais un troisième essai', async () => {
  fetchMock.mockImplementation(async () => new Response('', { status: 503 }));
  await expect(askJev('Contexte', questions, { retryDelayMs: 0 })).rejects.toThrow('HTTP 503');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('ne réessaie pas une erreur 401', async () => {
  fetchMock.mockResolvedValue(new Response('corps non journalisable', { status: 401 }));
  await expect(askJev('Contexte', questions)).rejects.toThrow('HTTP 401');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('ne réessaie pas une erreur réseau et ne divulgue pas son contenu', async () => {
  fetchMock.mockRejectedValue(new Error('contenu privé'));
  await expect(askJev('Contexte', questions)).rejects.toThrow('OpenRouter : échec réseau.');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('interrompt une requête lente', async () => {
  fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  await expect(askJev('Contexte', questions, { timeoutMs: 10 })).rejects.toThrow('délai de 10 ms dépassé');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('tronque sous 30 000 tokens estimés avec avertissement', async () => {
  fetchMock.mockResolvedValue(Response.json(response));
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect((await askJev('x'.repeat(120_001), questions)).truncated).toBe(true);
  const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
  expect(body.state.length).toBe(MAX_STATE_CHARACTERS);
  expect(warning).toHaveBeenCalledOnce();
});
it.each([{}, { ...response, answers: {} }, { ...response, usage: { cost: -1 } }])('refuse une réponse malformée', async body => {
  fetchMock.mockResolvedValue(Response.json(body));
  await expect(askJev('Contexte', questions)).rejects.toThrow('non conforme');
});
it('refuse une clé absente sans appeler le réseau', async () => {
  vi.stubEnv('OPENROUTER_API_KEY', '');
  await expect(askJev('Contexte', questions)).rejects.toThrow('manquante');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('refuse un modèle Jev non figé', async () => {
  vi.stubEnv('JEV_MODEL', 'jev-latest');
  await expect(askJev('Contexte', questions)).rejects.toThrow('version figée');
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each(['small', 'large'] as const)('ne choisit aucun modèle génératif par défaut pour %s', async size => {
  vi.stubEnv(size === 'small' ? 'LLM_MODEL_SMALL' : 'LLM_MODEL_LARGE', '');
  await expect(askLlm([{ role: 'user', content: 'Test' }], size)).rejects.toThrow('manquante');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('transmet exactement le modèle configuré pour le LLM', async () => {
  const configuredModel = randomUUID();
  vi.stubEnv('LLM_MODEL_SMALL', configuredModel);
  fetchMock.mockResolvedValue(Response.json({ model: configuredModel, choices: [{ message: { content: 'Texte synthétique.' } }] }));
  await expect(askLlm([{ role: 'user', content: 'Test' }], 'small')).resolves.toMatchObject({ content: 'Texte synthétique.' });
  expect(fetchMock.mock.calls[0]?.[0]).toBe('https://openrouter.ai/api/v1/chat/completions');
  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe(configuredModel);
});
