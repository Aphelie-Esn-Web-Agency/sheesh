import 'dotenv/config';
import { setTimeout as delay } from 'node:timers/promises';

export type ChoiceQuestion = { type: 'choice'; instructions: string; criteria: Record<string, string> };
export type NoulQuestion = { type: 'noul'; instructions: string };
export type Questions = Record<string, ChoiceQuestion | NoulQuestion>;
export type ChoiceAnswer = { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number };
export type NoulAnswer = { type: 'noul'; noul: number };
export type Answers = Record<string, ChoiceAnswer | NoulAnswer>;
export type Usage = { input_tokens: number; output_tokens: number; cost: number };
export type JevResponse = { model: string; answers: Answers; usage: Usage; provider?: string; latencyMs: number; truncated: boolean };
export type RequestOptions = { timeoutMs?: number; retryDelayMs?: number };
// score est volontairement absent tant que son schéma n'est pas vérifié.
export const MAX_STATE_CHARACTERS = 29_999 * 4;
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const isProbability = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

export function validAnswers(value: unknown, questions: Questions): value is Answers {
  if (!isRecord(value)) return false;
  return Object.entries(questions).every(([key, question]) => {
    const answer = value[key];
    if (!isRecord(answer) || answer.type !== question.type) return false;
    if (question.type === 'noul') return isProbability(answer.noul);
    if (typeof answer.choice !== 'string' || !Object.hasOwn(question.criteria, answer.choice)
      || !isProbability(answer.confidence) || !isRecord(answer.probabilities)) return false;
    const probabilities = answer.probabilities;
    const categories = Object.keys(question.criteria);
    return Object.keys(probabilities).length === categories.length
      && categories.every(key => isProbability(probabilities[key]))
      && Math.abs(Object.values(probabilities).reduce<number>((sum, p) => sum + (p as number), 0) - 1) <= 0.01;
  });
}

/** Deux essais au maximum, uniquement en cas de 429 ou 5xx. Le timeout couvre aussi la lecture du corps. */
export async function postOpenRouter(endpoint: 'systemone' | 'chat/completions', body: unknown, options: RequestOptions = {}): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY manquante. Configurez votre fichier .env.');
  const timeoutMs = options.timeoutMs ?? 10_000;
  const retryDelayMs = options.retryDelayMs ?? 1_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
    throw new Error('Timeout ou délai de nouvelle tentative invalide.');
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let retry = false;
    try {
      const response = await fetch(`https://openrouter.ai/api/v1/${endpoint}`, {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (attempt === 0 && (response.status === 429 || response.status >= 500 && response.status <= 599)) retry = true;
        else throw new Error(`OpenRouter : HTTP ${response.status}.`);
      } else {
        try { return await response.json(); }
        catch { throw new Error('OpenRouter : réponse JSON illisible ou lecture interrompue.'); }
      }
    } catch (error) {
      if (controller.signal.aborted) throw new Error(`OpenRouter : délai de ${timeoutMs} ms dépassé.`);
      // Ne jamais recopier le corps d'erreur du fournisseur ni les en-têtes contenant la clé.
      if (error instanceof Error && error.message.startsWith('OpenRouter :')) throw error;
      throw new Error('OpenRouter : échec réseau.');
    } finally { clearTimeout(timer); }
    if (retry) await delay(retryDelayMs);
  }
  throw new Error('OpenRouter : requête interrompue après deux essais.');
}

export async function askJev(state: string, questions: Questions, options: RequestOptions = {}): Promise<JevResponse> {
  if (!Object.keys(questions).length) throw new Error('Jev : aucune question fournie.');
  for (const question of Object.values(questions)) {
    if (!['choice', 'noul'].includes(question.type) || !question.instructions.trim()
      || question.type === 'choice' && !Object.keys(question.criteria).length) throw new Error('Jev : question invalide.');
  }
  const model = process.env.JEV_MODEL?.trim() || 'jev-1.13';
  if (model !== 'jev-1.13') throw new Error('Ce dépôt utilise la version figée JEV_MODEL=jev-1.13.');
  const truncated = state.length > MAX_STATE_CHARACTERS;
  if (truncated) console.warn('Jev : contexte tronqué sous 30 000 tokens estimés (caractères / 4). Revue humaine requise.');
  const start = performance.now();
  const raw = await postOpenRouter('systemone', { model, state: state.slice(0, MAX_STATE_CHARACTERS), questions }, options);
  const latencyMs = performance.now() - start;
  if (!isRecord(raw) || typeof raw.model !== 'string' || !raw.model || !validAnswers(raw.answers, questions)
    || !isRecord(raw.usage) || !['input_tokens', 'output_tokens', 'cost'].every(key => {
      const value = (raw.usage as Record<string, unknown>)[key];
      return typeof value === 'number' && Number.isFinite(value) && value >= 0;
    }) || !Number.isInteger(raw.usage.input_tokens) || !Number.isInteger(raw.usage.output_tokens)) {
    throw new Error('Jev : réponse incomplète ou non conforme au schéma attendu.');
  }
  return {
    model: raw.model, answers: raw.answers, usage: raw.usage as Usage, latencyMs, truncated,
    ...(typeof raw.provider === 'string' ? { provider: raw.provider } : {}),
  };
}
