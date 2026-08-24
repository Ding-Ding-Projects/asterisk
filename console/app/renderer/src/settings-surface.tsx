import { useEffect, useMemo, useState } from 'react';
import type { ScheduleRule, ScheduleSource, Weekday } from '../../../shared/settings-schema';
import { LOGO_MAX_INPUT_BYTES } from '../../../shared/logo';
import { LogoSurface } from './logo-surface';
import { createInitialLogoUiState, type LogoUiState } from './logo-state';
import type { LogoRuntimeState } from './logo-runtime';
import type { ExternalRuleState } from './external-settings-runtime';
import { SuperConfirmation } from './super-confirmation';
import { getApplicationRuntime } from './application-runtime';
import type { RendererSettingsSnapshot } from './settings-runtime';
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
  const [vaultReferences, setVaultReferences] = useState<ReadonlyArray<string>>([]);
  const [newVaultReference, setNewVaultReference] = useState('');
  const [vaultToken, setVaultToken] = useState('');
  const [vaultStatus, setVaultStatus] = useState('');
  const [logoPersistStatus, setLogoPersistStatus] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const applicationRuntime = useMemo(() => getApplicationRuntime(), []);
  const durable = applicationRuntime.durable;
  const settingsRuntime = applicationRuntime.settings;
  const logoRuntime = applicationRuntime.logo;
  const externalRuntime = applicationRuntime.external;

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
    };
  }, [durable, externalRuntime, logoRuntime, settingsRuntime]);

  useEffect(() => {
    return externalRuntime.subscribe(setExternalStates);
  }, [externalRuntime]);

  useEffect(() => {
    void window.dingDesktop?.externalSettings.listVaultReferences().then(setVaultReferences);
  }, []);

  if (!snapshot) return <section className="settings-surface" aria-live="polite"><h2>Settings</h2><p>Reading validated local settings...</p></section>;

  const rules = snapshot.base.schedule.rules;
  const updateRules = (next: readonly ScheduleRule[]) => {
    settingsRuntime.update((draft) => { draft.schedule.rules = structuredClone(next) as ScheduleRule[]; });
  };
  const chooseFile = async (file: File) => {
    setBusy(true);
    try {
      if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > LOGO_MAX_INPUT_BYTES) {
        setLogoState((previous) => ({ ...previous, customLogoState: 'invalid', customLogoLabel: `The local image must be between 1 and ${LOGO_MAX_INPUT_BYTES} bytes.` }));
        return;
      }
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
  const enrollVaultReference = async () => {
    const result = await window.dingDesktop?.externalSettings.enrollVaultReference({ reference: newVaultReference, token: vaultToken });
    setVaultStatus(result?.ok ? 'Credential stored in the operating-system vault.' : result?.reason ?? 'Credential enrollment is unavailable.');
    if (result?.ok && result.reference) {
      setVaultReferences((current) => [...new Set([...current, result.reference!])].sort());
      setNewVaultReference('');
      setVaultToken('');
    }
  };
  const removeVaultReference = async (reference: string) => {
    if (rules.some((rule) => rule.source.kind === 'home-assistant-boolean' && rule.source.vaultAccountKey === reference)) {
      setVaultStatus('This reference is used by a schedule rule. Choose another reference first; removal was refused.');
      return;
    }
    setPendingRemoval(reference);
  };
  const confirmRemoveVaultReference = async (reference: string) => {
    const result = await window.dingDesktop?.externalSettings.removeVaultReference(reference);
    setVaultStatus(result?.ok ? 'Enrolled reference removed.' : result?.reason ?? 'The enrolled reference was not removed.');
    if (result?.ok) setVaultReferences((current) => current.filter((item) => item !== reference));
    return result ?? { ok: false, reason: 'The desktop vault bridge is unavailable.' };
  };

  return (
    <section className="settings-surface" aria-labelledby="settings-surface-title">
      <header className="settings-surface-heading"><div><p className="settings-eyebrow">Application settings</p><h2 id="settings-surface-title">Appearance and schedules</h2><p>Values are hydrated from the local store. Temporary scheduled values never replace the saved base.</p><label>Display name<input value={snapshot.base.displayName.value} onChange={(event) => { const value = event.currentTarget.value; settingsRuntime.update((draft) => { draft.displayName.value = value; }); }} /></label></div><span role="status">{snapshot.hydrated ? 'Hydrated' : 'Reading'}</span></header>
      <LogoSurface
        state={logoState}
        onStateChange={(patch) => {
          const priorActive = logoRuntime.getState().active;
          if (patch.selectedPresetId) logoRuntime.selectPreset(patch.selectedPresetId);
          setLogoState((previous) => {
            const next = { ...previous, ...patch };
            setLogoPersistStatus('Saving logo selection...');
            void logoRuntime.persistUiState({ selectedPresetId: next.selectedPresetId, crop: next.crop }).then((result) => {
              if (!result.ok) {
                setLogoState(previous);
                logoRuntime.restoreActiveLogo(priorActive);
                setLogoPersistStatus(`${result.reason ?? 'Logo selection was not saved.'} Previous selection restored.`);
              } else setLogoPersistStatus('Logo selection saved.');
            });
            return next;
          });
        }}
        onChooseFile={(file) => { void chooseFile(file); }}
        onReset={() => { void logoRuntime.clear(); }}
        disabled={busy}
        conversionUnavailable={logoRuntimeState?.decoderAvailable !== true}
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
            {rule.source.kind === 'home-assistant-boolean' ? <div className="schedule-fields"><label>Base URL<input type="url" value={rule.source.baseUrl} onChange={(event) => patchRule(rule.id, { source: { ...rule.source, baseUrl: event.currentTarget.value } })} /></label><label>Entity<input value={rule.source.entityId} placeholder="binary_sensor.example" onChange={(event) => patchRule(rule.id, { source: { ...rule.source, entityId: event.currentTarget.value } })} /></label><label>Stored credential<select value={rule.source.vaultAccountKey} onChange={(event) => patchRule(rule.id, { source: { ...rule.source, vaultAccountKey: event.currentTarget.value } })}><option value="">Choose an enrolled reference</option>{vaultReferences.map((reference) => <option key={reference} value={reference}>{reference}</option>)}</select></label><label>Refresh minutes<input type="number" min="1" max="1440" value={rule.source.refreshMinutes} onChange={(event) => patchRule(rule.id, { source: { ...rule.source, refreshMinutes: Number(event.currentTarget.value) } })} /></label></div> : null}
            <p className="schedule-hint">{sourceValidationHint(rule.source)} {sourceLabel(rule.source)}</p>
            {rule.source.kind !== 'local' ? <div className="schedule-status" role="status"><button type="button" onClick={() => void refreshExternal(rule)}>Refresh source</button>{external ? <span>{external.status}: {external.active ? 'active' : 'inactive'}{external.isFallback ? ' (using fallback)' : ''}</span> : <span>No source reading yet.</span>}</div> : null}
          </article>;
        })}
      </section>
      <section className="vault-enrollment" aria-labelledby="vault-enrollment-title"><h3 id="vault-enrollment-title">Home Assistant credential enrollment</h3><p>Choose an enrolled reference in a rule. The credential value is sent once to the desktop vault and is never placed in settings or renderer state.</p><div className="schedule-fields"><label>New reference<input value={newVaultReference} onChange={(event) => setNewVaultReference(event.currentTarget.value)} placeholder="home-assistant-main" /></label><label>Credential value<input type="password" value={vaultToken} onChange={(event) => setVaultToken(event.currentTarget.value)} /></label><button type="button" onClick={() => void enrollVaultReference()} disabled={!newVaultReference || !vaultToken}>Store in vault</button></div><div className="schedule-fields">{vaultReferences.map((reference) => <span key={reference}><code>{reference}</code><button type="button" onClick={() => void removeVaultReference(reference)}>Remove</button></span>)}</div><p role="status">{vaultStatus || `${vaultReferences.length} enrolled reference${vaultReferences.length === 1 ? '' : 's'}.`}</p></section>
      {pendingRemoval ? <SuperConfirmation action={`remove enrolled reference ${pendingRemoval}`} details="The reference will be removed from the desktop vault. Schedule rules must not reference it, and the prior mark or settings remain unchanged if removal is refused." onCancel={() => setPendingRemoval(undefined)} onConfirm={() => confirmRemoveVaultReference(pendingRemoval)} /> : null}
      <p className="settings-runtime-status" role="status">{logoRuntimeState?.detail ?? 'The shipped logo preset is active.'} {logoPersistStatus} {logoRuntimeState?.decoderAvailable !== true ? <button type="button" onClick={() => void logoRuntime.load()}>Retry local decoder</button> : null}</p>
    </section>
  );
}
