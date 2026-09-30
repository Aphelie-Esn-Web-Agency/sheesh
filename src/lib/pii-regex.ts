export type PiiKind = 'email' | 'iban' | 'carte' | 'telephone';
export type Redaction = { text: string; counts: Record<PiiKind, number>; found: boolean };

/** Détection indicative, pas une validation bancaire ni une garantie d'anonymisation exhaustive. */
export function redactPii(input: string): Redaction {
  const counts: Record<PiiKind, number> = { email: 0, iban: 0, carte: 0, telephone: 0 };
  let text = input;
  const patterns: [PiiKind, RegExp][] = [
    ['email', /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/gi],
    ['iban', /\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]){11,30}\b/gi],
    ['carte', /(?<!\w)(?:\d[ -]?){12,18}\d(?!\w)/g],
    ['telephone', /(?<!\w)(?:\+\d{1,3}[ .()-]?(?:\d[ .()-]?){6,13}\d|0[1-9](?:[ .-]?\d{2}){4})(?!\w)/g],
  ];
  for (const [kind, pattern] of patterns) {
    text = text.replace(pattern, () => { counts[kind]++; return `[MASQUE_${kind.toUpperCase()}]`; });
  }
  return { text, counts, found: Object.values(counts).some(count => count > 0) };
}
