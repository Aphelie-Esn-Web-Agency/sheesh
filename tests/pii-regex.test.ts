import { expect, it } from 'vitest';
import { redactPii } from '../src/lib/pii-regex.js';

it.each([
  ['contact@example.invalid', 'email'], ['06 00 00 00 00', 'telephone'], ['+33 6 00 00 00 00', 'telephone'],
  ['FR76 0000 0000 0000 0000 0000 000', 'iban'], ['4242 4242 4242 4242', 'carte'],
])('masque une donnée structurée fictive : %s', (value, kind) => {
  const result = redactPii(`Test : ${value}.`);
  expect(result.found).toBe(true);
  expect(result.counts).toMatchObject({ [kind]: 1 });
  expect(result.text).not.toContain(value);
  expect(result.text).toContain(`[MASQUE_${kind.toUpperCase()}]`);
});
it('préserve un texte ordinaire et reste idempotent', () => {
  const input = 'Je souhaite une collecte demain pour deux paires.';
  expect(redactPii(input)).toMatchObject({ text: input, found: false });
  const masked = redactPii('contact@example.invalid').text;
  expect(redactPii(masked)).toMatchObject({ text: masked, found: false });
});
