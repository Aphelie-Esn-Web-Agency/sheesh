import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { askJev, isRecord, type Answers, type JevResponse, type Questions } from './jev.js';
import { assertDryRun, performActions, type Action, type ActionResult } from './actions.js';
import { writeResult } from './logger.js';

export type Fixture = { id: string; attendu: Record<string, unknown> };
export type HumanDecision = { route: 'revue_humaine'; raison: string };
export const human = (raison: string): HumanDecision => ({ route: 'revue_humaine', raison });
export function fixtureBase(value: unknown): asserts value is Fixture & Record<string, unknown> {
  if (!isRecord(value) || typeof value.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)
    || !isRecord(value.attendu) || !Object.keys(value.attendu).length) throw new Error('Fixture : id ou attendu invalide.');
}
export function requireText(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Fixture : champ ${name} manquant.`);
}

/** Les attentes servent à la comparaison humaine, jamais au contexte envoyé au modèle. */
export async function executeCase<D extends { route: string }>(config: {
  caseId: string; fixture: Fixture; questions: Questions;
  prepare: () => { state: string; metadata?: Record<string, unknown> };
  decide: (answers: Answers) => D;
  actions: (decision: D) => Action[];
}) {
  let response: JevResponse | null = null;
  let decision: D | HumanDecision;
  let actions: ActionResult[] = [];
  let metadata: Record<string, unknown> = {};
  let failure: string | null = null;
  try {
    assertDryRun();
    const prepared = config.prepare();
    metadata = prepared.metadata ?? {};
    response = await askJev(prepared.state, config.questions);
    if (response.truncated) {
      decision = human('contexte_tronque');
      actions = await performActions([{ tool: 'human', operation: 'revue', payload: { raison: 'contexte_tronque' } }]);
    } else {
      decision = config.decide(response.answers);
      actions = await performActions(config.actions(decision));
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : 'Erreur inconnue.';
    decision = human('echec_execution');
    // Cette entrée représente une file locale, même si les adaptateurs sont désactivés.
    actions = [{ tool: 'human', operation: 'revue', payload: { raison: 'echec_execution' }, simulated: true }];
    console.error(`[${config.caseId}/${config.fixture.id}] ${failure}`);
    console.log('[REVUE_LOCALE]', JSON.stringify(actions[0]));
  }
  const result = {
    caseId: config.caseId, fixture: config.fixture.id, date: new Date().toISOString(),
    statut: failure ? 'erreur' : 'termine', dryRun: true,
    attendu: config.fixture.attendu, decision, response, actions, metadata, error: failure,
  };
  await writeResult(config.caseId, config.fixture.id, result);
  return result;
}

export async function cli(importUrl: string, run: (fixture: unknown) => Promise<{ statut: string }>): Promise<void> {
  if (!process.argv[1] || importUrl !== pathToFileURL(resolve(process.argv[1])).href) return;
  try {
    const path = process.argv[2];
    if (!path) throw new Error('Indiquez le chemin du fichier JSON de fixture.');
    const result = await run(JSON.parse(await readFile(path, 'utf8')));
    if (result.statut === 'erreur') process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Exécution impossible.');
    process.exitCode = 1;
  }
}
