import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Ce module n'importe aucun client API et ne charge aucune variable d'environnement.
type RecordValue = Record<string, unknown>;
type Row = { fixture: string; data: RecordValue | null };
const record = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const amount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const format = (value: number): string => value.toLocaleString('fr-FR', { maximumSignificantDigits: 15 });
const rounded = (value: number): string => value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const cell = (value: unknown): string => {
  if (value === undefined || value === null) return 'Indisponible';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return `<code>${text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('|', '&#124;').replace(/[\r\n]+/g, ' ')}</code>`;
};

/** Compare les seuls champs attendus ; tableaux comparés exactement, sans tenir compte de leur ordre. */
function matches(expected: unknown, actual: unknown): boolean {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || expected.length !== actual.length) return false;
    const remaining = [...actual];
    return expected.every(item => {
      const index = remaining.findIndex(candidate => matches(item, candidate));
      if (index < 0) return false;
      remaining.splice(index, 1);
      return true;
    });
  }
  if (record(expected)) {
    return record(actual) && Object.entries(expected).every(([key, value]) =>
      Object.hasOwn(actual, key) && matches(value, actual[key]));
  }
  return expected === actual;
}

export function isConformant(value: unknown): boolean {
  if (!record(value) || value.statut !== 'termine' || value.error != null
    || !record(value.response) || value.response.truncated !== false
    || !record(value.response.answers) || !Object.keys(value.response.answers).length
    || !record(value.attendu) || typeof value.attendu.route !== 'string' || !value.attendu.route
    || !record(value.decision)) return false;
  // La note est un commentaire humain, pas un champ de la décision.
  const { note: _note, ...expected } = value.attendu;
  return matches(expected, value.decision);
}

function keyValues(response: RecordValue | null): string {
  if (!record(response?.answers)) return 'Indisponible';
  const parts = Object.entries(response.answers).sort(([a], [b]) => a.localeCompare(b)).map(([key, answer]) => {
    if (!record(answer)) return `${cell(key)} : invalide`;
    if (answer.type === 'noul') return `${cell(key)} : noul=${cell(answer.noul)}`;
    if (answer.type === 'choice') return `${cell(key)} : choix=${cell(answer.choice)}, confiance=${cell(answer.confidence)}, probabilités=${cell(answer.probabilities)}`;
    return `${cell(key)} : type inconnu`;
  });
  return parts.join('<br>') || 'Indisponible';
}

export async function generateReport(directory = resolve('results')): Promise<string> {
  const groups: { caseId: string; rows: Row[] }[] = [];
  // Créer le répertoire permet aussi de produire un rapport vide avant la première exécution.
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.filter(item => item.isDirectory() && /^\d{2}$/.test(item.name)).sort((a, b) => a.name.localeCompare(b.name))) {
    const rows: Row[] = [];
    const files = await readdir(resolve(directory, entry.name), { withFileTypes: true });
    for (const file of files.filter(item => item.isFile() && item.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name))) {
      const fixture = file.name.slice(0, -5);
      let data: RecordValue | null = null;
      try {
        const value: unknown = JSON.parse(await readFile(resolve(directory, entry.name, file.name), 'utf8'));
        if (record(value) && value.caseId === entry.name && value.fixture === fixture) data = value;
      } catch {
        // Conserver la ligne dans le dénominateur, sans recopier un contenu illisible.
      }
      rows.push({ fixture, data });
    }
    groups.push({ caseId: entry.name, rows });
  }

  const lines = [
    '# Rapport des résultats Jev', '',
    'Rapport local, sans appel réseau. Les valeurs proviennent exclusivement des journaux présents dans results/.', '',
    'Conformité : tous les champs de attendu doivent correspondre à la décision, sauf note (commentaire). Les listes doivent contenir les mêmes éléments, quel que soit leur ordre. Les champs supplémentaires de la décision sont ignorés. Une erreur, une réponse absente, un contexte tronqué ou un journal invalide est non conforme.', '',
    'Les taux portent uniquement sur les fichiers JSON présents, y compris les erreurs et fichiers invalides. Les fixtures sans journal ne sont pas évaluées. Les coûts absents sont inconnus, jamais assimilés à zéro.', '',
  ];
  const summaries: string[] = [];
  let total = 0;
  let missingCosts = 0;
  for (const { caseId, rows } of groups) {
    let conformant = 0;
    let caseCost = 0;
    let missing = 0;
    lines.push(`## Cas ${caseId}`, '', '| Fixture | Décision attendue | Décision obtenue | Valeurs Jev clés | Coût (usage.cost, USD) | Latence (ms) | Conformité |',
      '| --- | --- | --- | --- | --- | --- | --- |');
    for (const { fixture, data } of rows) {
      const response = record(data?.response) ? data.response : null;
      const cost = record(response?.usage) ? amount(response.usage.cost) : null;
      const latency = amount(response?.latencyMs);
      const valid = isConformant(data);
      if (valid) conformant++;
      if (cost === null) missing++; else caseCost += cost;
      const indicator = valid ? 'Conforme' : `Non conforme${data === null ? ' (journal invalide ou illisible)' : ''}`;
      lines.push(`| ${cell(fixture)} | ${cell(data?.attendu)} | ${cell(data?.decision)} | ${keyValues(response)} | ${cost === null ? 'Indisponible' : format(cost)} | ${latency === null ? 'Indisponible' : rounded(latency)} | ${indicator} |`);
    }
    if (!rows.length) lines.push('', 'Aucun résultat disponible pour ce cas.');
    lines.push('');
    const rate = rows.length ? `${rounded(conformant / rows.length * 100)} % (${conformant}/${rows.length})` : 'Non calculable (0 résultat)';
    summaries.push(`| ${caseId} | ${rows.length} | ${rate} | ${format(caseCost)}${missing ? ` (partiel, ${missing} coût(s) inconnu(s))` : ''} |`);
    total += caseCost;
    missingCosts += missing;
  }
  if (!groups.some(group => group.rows.length)) lines.push('Aucun résultat JSON disponible.', '');
  lines.push('## Bilan', '',
    missingCosts ? `Coût total connu : **${format(total)} USD**. Total incomplet : ${missingCosts} coût(s) indisponible(s).`
      : `Coût total : **${format(total)} USD**.`, '',
    '| Cas | Résultats | Taux de conformité | Coût connu (USD) |', '| --- | --- | --- | --- |', ...summaries, '');
  const output = resolve(directory, 'rapport.md');
  await writeFile(output, lines.join('\n'), { mode: 0o600 });
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(`Rapport généré : ${await generateReport()}`); }
  catch { console.error('Impossible de générer le rapport : vérifiez les droits du répertoire results/.'); process.exitCode = 1; }
}
