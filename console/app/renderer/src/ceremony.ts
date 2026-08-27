/**
 * Carries out the command a confirmation flow was guarding.
 *
 * Every destructive and write control in the interface funnels through one
 * confirmation flow, and that flow used to end by announcing the command had been
 * "executed and attested" while calling nothing at all. It was the single largest
 * untrue claim in the product, and it was untrue on every button that mattered.
 *
 * This runs the command and reports what actually happened. The three refusal paths —
 * nothing connected, no bridge, and the control plane declining — each say so by name.
 * A refusal shown plainly is worth far more than a cheerful message about work that
 * never happened, so none of them is softened into a success.
 */
export interface CeremonyResponse {
  ok: boolean;
  message?: string;
  data?: unknown;
}

export type NoticeSeverity = 'info' | 'warning' | 'error';

export interface CeremonyOptions {
  command: string;
  connected: boolean;
  request: (action: string, extra: Record<string, unknown>) => Promise<CeremonyResponse | undefined>;
  serverId: string;
  toast: (message: string, severity?: NoticeSeverity) => void;
  fire: (title: string, body: string, severity?: NoticeSeverity) => void;
  /** Output longer than this is trimmed for display; the command still ran in full. */
  maxOutput?: number;
}

export const NOT_RUN = 'Not run';

export async function runCeremonyCommand(options: CeremonyOptions): Promise<boolean> {
  const command = options.command.trim();
  const limit = options.maxOutput ?? 2000;

  if (command.length === 0) {
    options.fire(NOT_RUN, 'No command was attached to this confirmation, so nothing was run.', 'error');
    return false;
  }
  if (!options.connected) {
    options.fire(NOT_RUN, `No target is connected, so "${command}" was not run.`, 'warning');
    return false;
  }

  options.toast(`Running ${command}…`);
  const response = await options.request('pbx.command', {
    serverId: options.serverId,
    payload: { command },
  });

  if (!response) {
    options.fire(NOT_RUN, `The desktop bridge is unavailable, so "${command}" was not run.`, 'error');
    return false;
  }
  if (!response.ok) {
    options.fire(NOT_RUN, response.message ?? `"${command}" was not run.`, 'error');
    return false;
  }

  const output = String((response.data as { output?: string } | undefined)?.output ?? '').trim();
  options.fire(
    `${command} ran`,
    output.length > 0 ? output.slice(0, limit) : 'The target returned no output.',
  );
  return true;
}
