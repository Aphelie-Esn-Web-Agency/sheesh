import 'dotenv/config';

export type Action = { tool: 'asana' | 'slack' | 'github' | 'human' | 'outbound'; operation: string; payload: Record<string, unknown> };
export type ActionResult = Action & { simulated: true };

export function assertDryRun(): void {
  const value = process.env.DRY_RUN?.trim().toLowerCase() || 'true';
  if (value !== 'true') throw new Error('Seul DRY_RUN=true est disponible : aucun adaptateur réel n’est configuré.');
}

/** Les actions retournées sont enregistrées par le journal du cas, sans aucun appel réseau. */
export async function performActions(actions: Action[]): Promise<ActionResult[]> {
  assertDryRun();
  return actions.map(action => {
    const result: ActionResult = { ...action, simulated: true };
    console.log('[DRY_RUN]', JSON.stringify(result));
    return result;
  });
}
