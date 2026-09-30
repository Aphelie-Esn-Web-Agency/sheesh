import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateReport, isConformant } from '../src/report.js';

// Journaux synthétiques, uniquement écrits dans un répertoire temporaire de test.
const sample = () => ({
  caseId: '04', fixture: 'test', statut: 'termine', error: null,
  attendu: { route: 'affectation_proposee', equipe: 'tech', prioritaire: false },
  decision: { route: 'affectation_proposee', equipe: 'tech', prioritaire: false, corrigeable: true },
  response: { truncated: false, usage: { cost: 0.000001 }, latencyMs: 123.5,
    answers: { equipe: { type: 'choice', choice: 'tech', confidence: 0.9, probabilities: { tech: 0.9, ops: 0.1 } }, bloquant: { type: 'noul', noul: 0.1 } } },
});
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'sheesh-report-'));
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Réseau interdit.'); }));
});
afterEach(async () => {
  expect(fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  await rm(directory, { recursive: true, force: true });
});
async function save(caseId: string, fixture: string, data: unknown) {
  await mkdir(join(directory, caseId), { recursive: true });
  await writeFile(join(directory, caseId, `${fixture}.json`), JSON.stringify(data));
}

describe('comparaison métier', () => {
  it('compare uniquement les champs attendus et ignore la note humaine', () => {
    const data = sample();
    expect(isConformant({ ...data, attendu: { ...data.attendu, note: 'Commentaire humain' } })).toBe(true);
  });
  it('compare les listes sans ordre, mais refuse les éléments supplémentaires', () => {
    const data = { ...sample(), attendu: { route: 'revue_senior', labels: ['auth', 'paiement'] }, decision: { route: 'revue_senior', labels: ['paiement', 'auth'] } };
    expect(isConformant(data)).toBe(true);
    data.decision.labels.push('infra');
    expect(isConformant(data)).toBe(false);
  });
  it('refuse une équipe différente ou un champ attendu manquant', () => {
    expect(isConformant({ ...sample(), decision: { ...sample().decision, equipe: 'ops' } })).toBe(false);
    expect(isConformant({ ...sample(), decision: { route: 'affectation_proposee', equipe: 'tech' } })).toBe(false);
  });
  it('ne confond pas booléen et chaîne de caractères', () => {
    expect(isConformant({ ...sample(), decision: { ...sample().decision, prioritaire: 'false' } })).toBe(false);
  });
  it.each([
    { statut: 'erreur' }, { error: 'erreur' }, { response: null }, { attendu: {} },
    { attendu: { note: 'Sans attente testable' } },
    { response: { ...sample().response, truncated: true } },
    { response: { ...sample().response, answers: {} } },
  ])('ne valide pas un résultat inexploitable : %j', patch => {
    expect(isConformant({ ...sample(), ...patch })).toBe(false);
  });
  it('une panne ne devient pas conforme parce qu’une revue humaine était attendue', () => {
    expect(isConformant({ ...sample(), statut: 'erreur', attendu: { route: 'revue_humaine' }, decision: { route: 'revue_humaine' } })).toBe(false);
  });
});

it('produit un tableau par cas et les agrégats exacts, sans modifier les journaux', async () => {
  await save('04', 'test', sample());
  await save('04', 'different', { ...sample(), fixture: 'different', decision: { route: 'revue_humaine' } });
  await save('15', 'normal', { ...sample(), caseId: '15', fixture: 'normal', attendu: { route: 'envoi_normal' }, decision: { route: 'envoi_normal' } });
  const before = await readFile(join(directory, '04/test.json'), 'utf8');
  const output = await generateReport(directory);
  const report = await readFile(output, 'utf8');
  expect(output).toBe(join(directory, 'rapport.md'));
  expect(report).toContain('## Cas 04');
  expect(report).toContain('## Cas 15');
  expect(report).toContain('choix=<code>tech</code>');
  expect(report).toContain('confiance=<code>0.9</code>');
  expect(report).toContain('noul=<code>0.1</code>');
  expect(report).toContain('123,5');
  expect(report).toContain('Coût total : **0,000003 USD**');
  expect(report).toContain('| 04 | 2 | 50 % (1/2) | 0,000002 |');
  expect(report).toContain('| 15 | 1 | 100 % (1/1) | 0,000001 |');
  expect(await readFile(join(directory, '04/test.json'), 'utf8')).toBe(before);
  await generateReport(directory);
  expect(await readFile(output, 'utf8')).toBe(report);
});
it('signale les coûts absents et garde les erreurs dans le dénominateur', async () => {
  await save('04', 'test', sample());
  await save('04', 'erreur', { ...sample(), fixture: 'erreur', statut: 'erreur', response: null });
  const report = await readFile(await generateReport(directory), 'utf8');
  expect(report).toContain('Coût total connu : **0,000001 USD**');
  expect(report).toContain('Total incomplet : 1 coût(s) indisponible(s).');
  expect(report).toContain('50 % (1/2)');
  expect(report).toContain('Indisponible');
});
it('inclut les fichiers malformés ou incohérents sans afficher leur contenu', async () => {
  await save('04', 'test', { ...sample(), caseId: '15' });
  await writeFile(join(directory, '04/corrompu.json'), 'contenu invalide à ne pas recopier');
  const report = await readFile(await generateReport(directory), 'utf8');
  expect(report).toContain('0 % (0/2)');
  expect(report).toContain('Non conforme (journal invalide ou illisible)');
  expect(report).not.toContain('contenu invalide à ne pas recopier');
});
it('produit un rapport vide si results/ est absent', async () => {
  const output = await generateReport(join(directory, 'results'));
  const report = await readFile(output, 'utf8');
  expect(report).toContain('Aucun résultat JSON disponible.');
  expect(report).toContain('Coût total : **0 USD**');
  expect(report).not.toContain('NaN');
});
it('distingue coût nul valide et coût négatif invalide', async () => {
  await save('04', 'zero', { ...sample(), fixture: 'zero', response: { ...sample().response, usage: { cost: 0 } } });
  await save('04', 'negatif', { ...sample(), fixture: 'negatif', response: { ...sample().response, usage: { cost: -1 } } });
  const report = await readFile(await generateReport(directory), 'utf8');
  expect(report).toContain('Total incomplet : 1 coût(s) indisponible(s).');
  expect(report).toContain('Coût total connu : **0 USD**');
});
it('échappe le HTML et les séparateurs de tableau', async () => {
  const data = { ...sample(), attendu: { route: '<script>|test</script>' } };
  await save('04', 'test', data);
  const report = await readFile(await generateReport(directory), 'utf8');
  expect(report).toContain('&lt;script&gt;&#124;test&lt;/script&gt;');
  expect(report).not.toContain('<script>');
});
