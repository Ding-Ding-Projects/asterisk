import React, { useEffect, useMemo, useState } from 'react';
import type { ControlPlaneResponse } from '../../../shared/control-plane';
import type { ConfigValue } from './configuration';
import {
  PBX_FEATURES,
  addEntry,
  addSection,
  featureGroups,
  missingConfigResources,
  removeEntry,
  removeSection,
  updateEntry,
  updateSectionName,
  validateConfigValue,
  type PbxFeatureDefinition,
  type PbxFeatureGroup,
} from './pbx-admin-model';
import './pbx-admin-workspace.css';

type WorkspaceMode = 'config' | 'media' | 'history';
type Notice = { kind: 'info' | 'success' | 'error'; text: string };
type MediaRoot = 'prompts' | 'musicOnHold';

type MediaFile = { name: string; path: string; extension: string; bytes: number };
type HistoryEntry = { resource: string; handle: string; takenAt?: string; bytes: number };
type PlanView = {
  summary?: string;
  diffs?: Array<{ resource?: string; changedPaths?: string[] }>;
  actions?: Array<{ description?: string }>;
};

function responseMessage(response: ControlPlaneResponse | undefined, fallback: string): string {
  if (!response) return 'The desktop control plane did not answer.';
  return response.ok ? fallback : response.message;
}

function bytesLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function basename(resource: string): string {
  return resource.slice(resource.lastIndexOf('/') + 1);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('The selected file could not be encoded.'));
      else resolve(result.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('The selected file could not be read.'));
    reader.readAsDataURL(file);
  });
}

function initialMode(feature: PbxFeatureDefinition): WorkspaceMode {
  if (feature.resources.length > 0) return 'config';
  if (feature.tools?.includes('media')) return 'media';
  if (feature.tools?.includes('history')) return 'history';
  return 'config';
}

/**
 * A FreePBX-style task catalogue layered onto the existing Ding PBX Console rather than
 * replacing it. The generated design remains the primary shell; this workspace is an
 * additive, structured editor for the Asterisk capability surface the control plane
 * already allowlists.
 *
 * Nothing here executes a shell command or accepts an arbitrary target path. Reads go
 * through `pbx.config`; preview goes through `pbx.plan`; writes go through `pbx.apply`,
 * which performs backup -> stage -> validate -> apply -> post-read -> compare and rolls
 * back on mismatch. Recovery and media use their existing bounded actions as well.
 */
