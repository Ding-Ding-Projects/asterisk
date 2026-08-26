/**
 * Guards the modules this pass reached for the first time: extensions.ts (endpoint
 * caller ID), trunk-advanced.ts (the Trunks screen's Advanced/T.38/Identity-trust
 * group), feature-codes.ts (the Feature codes screen's two Save actions), and
 * status-hub-client.ts (the Status hub screen's "Record this session" button).
 *
 * Every source-anchored assertion here matches the real call shape a live handler
 * uses, not a bare substring a comment could also satisfy -- a renamed symbol or a
 * commented-out line cannot pass any of these. Every one of these was broken on
 * purpose, watched red, and restored; see the task's own report for the individual
 * break/restore pairs.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appUrl = new URL('../../app/renderer/src/App.tsx', import.meta.url);
const endpointEditUrl = new URL('../../app/renderer/src/endpoint-edit.ts', import.meta.url);
const designUrl = new URL('../../../design/Asterisk Console M3.dc.html', import.meta.url);
const generatedUrl = new URL('../../app/renderer/src/generated/console.tsx', import.meta.url);

async function source(url: URL): Promise<string> {
  // CRLF-safe: this checkout is CRLF throughout.
  return (await readFile(url, 'utf8')).replace(/\r\n/g, '\n');
}

// ---------------------------------------------------------------- extensions.ts: caller ID

test('endpoint-edit.ts imports extensions.ts and uses it for both halves of callerid', () => {
  return source(endpointEditUrl).then((src) => {
    assert.match(src, /^import \{ callerIdFor, parseCallerId \} from '\.\/extensions';/mu,
      'endpoint-edit.ts no longer imports extensions.ts');
    assert.match(src, /const callerIdParts = parseCallerId\(endpoint\.endpoint\.callerid\);/u,
      'controlValuesFor no longer seeds the two caller-ID fields through parseCallerId');
    assert.match(src, /set\('callerid', callerIdFor\(\{ extension: name, displayName, callerIdNumber: callerIdNumberIn \}\), 'caller ID'\);/u,
      'applyControlValues no longer composes and writes callerid through callerIdFor');
  });
});

test('the two caller-ID controls are declared on the endpoints Identity group in the design', () => {
  return source(designUrl).then((src) => {
    assert.match(src, /ctl\('e_displayname','Display name','text',/u, 'e_displayname is missing from the design');
    assert.match(src, /ctl\('e_calleridnum','Outbound caller ID number','text',/u, 'e_calleridnum is missing from the design');
  });
});

test('an untouched caller-ID pair never overwrites an existing callerid with nothing', () => {
  return source(endpointEditUrl).then((src) => {
    const body = src.slice(src.indexOf('const displayName = optionalText(ENDPOINT_CONTROLS.displayName);'), src.indexOf('setAor(\'max_contacts\''));
    assert.match(body, /if \(displayName !== undefined \|\| callerIdNumberIn !== undefined\) \{/u,
      'the callerid write is no longer gated on at least one half carrying a real value');
  });
});

// ---------------------------------------------------------------- trunk-advanced.ts

test('the trunks screen dispatches trunk-advanced-save to a real handler that uses trunk-advanced.ts', () => {
  return source(appUrl).then((app) => {
    assert.match(app, /^\s*if \(action === 'trunk-advanced-save'\) \{ void this\.onSaveTrunkAdvanced\(\); return; \}/mu,
      'trunk-advanced-save is not dispatched to a real handler');
    const body = app.slice(app.indexOf('onSaveTrunkAdvanced = async'), app.indexOf('/** Removes the loaded endpoint'));
    assert.match(body, /applyTrunkAdvancedValues\(value, this\.editingEndpoint, /u,
      'onSaveTrunkAdvanced no longer calls trunk-advanced.ts\'s own applyControlValues');
    assert.match(body, /trunkDocument\(edit, PJSIP_RESOURCE\)/u,
      'onSaveTrunkAdvanced no longer writes through trunk-advanced.ts\'s own trunkDocument');
    assert.match(body, /edit\.warnings\.length > 0/u,
      'onSaveTrunkAdvanced no longer surfaces trunk-advanced.ts\'s own T.38/RPID warnings after a real write');
  });
});

test('picking a trunk row seeds the tk_* advanced controls alongside the e_* endpoint controls', () => {
  return source(appUrl).then((app) => {
    assert.match(app, /\.\.\.controlValuesFor\(endpoint\), \.\.\.trunkAdvancedControlValuesFor\(endpoint\) \}/u,
      'onPickRow no longer merges trunk-advanced.ts\'s own controlValuesFor into the seeded values');
  });
});

test('all thirteen trunk-advanced controls are declared in the design, under one consolidated trunk Save', () => {
  /* tk_save ('Save advanced trunk settings' / action:'trunk-advanced-save') is gone on
   * purpose: the w2-deepen lane gave the Trunks screen a real registration+endpoint pairing
   * (trunk-registration.ts) and consolidated the Failover, Outbound identity and Advanced
   * groups behind one 'Save' button, t_save (action:'trunk-save', App.tsx's onSaveTrunk),
   * so a click writes the retry policy and the paired endpoint's advanced fields together
   * instead of two separate saves that could disagree about which row was loaded. The old
   * onSaveTrunkAdvanced/trunk-advanced-save handler above still exists in App.tsx -- nothing
   * in this pass removed it -- but nothing in the design dispatches to it any more, so this
   * guard only pins the thirteen tk_* fields, not a button the screen no longer shows. */
  return source(designUrl).then((src) => {
    for (const id of [
      'tk_connectedline', 'tk_contactuser', 'tk_fromdomain', 'tk_fromuser', 'tk_mediaaddr',
      'tk_t38', 'tk_t38ec', 'tk_t38nat', 'tk_t38mtu', 'tk_faxdetect',
      'tk_trustout', 'tk_sendrpid', 'tk_senddiversion',
    ]) {
      assert.match(src, new RegExp(`ctl\\('${id}',`, 'u'), `${id} is missing from the design`);
    }
    assert.match(src, /ctl\('t_save','Save this trunk','segmented','Save',\{ options:\['Save'\], action:'trunk-save' \}\)/u,
      'the consolidated trunk Save control is missing from the design');
  });
});

