import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { askJev, type Answers, type Questions } from '../src/lib/jev.js';
import { writeResult } from '../src/lib/logger.js';
import { run as run04, QUESTIONS as questions04 } from '../src/cases/04-demandes-internes.js';
import { run as run14, QUESTIONS as questions14 } from '../src/cases/14-revue-pr.js';
import { run as run15, QUESTIONS as questions15 } from '../src/cases/15-donnees-personnelles.js';

vi.mock('../src/lib/jev.js', async importOriginal => ({ ...await importOriginal<typeof import('../src/lib/jev.js')>(), askJev: vi.fn() }));
vi.mock('../src/lib/logger.js', () => ({ writeResult: vi.fn(async () => 'journal-simule') }));
const fixture = async (caseId: string, id: string) => JSON.parse(await readFile(`fixtures/${caseId}/${id}.json`, 'utf8'));
function synthetic(questions: Questions): Answers {
  return Object.fromEntries(Object.entries(questions).map(([key, q]) => [key, q.type === 'noul'
    ? { type: 'noul', noul: 0.1 }
    : { type: 'choice', choice: Object.keys(q.criteria)[0]!, confidence: 0.9,
      probabilities: Object.fromEntries(Object.keys(q.criteria).map((category, index) => [category, index === 0 ? 1 : 0])) }]));
}
function answer(questions: Questions, truncated = false) {
  // Réponse artificielle du test, jamais persistée dans results/.
  vi.mocked(askJev).mockResolvedValue({ model: 'test-synthetique', answers: synthetic(questions), usage: { input_tokens: 1, output_tokens: 1, cost: 0 }, latencyMs: 0, truncated });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('DRY_RUN', 'true');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Réseau interdit pendant ce test.'); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it.each([
  ['04', 'bug-bloquant', run04], ['14', 'auth-chemin', run14], ['15', 'sante-mineur', run15],
] as const)('%s : échec Jev vers une revue humaine journalisée', async (caseId, id, run) => {
  vi.mocked(askJev).mockRejectedValue(new Error('OpenRouter : HTTP 503.'));
  const result = await run(await fixture(caseId, id));
  expect(result).toMatchObject({ statut: 'erreur', response: null, decision: { route: 'revue_humaine' } });
  expect(result.actions.every(action => action.tool === 'human')).toBe(true);
  expect(writeResult).toHaveBeenCalledWith(caseId, id, result);
  expect(fetch).not.toHaveBeenCalled();
  if (caseId === '14') expect(result.metadata).toMatchObject({ labelsDeterministes: ['revue:codeowners', 'sensible:auth'] });
});
it('04 : simule Asana et Slack pour un blocage net', async () => {
  // Remplacer directement la réponse simulée sans lancer le client.
  const answers = synthetic(questions04); answers.bloquant = { type: 'noul', noul: 0.9 };
  vi.mocked(askJev).mockResolvedValue({ model: 'test', answers, usage: { input_tokens: 1, output_tokens: 1, cost: 0 }, latencyMs: 0, truncated: false });
  const result = await run04(await fixture('04', 'bug-bloquant'));
  expect(result.actions.map(action => action.tool)).toEqual(['asana', 'slack']);
  expect(result.actions.every(action => action.simulated)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
it('14 : simule labels et demande senior sans approuver', async () => {
  answer(questions14);
  const result = await run14(await fixture('14', 'auth-chemin'));
  expect(result.actions.map(action => action.operation)).toEqual(['ajouter_labels', 'demander_revue']);
  expect(result.decision).toMatchObject({ route: 'revue_senior', approuvee: false });
});
it('15 : masque avant Jev et ne journalise aucun message', async () => {
  answer(questions15);
  const input = await fixture('15', 'coordonnees-structurees');
  const result = await run15(input);
  const state = vi.mocked(askJev).mock.calls[0]?.[0];
  expect(state).not.toContain('contact@example.invalid');
  expect(state).not.toContain('4242 4242');
  expect(state).toContain('[MASQUE_EMAIL]');
  expect(result.decision).toEqual({ route: 'anonymisation' });
  expect(JSON.stringify(result)).not.toContain(input.message);
  expect(JSON.stringify(result)).not.toContain('contact@example.invalid');
});
it('15 : ne transmet rien au tiers en cas de blocage sémantique', async () => {
  const answers = synthetic(questions15); answers.mention_sante = { type: 'noul', noul: 0.9 };
  vi.mocked(askJev).mockResolvedValue({ model: 'test', answers, usage: { input_tokens: 1, output_tokens: 1, cost: 0 }, latencyMs: 0, truncated: false });
  const result = await run15(await fixture('15', 'sante-mineur'));
  expect(result.decision.route).toBe('blocage');
  expect(result.actions.some(action => action.tool === 'outbound')).toBe(false);
});
it('une troncature interdit toute affectation automatique', async () => {
  answer(questions04, true);
  const result = await run04(await fixture('04', 'bug-bloquant'));
  expect(result.decision).toEqual({ route: 'revue_humaine', raison: 'contexte_tronque' });
  expect(result.actions.every(action => action.tool === 'human')).toBe(true);
});
it('DRY_RUN=false refuse avant tout appel Jev', async () => {
  vi.stubEnv('DRY_RUN', 'false');
  const result = await run04(await fixture('04', 'bug-bloquant'));
  expect(result.statut).toBe('erreur');
  expect(askJev).not.toHaveBeenCalled();
});
it('DRY_RUN absent signifie simulation', async () => {
  vi.stubEnv('DRY_RUN', undefined);
  answer(questions04);
  expect((await run04(await fixture('04', 'bug-bloquant'))).actions[0]?.simulated).toBe(true);
});
it('ne transmet pas les attentes humaines au modèle', async () => {
  answer(questions04);
  const input = await fixture('04', 'bug-bloquant');
  input.attendu = { note: 'MARQUEUR_ATTENTE_HUMAINE' };
  await run04(input);
  expect(vi.mocked(askJev).mock.calls[0]?.[0]).not.toContain('MARQUEUR_ATTENTE_HUMAINE');
});
it('run-all traite les 18 fixtures des seuls cas 04, 14 et 15', async () => {
  vi.mocked(askJev).mockImplementation(async (_state, questions) => ({
    model: 'test-synthetique', answers: synthetic(questions),
    usage: { input_tokens: 1, output_tokens: 1, cost: 0 }, latencyMs: 0, truncated: false,
  }));
  await import('../src/run-all.js');
  expect(askJev).toHaveBeenCalledTimes(18);
  expect(writeResult).toHaveBeenCalledTimes(18);
  const calls = vi.mocked(writeResult).mock.calls;
  for (const id of ['04', '14', '15']) expect(calls.filter(([caseId]) => caseId === id)).toHaveLength(6);
  expect(calls.every(([, , result]) => (result as { statut: string }).statut === 'termine')).toBe(true);
});
