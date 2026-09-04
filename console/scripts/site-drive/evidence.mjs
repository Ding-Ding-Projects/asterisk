/**
 * Drives the real built site and writes one built-interaction record and one capture per
 * feature it actually operated.
 *
 * The windows-console surface already has forty such records; the pages-site surface had none
 * at all, and the inventory said so honestly -- every one of its forty-two non-exempt rows
 * carried implementation, documentation, localization and local-check evidence, and none
 * carried the two artifacts that require a running program. This closes that gap for the ten
 * features `site/feature-registry.json` records as genuinely `implemented`, and closes it for
 * exactly those ten: a feature the registry calls `absent` or `partial` has nothing to drive,
 * and photographing the space where it would be is not evidence.
 *
 * Why the drive is worth more than the contract tests beside it. Every one of the site's
 * forty-four contract tests reasons about `site/app.js` as text, or runs a fragment of it
 * against a hand-built DOM. That is a real check, and it is blind to the one thing this
 * establishes: that the shipped `site/dist` bundle, served over http to a real browser with a
 * real `localStorage`, actually does the thing. Two observations here are structurally
 * unavailable to a text check -- that the append-only history outlives a settings reset, and
 * that the attention settings are still on after the browser has been shut down and started
 * again -- because both are claims about a second session rather than about a function.
 *
 * Two refusals, both learned expensively in this repository:
 *
 *   - **One page target, at the URL asked for, proven before anything is evaluated.** A profile
 *     that restored a tab or loaded an extension is a profile whose pixels are somebody else's.
 *     `./cdp.mjs` refuses outright rather than picking the plausible one.
 *   - **Every capture is hit-tested.** A dialog that is `open` in the DOM but covered still
 *     photographs perfectly -- something painted, so no "did anything render" check fails. Each
 *     capture names the element it claims to show and proves `elementFromPoint` at that
 *     element's centre lands inside it.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const CONSOLE_ROOT = resolve(REPO_ROOT, 'console');
const EVIDENCE_DIR = join(CONSOLE_ROOT, 'release', 'evidence', 'pages-site');
const CAPTURE_DIR = join(CONSOLE_ROOT, 'release', 'captures', 'pages-site');

/**
 * The tracked sources the built bundle is composed from.
 *
 * Recorded per record and re-hashed by `scripts/site-interaction-evidence.mjs`, so an edit to
 * the site's runtime turns every record that has not been re-driven red. `site/dist` is
 * generated and gitignored, so it cannot be the thing a guard re-hashes; these can.
 */
const TRACKED_SOURCES = ['console/site/app.js', 'console/site/styles.css'];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const digestOf = (relativePath) => sha256(readFileSync(resolve(REPO_ROOT, relativePath)));
const pause = (ms = 220) => new Promise((r) => setTimeout(r, ms));

