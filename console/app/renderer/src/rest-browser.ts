/**
 * Turns the REST resource browser's five independent readings -- live channels,
 * bridges, registered dialplan applications, and what ARI itself reports as its own
 * registered Stasis applications and configured users -- into the one combined table
 * the screen renders. Read-only: nothing here resolves a row back to an editable
 * object, because nothing on this screen writes anything.
 *
 * Reads through `valueOf`/`ViewReadings` from `readings.ts` rather than the raw
 * control-plane reading types directly: `this.readings[screen]` on the renderer side is
 * always a `ViewReadings`, and importing the control-plane's own `Channel`/`Reading`
 * types here would create a second, structurally different `Channel` next to
 * `readings.ts`'s own -- exactly the kind of drift `readings.ts`'s local shapes exist
 * to avoid.
 */
import { valueOf, type ViewReadings } from './readings';

/** One row per live resource, grouped by kind in the order the screen reads them:
 *  channels, bridges, registered applications, ARI apps, ARI users. Never throws:
 *  `readings === undefined` (nothing read yet) is zero rows, matching every other
 *  table-building helper in this console. */
export function restBrowserRows(readings: ViewReadings | undefined): string[][] {
  if (!readings) return [];
  const rows: string[][] = [];

  for (const channel of valueOf(readings.channels) ?? []) {
    rows.push([
      'Channel',
      channel.name,
      `${channel.application || 'no application'} · ${channel.context}/${channel.extension} · ${channel.callerNumber || 'no caller id'}`,
      channel.state,
    ]);
  }
  for (const bridge of valueOf(readings.bridges) ?? []) {
    rows.push([
      'Bridge',
      bridge.name || bridge.id,
      `${bridge.channels} channel${bridge.channels === 1 ? '' : 's'} · ${bridge.technology || 'unknown technology'}`,
      bridge.bridgeType || 'unknown type',
    ]);
  }
  for (const app of valueOf(readings.applications) ?? []) {
    rows.push(['Application', app.name, app.synopsis || 'no synopsis', 'Registered']);
  }
  for (const app of valueOf(readings.ariApps) ?? []) {
    rows.push(['ARI app', app.name, 'Registered Stasis application', 'Registered']);
  }
  for (const user of valueOf(readings.ariUsers) ?? []) {
    rows.push([
      'ARI user',
      user.username,
      user.readOnly ? 'Read-only' : 'Read/write',
      user.hasAcl ? 'ACL configured' : 'No ACL',
    ]);
  }

  return rows;
}
