import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { run as run04 } from './cases/04-demandes-internes.js';
import { run as run14 } from './cases/14-revue-pr.js';
import { run as run15 } from './cases/15-donnees-personnelles.js';

// Liste explicite : aucun autre cas n'est exécuté. Les appels restent séquentiels.
for (const [caseId, run] of [['04', run04], ['14', run14], ['15', run15]] as const) {
  const directory = resolve('fixtures', caseId);
  for (const filename of (await readdir(directory)).filter(name => name.endsWith('.json')).sort()) {
    try {
      const fixture: unknown = JSON.parse(await readFile(resolve(directory, filename), 'utf8'));
      const result = await run(fixture);
      if (result.statut === 'erreur') process.exitCode = 1;
    } catch (error) {
      console.error(`[${caseId}/${filename}]`, error instanceof Error ? error.message : 'Erreur inconnue.');
      process.exitCode = 1;
    }
  }
}
