import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScheduleRule, ScheduleSource, Weekday } from '../../../shared/settings-schema';
import { DEFAULT_LOGO_CROP, LOGO_PRESETS } from '../../../shared/logo';
import { LogoSurface } from './logo-surface';
import { createInitialLogoUiState, type LogoUiState } from './logo-state';
import { LogoRuntime, type LogoRuntimeState } from './logo-runtime';
import { ExternalSettingsRuntime, type ExternalRuleState } from './external-settings-runtime';
import { createDurableStorage } from './durable-storage';
import { RendererSettingsRuntime, type RendererSettingsSnapshot } from './settings-runtime';
import { SettingsStore } from './settings-store';
import './settings-surface.css';

function id(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now().toString(36)}`;
}

function defaultRule(snapshot: RendererSettingsSnapshot): ScheduleRule {
  return {
    id: id('schedule'), label: '', enabled: false, priority: 0, startTime: '09:00', endTime: '17:00', weekdays: 'every-day', source: { kind: 'local' },
    assignments: [{ target: 'appearance.theme', value: snapshot.base.appearance.theme }],
  };
}

function sourceLabel(source: ScheduleSource): string {
  return source.kind === 'local' ? 'Local schedule' : source.kind === 'https-api' ? 'HTTPS API' : 'Home Assistant boolean';
}

function sourceFor(kind: string, existing: ScheduleSource): ScheduleSource {
  if (kind === 'https-api') return existing.kind === 'https-api' ? existing : { kind: 'https-api', endpoint: '', refreshMinutes: 15 };
  if (kind === 'home-assistant-boolean') return existing.kind === 'home-assistant-boolean' ? existing : { kind: 'home-assistant-boolean', baseUrl: '', entityId: '', vaultAccountKey: '', refreshMinutes: 15 };
  return { kind: 'local' };
}

function sourceValidationHint(source: ScheduleSource): string {
  if (source.kind === 'local') return 'No external request is made for a local rule.';
  if (source.kind === 'https-api') return 'HTTPS is required. Loopback HTTP is accepted only for development.';
  return 'The token is read from the OS vault by reference. No token is entered here.';
}

export function SettingsSurface() {
  const [snapshot, setSnapshot] = useState<RendererSettingsSnapshot | undefined>();
  const [logoState, setLogoState] = useState<LogoUiState>(createInitialLogoUiState);
  const [logoRuntimeState, setLogoRuntimeState] = useState<LogoRuntimeState | undefined>();
  const [externalStates, setExternalStates] = useState<ReadonlyArray<ExternalRuleState>>([]);
  const [busy, setBusy] = useState(false);
  const rulesRef = useRef<readonly ScheduleRule[]>([]);
  const durable = useMemo(() => createDurableStorage(window.dingDesktop), []);
  const settingsRuntime = useMemo(() => new RendererSettingsRuntime({ store: new SettingsStore(durable.storage), vocabularyStorage: durable.storage }), [durable]);
  const logoRuntime = useMemo(() => new LogoRuntime({ logo: window.dingDesktop?.logo, controlPlane: window.dingDesktop!.controlPlane }), []);
  const externalRuntime = useMemo(() => new ExternalSettingsRuntime({ controlPlane: window.dingDesktop!.controlPlane }), []);

  useEffect(() => {
    const unsubscribeSettings = settingsRuntime.subscribe(setSnapshot);
    const unsubscribeLogo = logoRuntime.subscribe((state) => {
      setLogoRuntimeState(state);
      setLogoState((previous) => ({
        ...previous,
        selectedPresetId: state.active.presetId,
        crop: state.active.crop,
        customLogoState: state.status === 'converting' ? 'reading' : state.status === 'failed' ? 'conversion-failed' : state.active.kind === 'custom-local' ? 'ready' : 'empty',
        customLogoLabel: state.detail,
      }));
    });
    void durable.bootstrap().then(() => {
      settingsRuntime.hydrate();
      void logoRuntime.load();
    });
    return () => {
      unsubscribeSettings();
      unsubscribeLogo();
      settingsRuntime.dispose();
    };
  }, [durable, externalRuntime, logoRuntime, settingsRuntime]);

  useEffect(() => {
    if (!snapshot?.hydrated) return undefined;
    let cancelled = false;
    const refreshAll = async () => {
      for (const rule of rulesRef.current) {
        if (cancelled || rule.source.kind === 'local') continue;
        const result = await externalRuntime.refresh(rule.id, rule.source, rule.assignments);
        if (cancelled) return;
        settingsRuntime.setScheduleSourceState(rule.id, result.active);
        setExternalStates(externalRuntime.all());
      }
    };
    void refreshAll();
    const timer = window.setInterval(() => { void refreshAll(); }, 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [externalRuntime, settingsRuntime, snapshot?.hydrated]);

  if (!snapshot) return <section className="settings-surface" aria-live="polite"><h2>Settings</h2><p>Reading validated local settings...</p></section>;

  const rules = snapshot.base.schedule.rules;
  rulesRef.current = rules;
  const updateRules = (next: readonly ScheduleRule[]) => {
    settingsRuntime.update((draft) => { draft.schedule.rules = structuredClone(next) as ScheduleRule[]; });
  };
  const chooseFile = async (file: File) => {
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const inspection = await logoRuntime.inspect(bytes, file.name, file.type || undefined);
      if (!inspection.ok) {
        setLogoState((previous) => ({ ...previous, customLogoState: 'invalid', customLogoLabel: inspection.reason }));
        return;
      }
      const format = inspection.inspection.format === 'svg' ? 'png' : inspection.inspection.format;
      const dimension = Math.min(512, inspection.inspection.width, inspection.inspection.height);
      const conversion = await logoRuntime.convertAndCache(bytes, logoState.crop, [{ format, width: Math.max(1, dimension), height: Math.max(1, dimension), alpha: format === 'jpeg' ? false : inspection.inspection.alpha }], logoState.selectedPresetId, file.name, file.type || undefined);
      setLogoRuntimeState(conversion);
    } finally {
      setBusy(false);
    }
  };

  const createRule = () => updateRules([...rules, defaultRule(snapshot)]);
  const patchRule = (ruleId: string, patch: Partial<ScheduleRule>) => updateRules(rules.map((rule) => rule.id === ruleId ? { ...rule, ...patch } : rule));
  const refreshExternal = async (rule: ScheduleRule) => {
    if (rule.source.kind === 'local') return;
    const result = await externalRuntime.refresh(rule.id, rule.source, rule.assignments, true);
    setExternalStates(externalRuntime.all());
    settingsRuntime.setScheduleSourceState(rule.id, result.active);
  };

  return (
    <section className="settings-surface" aria-labelledby="settings-surface-title">
      <header className="settings-surface-heading"><div><p className="settings-eyebrow">Application settings</p><h2 id="settings-surface-title">Appearance and schedules</h2><p>Values are hydrated from the local store. Temporary scheduled values never replace the saved base.</p></div><span role="status">{snapshot.hydrated ? 'Hydrated' : 'Reading'}</span></header>
      <LogoSurface
        state={logoState}
        onStateChange={(patch) => {
          if (patch.selectedPresetId) logoRuntime.selectPreset(patch.selectedPresetId);
          setLogoState((previous) => ({ ...previous, ...patch }));
        }}
        onChooseFile={(file) => { void chooseFile(file); }}
        onReset={() => { void logoRuntime.clear(); }}
        disabled={busy}
        conversionUnavailable
      />
      <section className="schedule-editor" aria-labelledby="schedule-editor-title">
        <div className="settings-surface-heading"><div><p className="settings-eyebrow">Scheduled settings</p><h3 id="schedule-editor-title">Rules</h3><p>Timezone: <code>{snapshot.base.schedule.timeZone}</code>. Higher priority wins, then later list position.</p></div><button type="button" onClick={createRule}>Create rule from current defaults</button></div>
        {rules.length === 0 ? <p className="settings-empty">No schedule rule exists. Create one from the current defaults to begin.</p> : rules.map((rule) => {
          const external = externalStates.find((state) => state.ruleId === rule.id);
          return <article className="schedule-rule" key={rule.id}>
            <div className="schedule-rule-heading"><input aria-label="Rule label" value={rule.label} placeholder="Name this rule" onChange={(event) => patchRule(rule.id, { label: event.currentTarget.value })} /><label><input type="checkbox" checked={rule.enabled} onChange={(event) => patchRule(rule.id, { enabled: event.currentTarget.checked })} /> Enabled</label><button type="button" onClick={() => updateRules(rules.filter((candidate) => candidate.id !== rule.id))}>Remove</button></div>
            <div className="schedule-fields"><label>Start date<input type="date" value={rule.startDate ?? ''} onChange={(event) => patchRule(rule.id, { startDate: event.currentTarget.value || undefined })} /></label><label>End date<input type="date" value={rule.endDate ?? ''} onChange={(event) => patchRule(rule.id, { endDate: event.currentTarget.value || undefined })} /></label><label>Start time<input type="time" value={rule.startTime} onChange={(event) => patchRule(rule.id, { startTime: event.currentTarget.value })} /></label><label>End time<input type="time" value={rule.endTime} onChange={(event) => patchRule(rule.id, { endTime: event.currentTarget.value })} /></label><label>Priority<input type="number" min="-1000" max="1000" value={rule.priority} onChange={(event) => patchRule(rule.id, { priority: Number(event.currentTarget.value) })} /></label></div>
            <label>Weekdays<select value={rule.weekdays === 'every-day' ? 'every-day' : rule.weekdays.join(',')} onChange={(event) => patchRule(rule.id, { weekdays: event.currentTarget.value === 'every-day' ? 'every-day' : event.currentTarget.value.split(',').map(Number) as Weekday[] })}><option value="every-day">Every day</option><option value="1,2,3,4,5">Monday to Friday</option><option value="0,6">Saturday and Sunday</option></select></label>
            <label>Source<select value={rule.source.kind} onChange={(event) => patchRule(rule.id, { source: sourceFor(event.currentTarget.value, rule.source) })}><option value="local">Local schedule</option><option value="https-api">HTTPS API</option><option value="home-assistant-boolean">Home Assistant boolean</option></select></label>
            {rule.source.kind === 'https-api' ? <div className="schedule-fields"><label>Endpoint<input type="url" value={rule.source.endpoint} onChange={(event) => patchRule(rule.id, { source: { ...rule.source, endpoint: event.currentTarget.value } })} /></label><label>Refresh minutes<input type="number" min="1" max="1440" value={rule.source.refreshMinutes} onChange={(event) => patchRule(rule.id, { source: { ...rule.source, refreshMinutes: Number(event.currentTarget.value) } })} /></label></div> : null}
            {rule.source.kind === 'home-assistant-boolean' ? <div className="schedule-fields"><label>Base URL<input type="url" value={rule.source.baseUrl} onChange={(event) => patchRule(rule.id, { source: { ...rule.source, baseUrl: event.currentTarget.value } })} /></label><label>Entity<input value={rule.source.entityId} placeholder="binary_sensor.example" onChange={(event) => patchRule(rule.id, { source: { ...rule.source, entityId: event.currentTarget.value } })} /></label><label>Vault reference<input value={rule.source.vaultAccountKey} onChange={(event) => patchRule(rule.id, { source: { ...rule.source, vaultAccountKey: event.currentTarget.value } })} /></label><label>Refresh minutes<input type="number" min="1" max="1440" value={rule.source.refreshMinutes} onChange={(event) => patchRule(rule.id, { source: { ...rule.source, refreshMinutes: Number(event.currentTarget.value) } })} /></label></div> : null}
            <p className="schedule-hint">{sourceValidationHint(rule.source)} {sourceLabel(rule.source)}</p>
            {rule.source.kind !== 'local' ? <div className="schedule-status" role="status"><button type="button" onClick={() => void refreshExternal(rule)}>Refresh source</button>{external ? <span>{external.status}: {external.active ? 'active' : 'inactive'}{external.isFallback ? ' (using fallback)' : ''}</span> : <span>No source reading yet.</span>}</div> : null}
          </article>;
        })}
      </section>
      <p className="settings-runtime-status" role="status">{logoRuntimeState?.detail ?? 'The shipped logo preset is active.'}</p>
    </section>
  );
}
