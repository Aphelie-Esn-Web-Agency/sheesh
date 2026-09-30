import { describe, expect, it } from 'vitest';
import { decide as decide04, QUESTIONS as questions04 } from '../src/cases/04-demandes-internes.js';
import { decide as decide14, deterministicLabels, LABELS, QUESTIONS as questions14 } from '../src/cases/14-revue-pr.js';
import { decide as decide15, QUESTIONS as questions15 } from '../src/cases/15-donnees-personnelles.js';
import type { Answers, ChoiceAnswer, Questions } from '../src/lib/jev.js';

// Réponses SYNTHÉTIQUES pour tester le code métier. Ce ne sont pas des observations Jev.
function choice(question: 'equipe' | 'type_demande', selected: string, confidence = 0.9): ChoiceAnswer {
  const categories = Object.keys(questions04[question].criteria);
  return { type: 'choice', choice: selected, confidence,
    probabilities: Object.fromEntries(categories.map(key => [key, key === selected ? 1 : 0])) };
}
function routing(team = 'tech', type = 'bug', blocked = 0.1): Answers {
  return { equipe: choice('equipe', team), type_demande: choice('type_demande', type), bloquant: { type: 'noul', noul: blocked } };
}
function binary(questions: Questions, value = 0.1): Answers {
  return Object.fromEntries(Object.keys(questions).map(key => [key, { type: 'noul', noul: value }]));
}

describe('04 : demandes internes', () => {
  it.each(['tech', 'produit', 'ops', 'rh', 'finance'])('propose une affectation corrigeable à %s', team => {
    expect(decide04(routing(team))).toMatchObject({ route: 'affectation_proposee', equipe: team, corrigeable: true, prioritaire: false });
  });
  it.each(['bug', 'evolution', 'question', 'acces_outil'])('conserve le type %s', type => {
    expect(decide04(routing('tech', type))).toMatchObject({ type });
  });
  it.each([[0.2, false], [0.8, true], [1, true]] as const)('traite la borne %s', (value, prioritaire) => {
    expect(decide04(routing('tech', 'bug', value))).toMatchObject({ route: 'affectation_proposee', prioritaire });
  });
  it('fait relire un blocage incertain', () => expect(decide04(routing('tech', 'bug', 0.5))).toMatchObject({ route: 'revue_humaine' }));
  it.each(['equipe', 'type_demande'] as const)('fait relire une faible confiance pour %s', key => {
    const answers = routing(); (answers[key] as ChoiceAnswer).confidence = 0.79;
    expect(decide04(answers)).toMatchObject({ route: 'revue_humaine' });
  });
  it('accepte exactement le seuil de confiance', () => {
    const answers = routing(); (answers.equipe as ChoiceAnswer).confidence = 0.8;
    expect(decide04(answers)).toMatchObject({ route: 'affectation_proposee' });
  });
  it('refuse une catégorie inconnue', () => {
    const answers = routing(); (answers.equipe as ChoiceAnswer).choice = 'support-client';
    expect(decide04(answers)).toMatchObject({ route: 'revue_humaine' });
  });
});

describe('14 : PR sensibles', () => {
  it.each(Object.entries(LABELS))('escalade le signal %s', (key, label) => {
    const answers = binary(questions14); answers[key] = { type: 'noul', noul: 0.8 };
    expect(decide14(answers)).toMatchObject({ route: 'revue_senior', labels: [label], approuvee: false });
  });
  it('ne valide jamais une PR même sans signal', () => {
    expect(decide14(binary(questions14, 0.2))).toMatchObject({ route: 'revue_standard', approuvee: false });
  });
  it('escalade une ambiguïté sans inventer de label sensible', () => {
    expect(decide14(binary(questions14, 0.5))).toMatchObject({ route: 'revue_senior', labels: [], incertain: true });
  });
  it('ne retire pas les labels déterministes en cas de réponse négative ou invalide', () => {
    for (const answers of [binary(questions14, 0), {}]) {
      expect(decide14(answers, ['sensible:auth', 'sensible:auth'])).toMatchObject({ labels: ['sensible:auth'] });
      expect(decide14(answers, ['sensible:auth']).route).not.toBe('revue_standard');
    }
  });
  it('applique les chemins et les propriétaires CODEOWNERS résolus', () => {
    expect(deterministicLabels(['src/auth/session.ts', 'src/billing/total.ts', 'src/profiles/export.ts', 'db/migrations/001.sql', '.github/workflows/check.yml'], ['@securite']))
      .toEqual(['revue:codeowners', 'sensible:auth', 'sensible:donnees', 'sensible:infra', 'sensible:migration', 'sensible:paiement']);
  });
  it('laisse Jev détecter une PR sensible cachée dans un utilitaire', () => {
    expect(deterministicLabels(['src/utils/format.ts'])).toEqual([]);
    const answers = binary(questions14); answers.touche_paiement = { type: 'noul', noul: 0.9 };
    expect(decide14(answers).route).toBe('revue_senior');
  });
});

describe('15 : données personnelles', () => {
  it.each(Object.keys(questions15))('bloque le signal %s', key => {
    const answers = binary(questions15); answers[key] = { type: 'noul', noul: 0.8 };
    expect(decide15(answers)).toEqual({ route: 'blocage', motifs: [key] });
  });
  it('ne normalise pas les noul indépendants', () => {
    expect(decide15(binary(questions15, 1))).toMatchObject({ route: 'blocage', motifs: Object.keys(questions15) });
  });
  it('autorise le texte sans signal au seuil bas', () => expect(decide15(binary(questions15, 0.2))).toEqual({ route: 'envoi_normal' }));
  it('exige le masquage des données structurées', () => expect(decide15(binary(questions15), true)).toEqual({ route: 'anonymisation' }));
  it('fait relire un signal incertain même après masquage', () => expect(decide15(binary(questions15, 0.5), true)).toMatchObject({ route: 'revue_humaine' }));
  it('le blocage sémantique prime sur le masquage', () => expect(decide15(binary(questions15, 0.9), true).route).toBe('blocage'));
});

for (const [name, decide, questions] of [['04', decide04, questions04], ['14', decide14, questions14], ['15', decide15, questions15]] as const) {
  describe(`${name} : entrées malformées et pureté`, () => {
    it.each([null, undefined, {}, [], { anything: 1 }])('route une réponse invalide vers un humain (%j)', value => {
      expect(decide(value).route).toBe('revue_humaine');
    });
    it.each([-0.1, 1.1, NaN, Infinity, '0.9'])('refuse une probabilité invalide (%s)', value => {
      const answers = name === '04' ? routing() : binary(questions);
      const key = name === '04' ? 'bloquant' : Object.keys(questions)[0]!;
      expect(decide({ ...answers, [key]: { type: 'noul', noul: value } }).route).toBe('revue_humaine');
    });
    it('reste déterministe sans muter les réponses', () => {
      const answers = name === '04' ? routing() : binary(questions);
      const copy = structuredClone(answers);
      for (const answer of Object.values(answers)) Object.freeze(answer);
      Object.freeze(answers);
      expect(decide(answers)).toEqual(decide(answers));
      expect(answers).toEqual(copy);
    });
  });
}