export function PbxAdminWorkspace() {
  const groups = useMemo(() => featureGroups(), []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<PbxFeatureGroup>('Applications');
  const [featureId, setFeatureId] = useState(PBX_FEATURES[0]?.id ?? '');
  const feature = PBX_FEATURES.find((candidate) => candidate.id === featureId) ?? PBX_FEATURES[0]!;
  const [mode, setMode] = useState<WorkspaceMode>(() => initialMode(feature));

  const [targets, setTargets] = useState<string[]>([]);
  const [targetId, setTargetId] = useState('');
  const [targetReason, setTargetReason] = useState('Open the workspace to discover local PBX targets.');

  const [resource, setResource] = useState(feature.resources[0] ?? '');
  const [config, setConfig] = useState<ConfigValue>();
  const [loadedConfig, setLoadedConfig] = useState<ConfigValue>();
  const [plan, setPlan] = useState<PlanView>();
  const [confirmApply, setConfirmApply] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pendingRestore, setPendingRestore] = useState<HistoryEntry>();
  const [mediaRoot, setMediaRoot] = useState<MediaRoot>('prompts');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [pendingRemove, setPendingRemove] = useState<MediaFile>();

  const [working, setWorking] = useState('');
  const [notice, setNotice] = useState<Notice>({ kind: 'info', text: 'No operation has run yet.' });

  const request = async (action: string, extra: Record<string, unknown> = {}): Promise<ControlPlaneResponse | undefined> => {
    const bridge = window.dingDesktop;
    if (!bridge) return undefined;
    return bridge.controlPlane.request({ requestId: crypto.randomUUID(), action, ...extra } as never);
  };

  const discoverTargets = async () => {
    setWorking('Discovering PBX targets…');
    const response = await request('server.list');
    setWorking('');
    if (!response?.ok) {
      setTargets([]);
      setTargetId('');
      setTargetReason(responseMessage(response, 'No PBX target was discovered.'));
      setNotice({ kind: 'error', text: responseMessage(response, 'Target discovery failed.') });
      return;
    }
    const data = response.data as { wsl?: string[] | { unavailable?: string } };
    const found = Array.isArray(data.wsl) ? data.wsl.filter((name) => typeof name === 'string' && name.trim().length > 0) : [];
    setTargets(found);
    if (found.length === 0) {
      const reason = Array.isArray(data.wsl) ? 'No local WSL PBX target is currently discoverable.' : data.wsl?.unavailable ?? 'No local PBX target is currently discoverable.';
      setTargetId('');
      setTargetReason(reason);
      setNotice({ kind: 'info', text: reason });
      return;
    }
    setTargetId((current) => (current && found.includes(current) ? current : found[0]!));
    setTargetReason(`${found.length} local PBX target${found.length === 1 ? '' : 's'} discovered.`);
    setNotice({ kind: 'success', text: `${found.length} local PBX target${found.length === 1 ? '' : 's'} discovered.` });
  };

  useEffect(() => {
    if (open) void discoverTargets();
  }, [open]);

  const chooseFeature = (next: PbxFeatureDefinition) => {
    setFeatureId(next.id);
    setGroup(next.group);
    setMode(initialMode(next));
    setResource(next.resources[0] ?? '');
    setConfig(undefined);
    setLoadedConfig(undefined);
    setPlan(undefined);
    setConfirmApply(false);
    setPendingRestore(undefined);
    setPendingRemove(undefined);
    setNotice({ kind: 'info', text: `${next.label} selected. Nothing has been changed.` });
  };

  const loadConfig = async (nextResource = resource) => {
    if (!targetId) {
      setNotice({ kind: 'error', text: 'Select a discovered PBX target before reading configuration.' });
      return;
    }
    if (!nextResource) {
      setNotice({ kind: 'error', text: 'This feature has no configuration resource to read.' });
      return;
    }
    setWorking(`Reading ${basename(nextResource)}…`);
    const response = await request('pbx.config', { serverId: targetId, payload: { resource: nextResource } });
    setWorking('');
    if (!response?.ok) {
      setConfig(undefined);
      setLoadedConfig(undefined);
      setPlan(undefined);
      setNotice({ kind: 'error', text: responseMessage(response, `${basename(nextResource)} could not be read.`) });
      return;
    }
    const value = (response.data as { value?: ConfigValue }).value ?? [];
    setConfig(value);
    setLoadedConfig(value);
    setPlan(undefined);
    setConfirmApply(false);
    setNotice({ kind: 'success', text: `${nextResource} was read from ${targetId}.` });
  };

  useEffect(() => {
    if (open && mode === 'config' && targetId && resource) void loadConfig(resource);
  }, [open, mode, targetId, resource]);

  const invalidatePlan = (next: ConfigValue) => {
    setConfig(next);
    setPlan(undefined);
    setConfirmApply(false);
  };

  const issues = useMemo(() => (config ? validateConfigValue(config) : []), [config]);
  const dirty = config !== undefined && loadedConfig !== undefined && JSON.stringify(config) !== JSON.stringify(loadedConfig);

  const preview = async () => {
    if (!targetId || !resource || config === undefined) {
      setNotice({ kind: 'error', text: 'Read a configuration resource before previewing a change.' });
      return;
    }
    if (issues.length > 0) {
      setNotice({ kind: 'error', text: `Fix ${issues.length} structured-editor validation issue${issues.length === 1 ? '' : 's'} before previewing.` });
      return;
    }
    setWorking('Building a live change plan…');
    const response = await request('pbx.plan', {
      serverId: targetId,
      payload: { documents: [{ resource, value: config }] },
    });
    setWorking('');
    if (!response?.ok) {
      setPlan(undefined);
      setNotice({ kind: 'error', text: responseMessage(response, 'The change plan could not be built.') });
      return;
    }
    const next = (response.data as { plan?: PlanView }).plan ?? {};
    setPlan(next);
    setConfirmApply(false);
    const count = next.diffs?.length ?? 0;
    setNotice({ kind: count === 0 ? 'info' : 'success', text: count === 0 ? 'The target already matches this editor state; nothing would change.' : `Preview ready: ${count} configuration resource${count === 1 ? '' : 's'} would change.` });
  };

  const apply = async () => {
    if (!targetId || !resource || config === undefined || !plan) return;
    if ((plan.diffs?.length ?? 0) === 0) {
      setNotice({ kind: 'info', text: 'There is no configuration difference to apply.' });
      return;
    }
    setWorking(`Applying ${basename(resource)} through the transactional control plane…`);
    const response = await request('pbx.apply', {
      serverId: targetId,
      payload: { documents: [{ resource, value: config }] },
    });
    setWorking('');
    setConfirmApply(false);
    if (!response?.ok) {
      setNotice({ kind: 'error', text: responseMessage(response, 'The configuration was not applied.') });
      return;
    }
    const result = (response.data as { result?: { status?: string; message?: string } }).result;
    if (result?.status !== 'applied') {
      setNotice({ kind: 'error', text: result?.message ?? `The transaction ended with status ${result?.status ?? 'unknown'}.` });
      return;
    }
    setNotice({ kind: 'success', text: result.message ?? `${resource} was applied and verified by a post-read.` });
    await loadConfig(resource);
    await loadHistory();
  };

  const loadHistory = async () => {
    if (!targetId) {
      setNotice({ kind: 'error', text: 'Select a PBX target before reading recovery points.' });
      return;
    }
    setWorking('Reading configuration recovery points…');
    const payload = resource ? { resource } : {};
    const response = await request('history.list', { serverId: targetId, payload });
    setWorking('');
    if (!response?.ok) {
      setHistory([]);
      setNotice({ kind: 'error', text: responseMessage(response, 'Recovery points could not be read.') });
      return;
    }
    const entries = (response.data as { entries?: HistoryEntry[] }).entries ?? [];
    setHistory(entries);
    setNotice({ kind: 'success', text: `${entries.length} recovery point${entries.length === 1 ? '' : 's'} read${resource ? ` for ${basename(resource)}` : ''}.` });
  };

  useEffect(() => {
    if (open && mode === 'history' && targetId) void loadHistory();
  }, [open, mode, targetId, resource]);

  const restore = async (entry: HistoryEntry) => {
    if (!targetId) return;
    setWorking(`Restoring ${basename(entry.resource)}…`);
    const response = await request('history.restore', { serverId: targetId, payload: { handle: entry.handle } });
    setWorking('');
    setPendingRestore(undefined);
    if (!response?.ok) {
      setNotice({ kind: 'error', text: responseMessage(response, 'The recovery point was not restored.') });
      return;
    }
    const restored = response.data as { ok?: boolean; detail?: string };
    setNotice({ kind: restored.ok ? 'success' : 'error', text: restored.detail ?? 'The restore operation returned without a detail.' });
    await loadHistory();
    if (resource === entry.resource) await loadConfig(resource);
  };

  const loadMedia = async (root = mediaRoot) => {
    if (!targetId) {
      setNotice({ kind: 'error', text: 'Select a PBX target before reading media.' });
      return;
    }
    setWorking(`Reading ${root === 'prompts' ? 'prompt' : 'music-on-hold'} files…`);
    const response = await request('media.list', { serverId: targetId, payload: { root } });
    setWorking('');
    if (!response?.ok) {
      setMedia([]);
      setNotice({ kind: 'error', text: responseMessage(response, 'Media files could not be read.') });
      return;
    }
    const files = (response.data as { files?: MediaFile[] }).files ?? [];
    setMedia(files);
    setNotice({ kind: 'success', text: `${files.length} ${root === 'prompts' ? 'prompt' : 'music-on-hold'} file${files.length === 1 ? '' : 's'} read from the target.` });
  };

  useEffect(() => {
    if (open && mode === 'media' && targetId) void loadMedia(mediaRoot);
  }, [open, mode, targetId, mediaRoot]);

  const uploadMedia = async (file: File) => {
    if (!targetId) return;
    try {
      setWorking(`Reading ${file.name}…`);
      const contentBase64 = await fileToBase64(file);
      setWorking(`Uploading ${file.name}…`);
      const response = await request('media.upload', {
        serverId: targetId,
        payload: { root: mediaRoot, name: file.name, contentBase64 },
      });
      setWorking('');
      if (!response?.ok) {
        setNotice({ kind: 'error', text: responseMessage(response, `${file.name} was not uploaded.`) });
        return;
      }
      const landed = response.data as MediaFile;
      setNotice({ kind: 'success', text: `${landed.name} landed on the target as ${bytesLabel(landed.bytes)}.` });
      await loadMedia(mediaRoot);
    } catch (error) {
      setWorking('');
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'The media file could not be prepared for upload.' });
    }
  };

  const removeMediaFile = async (file: MediaFile) => {
    if (!targetId) return;
    setWorking(`Removing ${file.name}…`);
    const response = await request('media.remove', { serverId: targetId, payload: { root: mediaRoot, name: file.name } });
    setWorking('');
    setPendingRemove(undefined);
    if (!response?.ok) {
      setNotice({ kind: 'error', text: responseMessage(response, `${file.name} was not removed.`) });
      return;
    }
    const outcome = response.data as { removed?: boolean; detail?: string };
    setNotice({ kind: outcome.removed ? 'success' : 'error', text: outcome.detail ?? `${file.name} removal returned without a detail.` });
    await loadMedia(mediaRoot);
  };

  const availableFeatures = PBX_FEATURES.filter((candidate) => {
    const matchesGroup = candidate.group === group;
    const needle = query.trim().toLowerCase();
    const matchesQuery = needle.length === 0 || `${candidate.label} ${candidate.description} ${candidate.resources.join(' ')}`.toLowerCase().includes(needle);
    return matchesGroup && matchesQuery;
  });

  const missing = missingConfigResources();

  return (
    <>
      <button className="pbx-admin-fab" type="button" onClick={() => setOpen(true)} aria-label="Open Advanced PBX administration">
        <span className="msym" aria-hidden="true">tune</span>
        <span>Advanced PBX</span>
      </button>

      {open ? (
        <div className="pbx-admin-backdrop" role="presentation">
          <section className="pbx-admin-dialog" role="dialog" aria-modal="true" aria-label="Advanced PBX administration">
            <header className="pbx-admin-header">
              <div>
                <div className="pbx-admin-eyebrow">Ding PBX Console · additive administration workspace</div>
                <h1>Advanced PBX</h1>
                <p>FreePBX-style task coverage, wired to this console’s bounded Asterisk control plane.</p>
              </div>
              <button className="pbx-admin-icon" type="button" onClick={() => setOpen(false)} aria-label="Close Advanced PBX">
                <span className="msym" aria-hidden="true">close</span>
              </button>
            </header>

            <div className={`pbx-admin-notice pbx-admin-notice-${notice.kind}`} role="status" aria-live="polite">
              <span>{working || notice.text}</span>
              <span className="pbx-admin-coverage">{missing.length === 0 ? '41/41 writable Asterisk resources covered' : `${missing.length} allowlisted resources missing from catalogue`}</span>
            </div>

            <div className="pbx-admin-targetbar">
              <label>
                <span>Target</span>
                <select value={targetId} onChange={(event) => setTargetId(event.target.value)} disabled={targets.length === 0}>
                  {targets.length === 0 ? <option value="">No target discovered</option> : null}
                  {targets.map((target) => <option key={target} value={target}>{target}</option>)}
                </select>
              </label>
              <button type="button" className="pbx-admin-button secondary" onClick={() => void discoverTargets()} disabled={working.length > 0}>Discover again</button>
              <span className="pbx-admin-target-reason">{targetReason}</span>
            </div>

            <div className="pbx-admin-layout">
              <aside className="pbx-admin-nav" aria-label="PBX feature catalogue">
                <label className="pbx-admin-search">
                  <span className="msym" aria-hidden="true">search</span>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search features or config files" aria-label="Search PBX features" />
                </label>
                <div className="pbx-admin-groups" role="tablist" aria-label="Feature groups">
                  {groups.map((candidate) => (
                    <button key={candidate} type="button" role="tab" aria-selected={group === candidate} className={group === candidate ? 'active' : ''} onClick={() => setGroup(candidate)}>
                      {candidate}
                    </button>
                  ))}
                </div>
                <div className="pbx-admin-features">
                  {availableFeatures.map((candidate) => (
                    <button key={candidate.id} type="button" className={feature.id === candidate.id ? 'active' : ''} onClick={() => chooseFeature(candidate)}>
                      <strong>{candidate.label}</strong>
                      <span>{candidate.description}</span>
                    </button>
                  ))}
                  {availableFeatures.length === 0 ? <div className="pbx-admin-empty">No feature in this group matches that search.</div> : null}
                </div>
              </aside>

              <main className="pbx-admin-main">
                <div className="pbx-admin-feature-head">
                  <div>
                    <div className="pbx-admin-eyebrow">{feature.group}</div>
                    <h2>{feature.label}</h2>
                    <p>{feature.description}</p>
                  </div>
                  <div className="pbx-admin-mode-tabs" role="tablist" aria-label="Advanced PBX tools">
                    <button type="button" role="tab" aria-selected={mode === 'config'} className={mode === 'config' ? 'active' : ''} disabled={feature.resources.length === 0} onClick={() => setMode('config')}>Configuration</button>
                    <button type="button" role="tab" aria-selected={mode === 'media'} className={mode === 'media' ? 'active' : ''} onClick={() => setMode('media')}>Media</button>
                    <button type="button" role="tab" aria-selected={mode === 'history'} className={mode === 'history' ? 'active' : ''} onClick={() => setMode('history')}>Recovery</button>
                  </div>
                </div>

                {mode === 'config' ? (
                  <div className="pbx-admin-pane">
                    <div className="pbx-admin-toolbar">
                      <label className="pbx-admin-grow">
                        <span>Configuration resource</span>
                        <select value={resource} onChange={(event) => setResource(event.target.value)} disabled={feature.resources.length === 0}>
                          {feature.resources.map((item) => <option key={item} value={item}>{basename(item)}</option>)}
                        </select>
                      </label>
                      <button type="button" className="pbx-admin-button secondary" onClick={() => void loadConfig()} disabled={!targetId || !resource || working.length > 0}>Read target</button>
                      <button type="button" className="pbx-admin-button secondary" onClick={() => void preview()} disabled={!dirty || issues.length > 0 || working.length > 0}>Preview</button>
                      <button type="button" className="pbx-admin-button primary" onClick={() => setConfirmApply(true)} disabled={!plan || (plan.diffs?.length ?? 0) === 0 || working.length > 0}>Apply</button>
                    </div>

                    {issues.length > 0 ? (
                      <div className="pbx-admin-validation" role="alert">
                        <strong>Structured editor validation</strong>
                        <ul>{issues.map((issue, index) => <li key={`${issue.section}-${issue.entry ?? 'section'}-${index}`}>{issue.message}</li>)}</ul>
                      </div>
                    ) : null}

                    {plan ? (
                      <div className="pbx-admin-plan">
                        <strong>{plan.summary ?? 'Change preview'}</strong>
                        {(plan.diffs?.length ?? 0) === 0 ? <span>No differences.</span> : (
                          <ul>
                            {(plan.diffs ?? []).map((diff, index) => (
                              <li key={`${diff.resource ?? 'resource'}-${index}`}>
                                <span>{diff.resource ?? resource}</span>
                                <small>{(diff.changedPaths ?? []).slice(0, 12).join(', ') || 'Structured content changed'}{(diff.changedPaths?.length ?? 0) > 12 ? '…' : ''}</small>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}

                    {confirmApply ? (
                      <div className="pbx-admin-confirm" role="alertdialog" aria-label="Confirm configuration apply">
                        <div>
                          <strong>Apply this live configuration change?</strong>
                          <span>The control plane will take a recovery point, stage the file, validate the staged round trip, apply it, then read it back. A mismatch triggers rollback.</span>
                        </div>
                        <button type="button" className="pbx-admin-button secondary" onClick={() => setConfirmApply(false)}>Cancel</button>
                        <button type="button" className="pbx-admin-button danger" onClick={() => void apply()}>Apply & verify</button>
                      </div>
                    ) : null}

                    {config === undefined ? (
                      <div className="pbx-admin-empty large">Select a target and read a configuration resource. No shipped or sample values are shown here.</div>
                    ) : (
                      <div className="pbx-admin-editor" aria-label={`${basename(resource)} structured configuration editor`}>
                        {config.map((section, sectionIndex) => (
                          <section className="pbx-admin-section" key={`${section.name}-${sectionIndex}`}>
                            <div className="pbx-admin-section-head">
                              <label className="pbx-admin-grow">
                                <span>Section</span>
                                <input value={section.name} onChange={(event) => invalidatePlan(updateSectionName(config, sectionIndex, event.target.value))} aria-label={`Section ${sectionIndex + 1} name`} />
                              </label>
                              <button type="button" className="pbx-admin-icon danger-quiet" onClick={() => invalidatePlan(removeSection(config, sectionIndex))} aria-label={`Remove section ${section.name || sectionIndex + 1}`}>
                                <span className="msym" aria-hidden="true">delete</span>
                              </button>
                            </div>
                            <div className="pbx-admin-entries">
                              {section.entries.map((entry, entryIndex) => (
                                <div className="pbx-admin-entry" key={`${entry.key}-${entryIndex}`}>
                                  <input value={entry.key} onChange={(event) => invalidatePlan(updateEntry(config, sectionIndex, entryIndex, { key: event.target.value }))} aria-label={`Setting ${entryIndex + 1} name`} placeholder="setting" />
                                  <input value={entry.value} onChange={(event) => invalidatePlan(updateEntry(config, sectionIndex, entryIndex, { value: event.target.value }))} aria-label={`Setting ${entryIndex + 1} value`} placeholder="value" />
                                  <button type="button" className="pbx-admin-icon danger-quiet" onClick={() => invalidatePlan(removeEntry(config, sectionIndex, entryIndex))} aria-label={`Remove ${entry.key || `setting ${entryIndex + 1}`}`}>
                                    <span className="msym" aria-hidden="true">remove</span>
                                  </button>
                                </div>
                              ))}
                              <button type="button" className="pbx-admin-add-row" onClick={() => invalidatePlan(addEntry(config, sectionIndex))}><span className="msym" aria-hidden="true">add</span> Add setting</button>
                            </div>
                          </section>
                        ))}
                        <div className="pbx-admin-add-section">
                          <input value={newSectionName} onChange={(event) => setNewSectionName(event.target.value)} placeholder="new-section" aria-label="New section name" />
                          <button type="button" className="pbx-admin-button secondary" onClick={() => {
                            if (!config) return;
                            const next = addSection(config, newSectionName);
                            if (next !== config) {
                              invalidatePlan(next);
                              setNewSectionName('');
                            }
                          }}>Add section</button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {mode === 'media' ? (
                  <div className="pbx-admin-pane">
                    <div className="pbx-admin-toolbar">
                      <label>
                        <span>Media library</span>
                        <select value={mediaRoot} onChange={(event) => setMediaRoot(event.target.value as MediaRoot)}>
                          <option value="prompts">Prompts / recordings</option>
                          <option value="musicOnHold">Music on hold</option>
                        </select>
                      </label>
                      <label className="pbx-admin-upload">
                        <span className="msym" aria-hidden="true">upload</span>
                        <span>Upload media</span>
                        <input type="file" accept=".wav,.gsm,.ulaw,.alaw,.g722,.sln,.sln16,.ogg,.opus" onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.currentTarget.value = '';
                          if (file) void uploadMedia(file);
                        }} />
                      </label>
                      <button type="button" className="pbx-admin-button secondary" onClick={() => void loadMedia()} disabled={!targetId || working.length > 0}>Refresh</button>
                    </div>
                    <p className="pbx-admin-help">Uploads are accepted only under Asterisk’s prompt or music-on-hold roots. The control plane rejects path separators, traversal, unsupported extensions, oversized files and mismatched headers before reporting success.</p>
                    <div className="pbx-admin-table" role="table" aria-label="PBX media files">
                      <div className="pbx-admin-table-row header" role="row"><span>Name</span><span>Format</span><span>Size</span><span>Action</span></div>
                      {media.map((file) => (
                        <div className="pbx-admin-table-row" role="row" key={file.path}>
                          <span>{file.name}</span><span>{file.extension}</span><span>{bytesLabel(file.bytes)}</span>
                          <span><button type="button" className="pbx-admin-link danger-link" onClick={() => setPendingRemove(file)}>Remove</button></span>
                        </div>
                      ))}
                      {media.length === 0 ? <div className="pbx-admin-empty">No media file was read from this library.</div> : null}
                    </div>
                    {pendingRemove ? (
                      <div className="pbx-admin-confirm" role="alertdialog" aria-label="Confirm media removal">
                        <div><strong>Remove {pendingRemove.name}?</strong><span>Media removal is irreversible. Only this validated filename in the selected media root will be removed.</span></div>
                        <button type="button" className="pbx-admin-button secondary" onClick={() => setPendingRemove(undefined)}>Cancel</button>
                        <button type="button" className="pbx-admin-button danger" onClick={() => void removeMediaFile(pendingRemove)}>Remove file</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {mode === 'history' ? (
                  <div className="pbx-admin-pane">
                    <div className="pbx-admin-toolbar">
                      {feature.resources.length > 0 ? (
                        <label className="pbx-admin-grow">
                          <span>Recovery resource</span>
                          <select value={resource} onChange={(event) => setResource(event.target.value)}>
                            {feature.resources.map((item) => <option key={item} value={item}>{basename(item)}</option>)}
                          </select>
                        </label>
                      ) : <div className="pbx-admin-grow"><span className="pbx-admin-help">Showing recovery points across all allowlisted configuration resources.</span></div>}
                      <button type="button" className="pbx-admin-button secondary" onClick={() => void loadHistory()} disabled={!targetId || working.length > 0}>Refresh</button>
                    </div>
                    <p className="pbx-admin-help">These are the timestamped recovery points created by real configuration transactions. Restoring copies the selected backup over its own allowlisted resource and reads it back to verify the copy.</p>
                    <div className="pbx-admin-table" role="table" aria-label="Configuration recovery points">
                      <div className="pbx-admin-table-row history header" role="row"><span>Resource</span><span>Taken</span><span>Size</span><span>Action</span></div>
                      {history.map((entry) => (
                        <div className="pbx-admin-table-row history" role="row" key={entry.handle}>
                          <span>{basename(entry.resource)}</span><span>{entry.takenAt ?? 'Timestamp unavailable'}</span><span>{bytesLabel(entry.bytes)}</span>
                          <span><button type="button" className="pbx-admin-link" onClick={() => setPendingRestore(entry)}>Restore</button></span>
                        </div>
                      ))}
                      {history.length === 0 ? <div className="pbx-admin-empty">No recovery point was read for this scope.</div> : null}
                    </div>
                    {pendingRestore ? (
                      <div className="pbx-admin-confirm" role="alertdialog" aria-label="Confirm configuration restore">
                        <div><strong>Restore {basename(pendingRestore.resource)}?</strong><span>This overwrites the live file with the selected recovery point, then verifies the restored bytes by reading the target back.</span></div>
                        <button type="button" className="pbx-admin-button secondary" onClick={() => setPendingRestore(undefined)}>Cancel</button>
                        <button type="button" className="pbx-admin-button danger" onClick={() => void restore(pendingRestore)}>Restore & verify</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </main>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