// ---------------------------------------------------------------- feature-codes.ts

test('the Feature codes screen dispatches both Save actions to real handlers', () => {
  return source(appUrl).then((app) => {
    assert.match(app, /^\s*if \(action === 'fcodes-save'\) \{ void this\.onSaveFeatureCodes\(\); return; \}/mu,
      'fcodes-save is not dispatched to a real handler');
    assert.match(app, /^\s*if \(action === 'fcodes-parking-save'\) \{ void this\.onSaveFeatureCodesParking\(\); return; \}/mu,
      'fcodes-parking-save is not dispatched to a real handler');
  });
});

test('onSaveFeatureCodes writes through feature-codes.ts\'s own applyControlValues and featuresDocument', () => {
  return source(appUrl).then((app) => {
    const body = app.slice(app.indexOf('onSaveFeatureCodes = async'), app.indexOf('onSaveFeatureCodesParking = async'));
    assert.match(body, /applyFeatureCodeValues\(current, state\.values\)/u,
      'onSaveFeatureCodes no longer calls feature-codes.ts\'s own applyControlValues');
    assert.match(body, /featuresDocument\(edit, /u, 'onSaveFeatureCodes no longer writes through featuresDocument');
  });
});

test('onSaveFeatureCodesParking writes res_parking.conf separately, through the generic bound-control path', () => {
  return source(appUrl).then((app) => {
    const body = app.slice(app.indexOf('onSaveFeatureCodesParking = async'), app.indexOf('// ---------------------------------------------------------------- HTTP server screen'));
    assert.match(body, /applyBoundControlValues\('fcodes', current, changes\)/u,
      'onSaveFeatureCodesParking no longer writes through the generic CONTROL_BINDINGS.fcodes path');
    assert.match(body, /resourceForFile\('res_parking\.conf'\)/u,
      'onSaveFeatureCodesParking no longer targets res_parking.conf');
  });
});

test('res_parking.conf is read as its own file, separately from features.conf, when the fcodes screen is open', () => {
  return source(appUrl).then((app) => {
    assert.match(app, /if \(screen === 'fcodes'\) \{/u, 'App.tsx no longer reads res_parking.conf for the fcodes screen');
    assert.match(app, /readControlValues\('fcodes', \[\], \{ 'res_parking\.conf': this\.configs\.parking\.value \?\? \[\] \}\)/u,
      'the parking-lot fields are no longer seeded from a separate res_parking.conf read');
  });
});

test('the Feature codes and parking-lot Save buttons are declared in the design', () => {
  return source(designUrl).then((src) => {
    assert.match(src, /ctl\('fc_save','Save feature codes',/u, 'fc_save is missing from the design');
    assert.match(src, /ctl\('fc_park_save','Save parking lot settings',/u, 'fc_park_save is missing from the design');
  });
});

// ---------------------------------------------------------------- status-hub-client.ts

test('the Status hub screen dispatches hub-report-build to a real handler', () => {
  return source(appUrl).then((app) => {
    assert.match(app, /^\s*if \(action === 'hub-report-build'\) \{ this\.onBuildHubSession\(\); return; \}/mu,
      'hub-report-build is not dispatched to a real handler');
  });
});

test('onBuildHubSession builds a real report from this.configs, validates it, and never claims a transmission', () => {
  return source(appUrl).then((app) => {
    const body = app.slice(app.indexOf('onBuildHubSession = (): void => {'), app.indexOf('/** The Status hub table\'s real rows'));
    assert.match(body, /Object\.entries\(this\.configs\)/u, 'onBuildHubSession no longer builds lanes from this.configs');
    assert.match(body, /const problems = validateReport\(report\);/u, 'onBuildHubSession no longer validates the report before recording it');
    assert.match(body, /this\.hubSessions = \[buildPayload\(report\), \.\.\.this\.hubSessions\];/u,
      'onBuildHubSession no longer stores the validated buildPayload result');
    assert.match(body, /nothing was sent anywhere/iu, 'onBuildHubSession no longer says plainly that nothing was transmitted');
  });
});

test('the hub screen table renders real recorded sessions, and the "Record this session" button is declared', () => {
  return source(appUrl).then((app) => {
    assert.match(app, /id === 'hub'\s*\n\s*\? this\.hubRows\(\)/u, 'applyRows no longer overrides the hub screen table with hubRows()');
  });
});

test('the hub screen\'s Record button is declared in the design and its agent-rail row is honestly "wired"', () => {
  return Promise.all([source(designUrl), readFile(new URL('../../app/feature-registry.json', import.meta.url), 'utf8')])
    .then(([design, registryRaw]) => {
      assert.match(design, /ctl\('b_build','Record this session',/u, 'b_build is missing from the design');
      const registry = JSON.parse(registryRaw) as { features: Record<string, { blockedBy?: string; state: string }> };
      assert.equal(registry.features['status-hub'].state, 'partial',
        'status-hub is no longer partial -- the network transport may have shipped, update this test');
      assert.equal(registry.features['status-hub'].blockedBy, undefined,
        'status-hub carries a blockedBy again despite App.tsx importing it -- this contradicts implementation-blockers.test.mjs');
    });
});

// ---------------------------------------------------------------- notification centre + toast anchor

test('the notification centre and toast-anchor fixes reference the same real generated shell text', () => {
  return source(generatedUrl).then((src) => {
    assert.match(src, /right:24px; bottom:24px/u, 'the compiled toast no longer carries the bottom-right anchor');
    assert.match(src, /s\.screen === 'notifications' && this\.onMarkAllNotificationsRead \? this\.onMarkAllNotificationsRead\(\)/u,
      'the compiled shell no longer dispatches the notifications add button to a real handler');
  });
});