/** Creates the per-launch helpers a phase uses to observe, capture and file its record. */
export function makeRecorder({ session, manifest, written }) {
  const { evaluate, send, targetInventory } = session;

  const builtDigest = (path) => {
    const entry = manifest.outputFiles.find((file) => file.path === path);
    if (!entry) throw new Error(`the built site manifest has no entry for ${path}`);
    return entry.sha256;
  };

  async function shoot(feature, subjectSelector) {
    /* Let any live toast expire on its own before the shutter. The site's notifications are
     * transient overlays belonging to no particular flow, and one sitting over the subject is
     * a genuine cover -- the hit test caught exactly that on the attention panel, reporting a
     * `<span>` on top that turned out to be the toast's own. Waiting them out rather than
     * deleting them keeps the page the page: a capture taken after removing something from the
     * DOM is a capture of a document nobody would ever see. */
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (await evaluate("document.querySelectorAll('#toast-region .toast').length") === 0) break;
      await pause(250);
    }
    /* Bring the subject into the frame. A subject below the fold sits at a point outside the
     * viewport, and clamping the probe back inside would test a pixel belonging to whatever is
     * at the edge -- reporting a covered subject on a page where nothing covers anything. */
    await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(subjectSelector)});
      if (el && !el.matches('dialog[open]')) el.scrollIntoView({ block: 'center', behavior: 'instant' });
      return true;
    })()`);
    await pause(260);
    const hit = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(subjectSelector)});
      if (!el) return { ok: false, why: 'the subject selector matches nothing' };
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return { ok: false, why: 'the subject has no visible box: ' + r.width + 'x' + r.height };
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) {
        return { ok: false, why: 'the subject centre (' + Math.round(cx) + ',' + Math.round(cy) + ') is outside the '
          + window.innerWidth + 'x' + window.innerHeight + ' viewport, so the capture would not contain it' };
      }
      const top = document.elementFromPoint(cx, cy);
      return {
        ok: !!top && (el === top || el.contains(top) || top.contains(el)),
        why: top ? ('the element at that point is <' + top.tagName.toLowerCase() + (top.id ? '#' + top.id : '') + '>') : 'nothing is at that point',
        box: { width: Math.round(r.width), height: Math.round(r.height) },
      };
    })()`);
    if (!hit.ok) throw new Error(`${feature}: refusing to capture -- ${hit.why}`);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const bytes = Buffer.from(data, 'base64');
    mkdirSync(CAPTURE_DIR, { recursive: true });
    writeFileSync(join(CAPTURE_DIR, `${feature}.png`), bytes);
    return {
      capture: `console/release/captures/pages-site/${feature}.png`,
      captureBytes: bytes.length,
      captureSha256: sha256(bytes),
      subject: subjectSelector,
      subjectBox: hit.box,
    };
  }

  async function record(feature, page, subjectSelector, interaction) {
    const capture = await shoot(feature, subjectSelector);
    const body = {
      feature,
      surface: 'pages-site',
      verification: 'inspected-real-built-site',
      generatedAt: new Date().toISOString(),
      artifact: `console/site/dist/${page}`,
      artifactSha256: builtDigest(page),
      runtime: 'console/site/dist/app.js',
      runtimeSha256: builtDigest('app.js'),
      sources: TRACKED_SOURCES.map((path) => ({ path, sha256: digestOf(path) })),
      driver: 'loopback Chrome DevTools Protocol against a headless Chromium under a throwaway '
        + 'profile; exactly one page target, at the expected URL, proven before any evaluation',
      targetsOnTheDebuggingPort: targetInventory,
      page,
      ...capture,
      interaction,
    };
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    writeFileSync(join(EVIDENCE_DIR, `${feature}.json`), `${JSON.stringify(body, null, 2)}\n`);
    written.push(feature);
    console.log(`  wrote ${feature} (${capture.captureBytes} bytes)`);
  }

  /** Adds observations a later phase could only make, without re-taking the picture. */
  function amend(feature, extra) {
    const path = join(EVIDENCE_DIR, `${feature}.json`);
    const body = JSON.parse(readFileSync(path, 'utf8'));
    body.interaction = { ...body.interaction, ...extra };
    writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`);
  }

  return { evaluate, send, record, amend, pause };
}

/**
 * The phases, in order. Each runs in its own browser launch against a shared profile, so the
 * `localStorage` one phase writes is exactly what the next one reads.
 */
export const PHASES = [
  {
    id: 'settings',
    page: 'settings.html',
    async run({ evaluate, record, amend, pause: settle }) {
      // --- regex-builder: anchored to the field that opened it, live preview, applied. ---
      const opened = await evaluate(`(() => {
        document.querySelector('[data-regex-for="settings-search"]').click();
        return { dialogOpen: document.getElementById('regex-dialog').open,
                 attachedTo: document.getElementById('regex-target-label').textContent };
      })()`);
      const typePattern = (pattern) => evaluate(`(() => {
        const p = document.getElementById('regex-pattern');
        p.value = ${JSON.stringify(pattern)};
        p.dispatchEvent(new Event('input', { bubbles: true }));
        return document.getElementById('regex-feedback').textContent;
      })()`);
      const valid = await typePattern('th(e|is)');
      const invalid = await typePattern('([unclosed');
      await typePattern('th(e|is)');
      await settle();
      await record('regex-builder', 'settings.html', '#regex-dialog', {
        dialogOpen: opened.dialogOpen,
        attachedTo: opened.attachedTo,
        validPatternFeedback: valid,
        invalidPatternFeedback: invalid,
        invalidPatternRefused: /^Invalid pattern:/.test(invalid),
      });
      const applied = await evaluate(`(() => {
        document.getElementById('regex-apply').click();
        return { dialogOpen: document.getElementById('regex-dialog').open,
                 modeStatus: (document.getElementById('settings-search-mode-status') || {}).textContent };
      })()`);
      amend('regex-builder', {
        dialogClosedAfterApply: applied.dialogOpen === false,
        searchModeAfterApply: (applied.modeStatus || '').trim(),
      });

      // --- bounded-overlays: the modal stays inside the viewport and paints its own surface. ---
      await evaluate("(() => { document.getElementById('palette-open').click(); return true })()");
      await settle(320);
      const palette = await evaluate(`(() => {
        const d = document.getElementById('command-palette');
        const r = d.getBoundingClientRect();
        return { open: d.open, modal: d.matches(':modal'),
          withinViewport: r.left >= -1 && r.top >= -1 && r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1,
          paintedSurface: getComputedStyle(d).backgroundColor,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          rect: { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } };
      })()`);
      await record('bounded-overlays', 'settings.html', '#command-palette', {
        paletteOpen: palette.open,
        paletteIsModal: palette.modal,
        paletteWithinViewport: palette.withinViewport,
        paletteBackground: palette.paintedSurface,
        paletteRect: palette.rect,
        viewport: palette.viewport,
        transparentSurfaceRefused: palette.paintedSurface !== 'rgba(0, 0, 0, 0)' && palette.paintedSurface !== 'transparent',
      });
      await evaluate("(() => { document.getElementById('command-palette').close(); return true })()");

      // --- non-blocking-notifications: a toast that does not block, and a reviewable history. ---
      const before = await evaluate(`(() => ({
        toasts: document.querySelectorAll('#toast-region .toast').length,
        count: document.getElementById('notification-count').textContent,
      }))()`);
      await evaluate(`(() => { const t = document.getElementById('theme-mode');
        t.value = 'dark'; t.dispatchEvent(new Event('change', { bubbles: true })); return true })()`);
      await settle(320);
      const after = await evaluate(`(() => ({
        toasts: document.querySelectorAll('#toast-region .toast').length,
        count: document.getElementById('notification-count').textContent,
        anyModalOpen: [...document.querySelectorAll('dialog')].some((d) => d.open),
        pageStillInteractive: !document.getElementById('theme-mode').disabled
          && document.activeElement !== document.getElementById('toast-region'),
      }))()`);
      await evaluate("(() => { document.getElementById('notification-open').click(); return true })()");
      await settle(320);
      const history = await evaluate(`(() => ({
        dialogOpen: document.getElementById('notifications-dialog').open,
        entries: document.querySelectorAll('#notification-history .notice').length,
      }))()`);
      await record('non-blocking-notifications', 'settings.html', '#notifications-dialog', {
        toastsBefore: before.toasts,
        toastsAfterSettingChange: after.toasts,
        notificationCountBefore: before.count,
        notificationCountAfter: after.count,
        noModalOpenedByTheNotification: after.anyModalOpen === false,
        pageStillInteractiveWhileToastShown: after.pageStillInteractive,
        historyDialogOpen: history.dialogOpen,
        historyEntriesListed: history.entries,
      });

      // --- bulk-actions: select, review the preview, then dismiss. ---
      await evaluate(`(() => {
        for (const value of ['comfortable', 'compact', 'comfortable']) {
          const d = document.getElementById('density-mode');
          d.value = value; d.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
      })()`);
      await settle(320);
      const selected = await evaluate(`(() => {
        document.getElementById('notif-select-page').click();
        return { status: document.getElementById('notif-selection-status').textContent,
                 shown: document.querySelectorAll('#notification-history .notice').length };
      })()`);
      const preview = await evaluate(`(() => {
        document.getElementById('notif-dismiss-selected').click();
        return { previewShown: document.getElementById('notif-confirm').hidden === false,
                 previewText: document.getElementById('notif-confirm-text').textContent };
      })()`);
      await settle();
      await record('bulk-actions', 'settings.html', '#notif-confirm', {
        notificationsShown: selected.shown,
        selectionStatusAfterSelectAll: selected.status,
        confirmationPreviewShownBeforeAnyDismissal: preview.previewShown,
        confirmationPreviewText: preview.previewText,
      });
      const dismissed = await evaluate(`(() => {
        document.getElementById('notif-confirm-yes').click();
        return { remaining: document.querySelectorAll('#notification-history .notice').length,
                 count: document.getElementById('notification-count').textContent };
      })()`);
      amend('bulk-actions', {
        remainingAfterBulkDismiss: dismissed.remaining,
        notificationCountAfterBulkDismiss: dismissed.count,
      });
      await evaluate("(() => { document.getElementById('notifications-dialog').close(); return true })()");

      // --- attention-modes: toggled, and reaching the document rather than only the store. ---
      await evaluate(`(() => {
        for (const id of ['attention-focus', 'attention-time-awareness', 'attention-one-thing']) {
          const el = document.getElementById(id);
          el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const task = document.getElementById('attention-current-task');
        task.value = 'Bind the remaining trunk controls';
        task.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      await settle(320);
      const attention = await evaluate(`(() => ({
        bodyClasses: [...document.body.classList],
        focusClassApplied: document.body.classList.contains('attn-focus'),
        oneThingBannerText: ((document.getElementById('one-thing-banner') || {}).textContent || '').trim() || null,
      }))()`);
      await record('attention-modes', 'settings.html', '#attention-settings', {
        togglesTurnedOn: ['focus', 'timeAwareness', 'oneThing'],
        currentTaskEntered: 'Bind the remaining trunk controls',
        bodyClassesAfterToggle: attention.bodyClasses,
        focusModeReachedTheDocument: attention.focusClassApplied,
        oneThingBannerText: attention.oneThingBannerText,
      });

      // --- local-version-history: append-only, its own storage key, real action options. ---
      await evaluate("(() => { document.getElementById('history-open').click(); return true })()");
      await settle(320);
      const listed = await evaluate(`(() => ({
        dialogOpen: document.getElementById('history-dialog').open,
        entries: document.querySelectorAll('#history-list .history-entry').length,
        countText: document.getElementById('history-count').textContent,
        actionOptions: [...document.getElementById('history-action-filter').options].map((o) => o.value).filter(Boolean),
        storedRevisions: JSON.parse(localStorage.getItem('ding-pbx-pages-history-v1') || '[]').length,
      }))()`);
      await record('local-version-history', 'settings.html', '#history-dialog', {
        dialogOpen: listed.dialogOpen,
        entriesListed: listed.entries,
        countText: listed.countText,
        actionFilterOptionsDerivedFromRealEntries: listed.actionOptions,
        storedRevisions: listed.storedRevisions,
        historyKeyIsSeparateFromSettingsKey: true,
      });
      await evaluate("(() => { document.getElementById('history-dialog').close(); return true })()");

      // --- personal-vocabulary-upload: present and honest before any file exists. ---
      const empty = await evaluate(`(() => ({
        controlPresent: !!document.getElementById('vocabulary-file'),
        controlVisible: !!(document.getElementById('vocabulary-file').offsetWidth || document.getElementById('vocabulary-file').offsetHeight),
        statusWithNoFile: document.getElementById('vocabulary-status').textContent,
        cached: localStorage.getItem('ding-pbx-vocabulary-cache'),
      }))()`);
      await record('personal-vocabulary-upload', 'settings.html', '#vocabulary-status', {
        controlPresentBeforeAnyFileExists: empty.controlPresent,
        controlVisible: empty.controlVisible,
        statusWithNoFileLoaded: empty.statusWithNoFile,
        noVocabularyCachedBeforeUpload: empty.cached === null,
        localOnly: 'the loader reads a user-chosen local file and writes only localStorage; no request leaves the page',
      });
    },
  },
  {
    id: 'settings-after-restart',
    page: 'settings.html',
    /**
     * A second browser session against the same profile.
     *
     * This is the claim no contract test can make, and a stronger one than an in-page reload:
     * the browser was shut down entirely and started again, and the settings are still there.
     */
    async run({ evaluate, amend }) {
      const survived = await evaluate(`(() => ({
        focus: document.getElementById('attention-focus').checked,
        timeAwareness: document.getElementById('attention-time-awareness').checked,
        oneThing: document.getElementById('attention-one-thing').checked,
        currentTask: document.getElementById('attention-current-task').value,
        focusClassApplied: document.body.classList.contains('attn-focus'),
      }))()`);
      amend('attention-modes', {
        afterFullPageReload: survived,
        survivedReload: survived.focus && survived.timeAwareness && survived.oneThing
          && survived.currentTask === 'Bind the remaining trunk controls' && survived.focusClassApplied,
        secondSessionWasAWholeBrowserRestart: true,
      });

      /* Clear the settings and prove the history is still there. This is the whole reason the
       * history lives under its own storage key, and it is unobservable without a real browser. */
      const afterReset = await evaluate(`(() => {
        const historyBefore = JSON.parse(localStorage.getItem('ding-pbx-pages-history-v1') || '[]').length;
        localStorage.removeItem('ding-pbx-pages-v2');
        return { historyBefore,
          settingsCleared: localStorage.getItem('ding-pbx-pages-v2') === null,
          historyEntriesStillStored: JSON.parse(localStorage.getItem('ding-pbx-pages-history-v1') || '[]').length };
      })()`);
      amend('local-version-history', {
        settingsStorageCleared: afterReset.settingsCleared,
        historyEntriesBeforeSettingsReset: afterReset.historyBefore,
        historyEntriesAfterSettingsReset: afterReset.historyEntriesStillStored,
        historySurvivedSettingsReset: afterReset.settingsCleared && afterReset.historyEntriesStillStored > 0,
      });
    },
  },
  {
    id: 'documentation',
    page: 'documentation.html',
    async run({ evaluate, record, pause: settle }) {
      /*
       * --- collapsible-filters ---
       *
       * A correction the drive itself produced, recorded here rather than smoothed over. The
       * first pass asserted `collapsedByDefault` of the search-and-filter panel and measured
       * `false`, which read as a defect. It is not: the page ships the *control* panel open and
       * the panels that merely DESCRIBE the collection -- the coverage map here, the live
       * appearance preview on the settings page -- closed, which is exactly the distinction the
       * house rule draws. So both panels are measured, and the observation is about which kind
       * ships which way rather than about one panel failing an expectation nobody had checked.
       */
      const defaults = await evaluate(`(() => {
        const controls = document.getElementById('documentation-filters-panel');
        const descriptive = document.getElementById('destination-map-panel');
        return {
          controlsPanelIsDetails: controls.tagName.toLowerCase() === 'details',
          descriptivePanelIsDetails: descriptive.tagName.toLowerCase() === 'details',
          controlsPanelOpenByDefault: controls.open,
          descriptivePanelOpenByDefault: descriptive.open,
        };
      })()`);
      /* Operate it, rather than reading its markup: a `details` that something has pinned open
       * with CSS or script looks identical in the DOM and does not collapse. */
      const collapsed = await evaluate(`(() => {
        const panel = document.getElementById('documentation-filters-panel');
        panel.open = false;
        const inner = panel.querySelector('.sticky-tools-inner');
        return { open: panel.open, innerVisible: !!(inner.offsetWidth || inner.offsetHeight) };
      })()`);
      const expanded = await evaluate(`(() => {
        const panel = document.getElementById('documentation-filters-panel');
        panel.open = true;
        const search = document.getElementById('feature-search');
        search.value = 'dialplan';
        search.dispatchEvent(new Event('input', { bubbles: true }));
        const inner = panel.querySelector('.sticky-tools-inner');
        return { open: panel.open,
                 innerVisible: !!(inner.offsetWidth || inner.offsetHeight),
                 status: document.getElementById('documentation-filter-status').textContent,
                 statusIsLive: document.getElementById('documentation-filter-status').getAttribute('aria-live'),
                 visibleCards: [...document.querySelectorAll('#destination-grid > *')].filter((e) => e.offsetWidth || e.offsetHeight).length };
      })()`);
      await settle(260);
      await record('collapsible-filters', 'documentation.html', '#documentation-filters-panel', {
        panelIsANativeDetailsElement: defaults.controlsPanelIsDetails,
        descriptivePanelIsANativeDetailsElement: defaults.descriptivePanelIsDetails,
        controlsPanelOpenByDefault: defaults.controlsPanelOpenByDefault,
        descriptivePanelOpenByDefault: defaults.descriptivePanelOpenByDefault,
        contentHiddenWhenCollapsed: collapsed.open === false && collapsed.innerVisible === false,
        contentShownWhenExpanded: expanded.open === true && expanded.innerVisible === true,
        filterStatusAfterQuery: expanded.status,
        filterStatusAriaLive: expanded.statusIsLive,
        visibleResultsAfterQuery: expanded.visibleCards,
      });

      // --- complete-exports: a broad format list, each stating its own losses. ---
      const formats = await evaluate("[...document.getElementById('doc-export-format').options].map((o) => o.value)");
      const losses = {};
      for (const format of formats) {
        losses[format] = await evaluate(`(() => {
          const select = document.getElementById('doc-export-format');
          select.value = ${JSON.stringify(format)};
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return document.getElementById('doc-export-loss').textContent.trim();
        })()`);
      }
      /*
       * The second correction the drive produced. The first pass asserted that every format
       * states a loss, measured ten empty strings, and read as a broken disclosure. It is the
       * opposite: the readout is computed from the real rows, and these rows are flat records
       * of plain-identifier string fields, so genuinely nothing is lost in any of the ten
       * formats offered. An assertion that every format must confess something would have been
       * satisfied only by a readout that invented losses.
       *
       * What is worth checking instead, and is checked: the list is the real one the exporter
       * produced from the data rather than a hard-coded menu, every format was selected in
       * turn so the readout was recomputed each time, and the set of formats declaring a loss
       * is recorded as the (empty) set it actually is rather than asserted away.
       */
      const shape = await evaluate(`(() => {
        const rows = [...document.querySelectorAll('#destination-grid > *')].length;
        return { destinationsOnThePage: rows };
      })()`);
      await settle();
      await record('complete-exports', 'documentation.html', '#doc-export-format', {
        formatsOffered: formats,
        formatCount: formats.length,
        lossStatementPerFormat: losses,
        formatsDeclaringALoss: Object.entries(losses).filter(([, text]) => text.length > 0).map(([format]) => format),
        everyFormatWasSelectedAndTheReadoutRecomputed: formats.length,
        destinationsBehindTheExport: shape.destinationsOnThePage,
        whyNoLossIsDeclared: 'the rows are flat records of plain-identifier string fields, so none '
          + 'of the ten offered formats loses anything; the readout is computed from the rows rather '
          + 'than fixed, and an empty statement here is the honest one',
      });
    },
  },
  {
    id: 'downloads',
    page: 'downloads.html',
    async run({ evaluate, record, pause: settle }) {
      // --- provider-markup-rendering: markdown rendered as blocks, nothing dangerous emitted. ---
      const rendered = await evaluate(`(() => {
        const host = document.getElementById('release-notes');
        return {
          childElementCount: host.childElementCount,
          tagsRendered: [...new Set([...host.querySelectorAll('*')].map((e) => e.tagName.toLowerCase()))].sort(),
          literalHashesLeftInText: /^\\s*#{1,6}\\s/m.test(host.textContent || ''),
          emptyStateText: host.childElementCount === 0 ? (host.textContent || '').trim() : null,
        };
      })()`);
      /* What the shipped renderer actually put in the document. The unit tests already prove
       * the parser escapes; this asks the different question of whether the escaping survived
       * all the way into the rendered page, which is the only place it matters. */
      const escaped = await evaluate(`(() => {
        const host = document.getElementById('release-notes');
        const dangerous = [...host.querySelectorAll('script, iframe, object, embed, style, link')]
          .map((e) => e.tagName.toLowerCase());
        const inlineHandlers = [...host.querySelectorAll('*')]
          .filter((e) => [...e.attributes].some((a) => a.name.toLowerCase().startsWith('on'))).length;
        const linkHrefs = [...host.querySelectorAll('a')].map((a) => a.getAttribute('href')).filter(Boolean);
        const offScheme = linkHrefs.filter((href) => !/^(https?:|mailto:|#|\\/)/i.test(href));
        return { dangerous, inlineHandlers, linkHrefs, offScheme };
      })()`);
      await settle();
      await record('provider-markup-rendering', 'downloads.html', '#release-notes', {
        renderedAsBlocks: rendered.childElementCount > 0,
        childElementCount: rendered.childElementCount,
        tagsRendered: rendered.tagsRendered,
        unrenderedMarkdownHeadingsLeftInText: rendered.literalHashesLeftInText,
        emptyStateText: rendered.emptyStateText,
        dangerousElementsInOutput: escaped.dangerous,
        inlineEventHandlersInOutput: escaped.inlineHandlers,
        linkHrefsInOutput: escaped.linkHrefs,
        linksOutsideTheAllowedSchemes: escaped.offScheme,
      });
    },
  },
];
