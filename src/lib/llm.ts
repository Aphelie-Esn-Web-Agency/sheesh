import { isRecord, postOpenRouter, type RequestOptions } from './jev.js';

export type Message = { role: 'system' | 'user' | 'assistant'; content: string };
/** Aucun modèle génératif par défaut : le choix appartient à l'utilisateur. */
export async function askLlm(messages: Message[], size: 'small' | 'large', options: RequestOptions = {}) {
  const variable = size === 'small' ? 'LLM_MODEL_SMALL' : 'LLM_MODEL_LARGE';
  const model = process.env[variable]?.trim();
  if (!model) throw new Error(`${variable} manquante.`);
  if (!messages.length) throw new Error('LLM : aucun message fourni.');
  const start = performance.now();
  const raw = await postOpenRouter('chat/completions', { model, messages, stream: false }, options);
  if (!isRecord(raw) || !Array.isArray(raw.choices)) throw new Error('LLM : réponse non conforme.');
  const first = raw.choices[0];
  if (!isRecord(first) || !isRecord(first.message) || typeof first.message.content !== 'string'
    || !first.message.content.trim() || typeof raw.model !== 'string') throw new Error('LLM : contenu absent.');
  return { content: first.message.content, model: raw.model, usage: raw.usage ?? null, latencyMs: performance.now() - start };
}
