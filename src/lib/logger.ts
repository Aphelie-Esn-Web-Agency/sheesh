import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Un fichier par fixture, remplacé à chaque exécution. Aucun contexte brut n'est enregistré. */
export async function writeResult(caseId: string, fixtureId: string, result: unknown): Promise<string> {
  if (!/^(04|14|15)$/.test(caseId) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fixtureId)) {
    throw new Error('Identifiant de cas ou de fixture invalide pour le journal.');
  }
  const directory = resolve('results', caseId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = resolve(directory, `${fixtureId}.json`);
  await writeFile(file, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  return file;
}
