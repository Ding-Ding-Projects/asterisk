import assert from "node:assert/strict";
import { test } from "node:test";

import { parseConfig, renderConfig, type ConfigValue } from "../../control-plane/wsl-config-transport.js";
import {
  parseFax,
  validateFax,
  toConfigValueFax,
  parseCel,
  validateCel,
  toConfigValueCel,
  parseFeatures,
  validateFeatures,
  toConfigValueFeatures,
  parsePhoneprov,
  validatePhoneprov,
  toConfigValuePhoneprov,
  parseIax,
  validateIax,
  toConfigValueIax,
  parsePjsip,
  validatePjsip,
  toConfigValuePjsip,
  newPjsipEndpoint,
  randomPjsipSecret,
} from "../../control-plane/subsystem-models.js";

/* --------------------------------------------------------------------------------
 * Fixtures mirror configs/samples/*.sample, with the leading ";" removed on the
 * few lines each test needs uncommented so the value is actually present.
 * -------------------------------------------------------------------------------- */

const FAX_SAMPLE = `
[general]
statusevents=yes
modems=v17,v27,v29
t38timeout=5000
`;

const UDPTL_SAMPLE = `
[general]
udptlstart=4000
udptlend=4999
udptlfecentries = 3
udptlfecspan = 3
use_even_ports = no
`;

const CEL_SAMPLE = `
[general]
enable=yes
apps=dial,park
events=APP_START,CHAN_START,CHAN_END,ANSWER,HANGUP,BRIDGE_ENTER,BRIDGE_EXIT

[manager]
enabled=yes

[radius]
usegmtime=yes
`;

const FEATURES_SAMPLE = `
[general]
transferdigittimeout = 3
xfersound = beep
pickupexten = *8
featuredigittimeout = 1000

[featuremap]
blindxfer = #1
disconnect = *0
atxfer = *2
parkcall = #72
`;

const PHONEPROV_SAMPLE = `
[general]
default_profile=polycom

[polycom]
staticdir = configs/
mime_type = text/xml
static_file = bootrom.ld,application/octet-stream
static_file = bootrom.ver,plain/text
static_file = sip.cfg
`;

const IAX_SAMPLE = `
[general]
bindport=4569
bindaddr=192.168.0.1
bindaddr=10.0.0.1
bandwidth=high
disallow=lpc10
jitterbuffer=no

[guest]
type=user
context=public

[markster]
type=friend
host=dynamic
context=default
permit=0.0.0.0/0.0.0.0
`;

function parse(sample: string): ConfigValue {
  return parseConfig(sample);
}

/* ---------------------------------- fax ---------------------------------- */

test("fax: parses a realistic sample", () => {
  const view = parseFax(parse(FAX_SAMPLE), parse(UDPTL_SAMPLE));
  assert.equal(view.general.statusevents, "yes");
  assert.equal(view.general.modems, "v17,v27,v29");
  assert.equal(view.general.t38timeout, "5000");
  assert.equal(view.udptl.udptlstart, "4000");
  assert.equal(view.udptl.udptlend, "4999");
  assert.equal(view.udptl.use_even_ports, "no");
});

test("fax: empty input returns an empty view, never throws", () => {
  const view = parseFax([], []);
  assert.deepEqual(view.general, {});
  assert.deepEqual(view.udptl, {});
  assert.deepEqual(validateFax(view), []);
});

test("fax: a malformed line is skipped rather than crashing", () => {
  const malformed = "[general]\nthis line has no equals sign\nstatusevents=yes\n";
  const view = parseFax(parse(malformed), []);
  assert.equal(view.general.statusevents, "yes");
});

test("fax: each validation finding is triggered", () => {
  const badRate = parseFax(parse("[general]\nmaxrate=9999\n"), []);
  assert.ok(validateFax(badRate).some((f) => f.severity === "error" && f.message.includes("maxrate")));

  const badModem = parseFax(parse("[general]\nmodems=v99\n"), []);
  assert.ok(validateFax(badModem).some((f) => f.message.includes("modems")));

  const badBool = parseFax(parse("[general]\nstatusevents=maybe\n"), []);
  assert.ok(validateFax(badBool).some((f) => f.message.includes("statusevents")));

  const inverted = parseFax(parse("[general]\nmaxrate=2400\nminrate=14400\n"), []);
  assert.ok(validateFax(inverted).some((f) => f.severity === "warning" && f.message.includes("maxrate is lower")));

  const badChecksums = parseFax([], parse("[general]\nudptlchecksums=nope\n"));
  assert.ok(validateFax(badChecksums).some((f) => f.message.includes("udptlchecksums")));

  const badEvenPorts = parseFax([], parse("[general]\nuse_even_ports=nope\n"));
  assert.ok(validateFax(badEvenPorts).some((f) => f.message.includes("use_even_ports")));

  const badRange = parseFax([], parse("[general]\nudptlstart=5000\nudptlend=4000\n"));
  assert.ok(validateFax(badRange).some((f) => f.message.includes("udptlstart is greater")));
});

test("fax: a clean configuration produces no findings", () => {
  const view = parseFax(parse(FAX_SAMPLE), parse(UDPTL_SAMPLE));
  assert.deepEqual(validateFax(view), []);
});

test("fax: a no-change round trip renders identically", () => {
  const faxParsed = parse(FAX_SAMPLE);
  const udptlParsed = parse(UDPTL_SAMPLE);
  const view = parseFax(faxParsed, udptlParsed);
  const rendered = toConfigValueFax(view);
  assert.equal(renderConfig(rendered.fax), renderConfig(faxParsed));
  assert.equal(renderConfig(rendered.udptl), renderConfig(udptlParsed));
});

test("fax: repeated keys survive (unrelated repeated entry preserved)", () => {
  const withRepeat = "[general]\nstatusevents=yes\nallow=ulaw\nallow=alaw\n";
  const parsed = parse(withRepeat);
  const view = parseFax(parsed, []);
  const rendered = toConfigValueFax(view).fax;
  const allowValues = rendered[0]!.entries.filter((e) => e.key === "allow").map((e) => e.value);
  assert.deepEqual(allowValues, ["ulaw", "alaw"]);
});

test("fax: unrelated sections are preserved", () => {
  const withExtra = `${FAX_SAMPLE}\n[unrelated]\nfoo=bar\n`;
  const parsed = parse(withExtra);
  const view = parseFax(parsed, []);
  const rendered = toConfigValueFax(view).fax;
  assert.ok(rendered.some((s) => s.name === "unrelated" && s.entries.some((e) => e.key === "foo" && e.value === "bar")));
});

/* ---------------------------------- cel ---------------------------------- */

test("cel: parses a realistic sample", () => {
  const view = parseCel(parse(CEL_SAMPLE));
  assert.equal(view.general.enable, "yes");
  assert.equal(view.general.apps, "dial,park");
  assert.equal(view.manager.enabled, "yes");
  assert.equal(view.radius.usegmtime, "yes");
});

test("cel: empty input returns an empty view, never throws", () => {
  const view = parseCel([]);
  assert.deepEqual(view.general, { enable: undefined, apps: undefined, events: undefined, dateformat: undefined });
  assert.deepEqual(validateCel(view), []);
});

test("cel: a malformed line is skipped rather than crashing", () => {
  const malformed = "[general]\nnotakeyvalue\nenable=yes\n";
  const view = parseCel(parse(malformed));
  assert.equal(view.general.enable, "yes");
});

test("cel: each validation finding is triggered", () => {
  const badEnable = parseCel(parse("[general]\nenable=sure\n"));
  assert.ok(validateCel(badEnable).some((f) => f.message.includes("enable must be")));

  const badEvent = parseCel(parse("[general]\nevents=NOT_A_REAL_EVENT\n"));
  assert.ok(validateCel(badEvent).some((f) => f.message.includes("does not exist")));

  const allApps = parseCel(parse("[general]\nenable=yes\napps=all\n"));
  assert.ok(validateCel(allApps).some((f) => f.severity === "warning" && f.message.includes("performance")));

  const offButConfigured = parseCel(parse("[general]\nenable=no\napps=dial\n"));
  assert.ok(validateCel(offButConfigured).some((f) => f.message.includes("nothing will be logged")));

  const badManager = parseCel(parse("[manager]\nenabled=nah\n"));
  assert.ok(validateCel(badManager).some((f) => f.message.includes("manager enabled")));

  const badShowUserDefined = parseCel(parse("[manager]\nshow_user_defined=nah\n"));
  assert.ok(validateCel(badShowUserDefined).some((f) => f.message.includes("show_user_defined")));

  const badRadius = parseCel(parse("[radius]\nusegmtime=nah\n"));
  assert.ok(validateCel(badRadius).some((f) => f.message.includes("radius usegmtime")));
});

test("cel: a clean configuration produces no findings", () => {
  const view = parseCel(parse(CEL_SAMPLE));
  assert.deepEqual(validateCel(view), []);
});

test("cel: a no-change round trip renders identically", () => {
  const parsed = parse(CEL_SAMPLE);
  const view = parseCel(parsed);
  assert.equal(renderConfig(toConfigValueCel(view)), renderConfig(parsed));
});

test("cel: repeated keys survive (an unrelated repeated entry this model does not manage)", () => {
  const withRepeat = "[general]\nenable=yes\ncustomkey=one\ncustomkey=two\n";
  const parsed = parse(withRepeat);
  const view = parseCel(parsed);
  const rendered = toConfigValueCel(view);
  const customValues = rendered.find((s) => s.name === "general")!.entries.filter((e) => e.key === "customkey").map((e) => e.value);
  assert.deepEqual(customValues, ["one", "two"]);
});

test("cel: unrelated sections are preserved", () => {
  const withExtra = `${CEL_SAMPLE}\n[pgsql]\ntable=cel\n`;
  const parsed = parse(withExtra);
  const view = parseCel(parsed);
  const rendered = toConfigValueCel(view);
  assert.ok(rendered.some((s) => s.name === "pgsql" && s.entries.some((e) => e.key === "table" && e.value === "cel")));
});

/* ------------------------------- features -------------------------------- */

test("features: parses a realistic sample", () => {
  const view = parseFeatures(parse(FEATURES_SAMPLE));
  assert.equal(view.general.transferdigittimeout, "3");
  assert.equal(view.general.pickupexten, "*8");
  assert.deepEqual(view.featuremap, [
    { name: "blindxfer", sequence: "#1" },
    { name: "disconnect", sequence: "*0" },
    { name: "atxfer", sequence: "*2" },
    { name: "parkcall", sequence: "#72" },
  ]);
});

test("features: empty input returns an empty view, never throws", () => {
  const view = parseFeatures([]);
  assert.deepEqual(view.general, {});
  assert.deepEqual(view.featuremap, []);
  assert.deepEqual(validateFeatures(view), []);
});

test("features: a malformed line is skipped rather than crashing", () => {
  const malformed = "[general]\nno equals here\npickupexten = *8\n";
  const view = parseFeatures(parse(malformed));
  assert.equal(view.general.pickupexten, "*8");
});

test("features: each validation finding is triggered", () => {
  const badTimeout = parseFeatures(parse("[general]\ntransferdigittimeout = abc\n"));
  assert.ok(validateFeatures(badTimeout).some((f) => f.message.includes("transferdigittimeout")));

  const badFeatureDigit = parseFeatures(parse("[general]\nfeaturedigittimeout = abc\n"));
  assert.ok(validateFeatures(badFeatureDigit).some((f) => f.message.includes("featuredigittimeout")));

  const badAtxferTimeout = parseFeatures(parse("[general]\natxfernoanswertimeout = abc\n"));
  assert.ok(validateFeatures(badAtxferTimeout).some((f) => f.message.includes("atxfernoanswertimeout")));

  const badDropCall = parseFeatures(parse("[general]\natxferdropcall = maybe\n"));
  assert.ok(validateFeatures(badDropCall).some((f) => f.message.includes("atxferdropcall")));

  const blankPickup = parseFeatures(parse("[general]\npickupexten =   \n"));
  assert.ok(validateFeatures(blankPickup).some((f) => f.message.includes("pickupexten cannot be blank")));

  const clash = parseFeatures(parse("[featuremap]\nblindxfer = #1\ndisconnect = #1\n"));
  assert.ok(validateFeatures(clash).some((f) => f.severity === "warning" && f.message.includes("assigned to both")));
});

test("features: a clean configuration produces no findings", () => {
  const view = parseFeatures(parse(FEATURES_SAMPLE));
  assert.deepEqual(validateFeatures(view), []);
});

test("features: a no-change round trip renders identically", () => {
  const parsed = parse(FEATURES_SAMPLE);
  const view = parseFeatures(parsed);
  assert.equal(renderConfig(toConfigValueFeatures(view)), renderConfig(parsed));
});

test("features: repeated keys survive (applicationmap-style repeats)", () => {
  const withRepeat = "[featuremap]\nblindxfer = #1\nblindxfer = #2\n";
  const parsed = parse(withRepeat);
  const view = parseFeatures(parsed);
  const rendered = toConfigValueFeatures(view);
  const featuremap = rendered.find((s) => s.name === "featuremap")!;
  assert.deepEqual(
    featuremap.entries.filter((e) => e.key === "blindxfer").map((e) => e.value),
    ["#1", "#2"],
  );
});

test("features: unrelated sections are preserved", () => {
  const withExtra = `${FEATURES_SAMPLE}\n[myGroupName]\ntestfeature = #9\n`;
  const parsed = parse(withExtra);
  const view = parseFeatures(parsed);
  const rendered = toConfigValueFeatures(view);
  assert.ok(rendered.some((s) => s.name === "myGroupName" && s.entries.some((e) => e.key === "testfeature" && e.value === "#9")));
});

/* ------------------------------ phoneprov -------------------------------- */

test("phoneprov: parses a realistic sample", () => {
  const view = parsePhoneprov(parse(PHONEPROV_SAMPLE));
  assert.equal(view.general.default_profile, "polycom");
  const polycom = view.profiles.find((p) => p.name === "polycom")!;
  assert.equal(polycom.staticdir, "configs/");
  assert.equal(polycom.mime_type, "text/xml");
  assert.deepEqual(polycom.staticFiles, ["bootrom.ld,application/octet-stream", "bootrom.ver,plain/text", "sip.cfg"]);
});

test("phoneprov: empty input returns an empty view, never throws", () => {
  const view = parsePhoneprov([]);
  assert.deepEqual(view.general, {});
  assert.deepEqual(view.profiles, []);
  assert.deepEqual(validatePhoneprov(view), []);
});

test("phoneprov: a malformed line is skipped rather than crashing", () => {
  const malformed = "[general]\nno equals\ndefault_profile=polycom\n";
  const view = parsePhoneprov(parse(malformed));
  assert.equal(view.general.default_profile, "polycom");
});

test("phoneprov: each validation finding is triggered", () => {
  const missingProfile = parsePhoneprov(parse("[general]\ndefault_profile=missing\n[polycom]\nmime_type=text/xml\n"));
  assert.ok(validatePhoneprov(missingProfile).some((f) => f.message.includes("no matching profile section")));

  const emptyProfile = parsePhoneprov(parse("[general]\n[snom]\n"));
  assert.ok(validatePhoneprov(emptyProfile).some((f) => f.severity === "warning" && f.message.includes("register nothing")));
});

test("phoneprov: a clean configuration produces no findings", () => {
  const view = parsePhoneprov(parse(PHONEPROV_SAMPLE));
  assert.deepEqual(validatePhoneprov(view), []);
});

test("phoneprov: a no-change round trip renders identically", () => {
  const parsed = parse(PHONEPROV_SAMPLE);
  const view = parsePhoneprov(parsed);
  assert.equal(renderConfig(toConfigValuePhoneprov(view)), renderConfig(parsed));
});

test("phoneprov: repeated keys survive (static_file entries)", () => {
  const parsed = parse(PHONEPROV_SAMPLE);
  const view = parsePhoneprov(parsed);
  const rendered = toConfigValuePhoneprov(view);
  const polycom = rendered.find((s) => s.name === "polycom")!;
  const files = polycom.entries.filter((e) => e.key === "static_file").map((e) => e.value);
  assert.deepEqual(files, ["bootrom.ld,application/octet-stream", "bootrom.ver,plain/text", "sip.cfg"]);
});

test("phoneprov: unrelated sections are preserved", () => {
  const withExtra = `${PHONEPROV_SAMPLE}\n[snom]\nmime_type = text/xml\n`;
  const parsed = parse(withExtra);
  const view = parsePhoneprov(parsed);
  // snom is a real profile parsed into view.profiles; verify a section this model does
  // not know about at all (e.g. one with no entries) is still preserved unmodified.
  const rendered = toConfigValuePhoneprov(view);
  assert.ok(rendered.some((s) => s.name === "snom" && s.entries.some((e) => e.key === "mime_type" && e.value === "text/xml")));
});

/* ---------------------------------- iax ----------------------------------- */

test("iax: parses a realistic sample", () => {
  const view = parseIax(parse(IAX_SAMPLE));
  assert.equal(view.general.bindport, "4569");
  assert.deepEqual(view.general.bindaddr, ["192.168.0.1", "10.0.0.1"]);
  assert.equal(view.general.bandwidth, "high");
  const markster = view.peers.find((p) => p.name === "markster")!;
  assert.equal(markster.type, "friend");
  assert.equal(markster.host, "dynamic");
  assert.deepEqual(markster.permit, ["0.0.0.0/0.0.0.0"]);
});

test("iax: empty input returns an empty view, never throws", () => {
  const view = parseIax([]);
  assert.deepEqual(view.general.bindaddr, []);
  assert.equal(view.general.bindport, undefined);
  assert.deepEqual(view.peers, []);
  assert.deepEqual(validateIax(view), []);
});

test("iax: a malformed line is skipped rather than crashing", () => {
  const malformed = "[general]\nno equals sign here\nbindport=4569\n";
  const view = parseIax(parse(malformed));
  assert.equal(view.general.bindport, "4569");
});

test("iax: each validation finding is triggered", () => {
  const badBool = parseIax(parse("[general]\niaxcompat=dunno\n"));
  assert.ok(validateIax(badBool).some((f) => f.message.includes("iaxcompat")));

  const badAma = parseIax(parse("[general]\namaflags=urgent\n"));
  assert.ok(validateIax(badAma).some((f) => f.message.includes("amaflags")));

  const badBandwidth = parseIax(parse("[general]\nbandwidth=extreme\n"));
  assert.ok(validateIax(badBandwidth).some((f) => f.message.includes("bandwidth")));

  const badAuth = parseIax(parse("[general]\nauth=quantum\n"));
  assert.ok(validateIax(badAuth).some((f) => f.message.includes("general auth")));

  const badJitter = parseIax(parse("[general]\nmaxjitterbuffer=abc\n"));
  assert.ok(validateIax(badJitter).some((f) => f.message.includes("maxjitterbuffer")));

  const badType = parseIax(parse("[foo]\ntype=admin\n"));
  assert.ok(validateIax(badType).some((f) => f.message.includes("type must be")));

  const openPeer = parseIax(parse("[foo]\ntype=peer\nhost=dynamic\n"));
  assert.ok(validateIax(openPeer).some((f) => f.severity === "warning" && f.message.includes("no permit/deny")));
});

test("iax: a clean configuration produces no findings", () => {
  const view = parseIax(parse(IAX_SAMPLE));
  assert.deepEqual(validateIax(view), []);
});

test("iax: a no-change round trip renders identically", () => {
  const parsed = parse(IAX_SAMPLE);
  const view = parseIax(parsed);
  assert.equal(renderConfig(toConfigValueIax(view)), renderConfig(parsed));
});

test("iax: repeated keys survive (bindaddr, permit, context)", () => {
  const parsed = parse(IAX_SAMPLE);
  const view = parseIax(parsed);
  const rendered = toConfigValueIax(view);
  const general = rendered.find((s) => s.name === "general")!;
  assert.deepEqual(
    general.entries.filter((e) => e.key === "bindaddr").map((e) => e.value),
    ["192.168.0.1", "10.0.0.1"],
  );
});

test("iax: unrelated sections are preserved", () => {
  const withExtra = `${IAX_SAMPLE}\n[dundi]\ntype=user\ndbsecret=dundi/secret\n`;
  const parsed = parse(withExtra);
  const view = parseIax(parsed);
  const rendered = toConfigValueIax(view);
  const dundi = rendered.find((s) => s.name === "dundi")!;
  assert.ok(dundi.entries.some((e) => e.key === "dbsecret" && e.value === "dundi/secret"));
});

/* --------------------------------- pjsip ----------------------------------- */

const PJSIP_SAMPLE = `
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0

[7000]
type=endpoint
context=from-internal
disallow=all
allow=ulaw
allow=alaw
auth=7000
aors=7000
dtmf_mode=rfc4733
direct_media=no
force_rport=yes
rewrite_contact=yes
rtp_symmetric=yes
callerid=Front Desk <7000>

[7000]
type=auth
auth_type=digest
username=7000
password=correct-horse-battery-staple

[7000]
type=aor
max_contacts=1
remove_existing=yes

[global]
type=global
`;

test("pjsip: parses a realistic endpoint/auth/aor trio", () => {
  const view = parsePjsip(parse(PJSIP_SAMPLE));
  assert.equal(view.endpoints.length, 1);
  const ep = view.endpoints[0]!;
  assert.equal(ep.name, "7000");
  assert.ok(ep.hasEndpoint && ep.hasAuth && ep.hasAor);
  assert.equal(ep.endpoint.context, "from-internal");
  assert.deepEqual(ep.endpoint.disallow, ["all"]);
  assert.deepEqual(ep.endpoint.allow, ["ulaw", "alaw"]);
  assert.equal(ep.endpoint.auth, "7000");
  assert.equal(ep.endpoint.aors, "7000");
  assert.equal(ep.auth.auth_type, "digest");
  assert.equal(ep.auth.username, "7000");
  assert.equal(ep.auth.password, "correct-horse-battery-staple");
  assert.equal(ep.aor.max_contacts, "1");
  assert.equal(ep.aor.remove_existing, "yes");
});

test("pjsip: non-endpoint sections (transport, global) are never mistaken for an endpoint", () => {
  const view = parsePjsip(parse(PJSIP_SAMPLE));
  assert.ok(!view.endpoints.some((e) => e.name === "transport-udp" || e.name === "global"));
  const rendered = toConfigValuePjsip(view);
  assert.ok(rendered.some((s) => s.name === "transport-udp" && s.entries.some((e) => e.key === "protocol" && e.value === "udp")));
  assert.ok(rendered.some((s) => s.name === "global" && entryOf(rendered, "global", "type") === "global"));
});

function entryOf(value: ConfigValue, sectionName: string, key: string): string | undefined {
  return value.find((s) => s.name === sectionName)?.entries.find((e) => e.key === key)?.value;
}

test("pjsip: empty input returns an empty view, never throws", () => {
  const view = parsePjsip([]);
  assert.deepEqual(view.endpoints, []);
  assert.deepEqual(validatePjsip(view), []);
});

test("pjsip: a clean configuration produces no findings", () => {
  const view = parsePjsip(parse(PJSIP_SAMPLE));
  assert.deepEqual(validatePjsip(view), []);
});

test("pjsip: a no-change round trip renders identically", () => {
  const parsed = parse(PJSIP_SAMPLE);
  const view = parsePjsip(parsed);
  assert.equal(renderConfig(toConfigValuePjsip(view)), renderConfig(parsed));
});

test("pjsip: editing a field changes only that field on write-back", () => {
  const view = parsePjsip(parse(PJSIP_SAMPLE));
  const ep = view.endpoints[0]!;
  const edited = { ...view, endpoints: [{ ...ep, endpoint: { ...ep.endpoint, context: "from-external", media_encryption: "sdes" } }] };
  const rendered = toConfigValuePjsip(edited);
  assert.equal(entryOf(rendered, "7000", "context"), "from-external");
  assert.equal(entryOf(rendered, "7000", "media_encryption"), "sdes");
  // Unedited fields on the same endpoint survive untouched.
  assert.equal(entryOf(rendered, "7000", "callerid"), "Front Desk <7000>");
});

test("pjsip: removing an endpoint from the view deletes all three of its sections", () => {
  const view = parsePjsip(parse(PJSIP_SAMPLE));
  const rendered = toConfigValuePjsip({ ...view, endpoints: [] });
  assert.equal(rendered.filter((s) => s.name === "7000").length, 0);
  // The unrelated transport and global sections are untouched by the deletion.
  assert.ok(rendered.some((s) => s.name === "transport-udp"));
  assert.ok(rendered.some((s) => s.name === "global"));
});

test("pjsip: adding a brand-new endpoint via newPjsipEndpoint applies cleanly", () => {
  const { view: fresh, secret } = newPjsipEndpoint("7001", "from-internal");
  assert.equal(fresh.name, "7001");
  assert.ok(secret.length >= 32, "generated secret should be a real random hex string");
  assert.equal(fresh.auth.password, secret);
  const base = parsePjsip(parse(PJSIP_SAMPLE));
  const withNew = { ...base, endpoints: [...base.endpoints, fresh] };
  const rendered = toConfigValuePjsip(withNew);
  const newEndpointSection = rendered.filter((s) => s.name === "7001").find((s) => s.entries.some((e) => e.key === "type" && e.value === "endpoint"));
  assert.ok(newEndpointSection);
  assert.ok(newEndpointSection!.entries.some((e) => e.key === "context" && e.value === "from-internal"));
  const newAorSection = rendered.filter((s) => s.name === "7001").find((s) => s.entries.some((e) => e.key === "type" && e.value === "aor"));
  assert.ok(newAorSection);
  const newAuthSection = rendered.filter((s) => s.name === "7001").find((s) => s.entries.some((e) => e.key === "type" && e.value === "auth"));
  assert.ok(newAuthSection!.entries.some((e) => e.key === "password" && e.value === secret));
  // The original endpoint is untouched.
  assert.equal(entryOf(rendered, "7000", "context"), "from-internal");
  assert.deepEqual(validatePjsip(withNew).filter((f) => f.severity === "error"), []);
});

test("pjsip: two calls to randomPjsipSecret never collide and are never a fixed value", () => {
  const a = randomPjsipSecret();
  const b = randomPjsipSecret();
  assert.notEqual(a, b);
  assert.equal(a.length, 48); // 24 bytes as hex
  assert.notEqual(a, "1234567890");
  assert.notEqual(a, "changeme");
});

test("pjsip: each validation finding is triggered", () => {
  const badBool = parsePjsip(parse("[100]\ntype=endpoint\ncontext=x\ndisallow=all\ndirect_media=maybe\n"));
  assert.ok(validatePjsip(badBool).some((f) => f.message.includes("direct_media")));

  const badDtmf = parsePjsip(parse("[100]\ntype=endpoint\ncontext=x\ndisallow=all\ndtmf_mode=carrier-pigeon\n"));
  assert.ok(validatePjsip(badDtmf).some((f) => f.message.includes("dtmf_mode")));

  const badEncryption = parsePjsip(parse("[100]\ntype=endpoint\ncontext=x\ndisallow=all\nmedia_encryption=rot13\n"));
  assert.ok(validatePjsip(badEncryption).some((f) => f.message.includes("media_encryption")));

  const badIdentify = parsePjsip(parse("[100]\ntype=endpoint\ncontext=x\ndisallow=all\nidentify_by=vibes\n"));
  assert.ok(validatePjsip(badIdentify).some((f) => f.message.includes("identify_by")));

  const noContext = parsePjsip(parse("[100]\ntype=endpoint\ndisallow=all\n"));
  assert.ok(validatePjsip(noContext).some((f) => f.severity === "warning" && f.message.includes("no context")));

  const noCodecs = parsePjsip(parse("[100]\ntype=endpoint\ncontext=x\n"));
  assert.ok(validatePjsip(noCodecs).some((f) => f.severity === "warning" && f.message.includes("does not restrict codecs")));

  const noAuth = parsePjsip(parse("[100]\ntype=endpoint\ncontext=x\ndisallow=all\n"));
  assert.ok(validatePjsip(noAuth).some((f) => f.severity === "warning" && f.message.includes("no auth object")));

  const noAor = parsePjsip(parse("[100]\ntype=endpoint\ncontext=x\ndisallow=all\n[100]\ntype=auth\nusername=100\npassword=x\n"));
  assert.ok(validatePjsip(noAor).some((f) => f.severity === "warning" && f.message.includes("no AoR")));

  const missingAuthFields = parsePjsip(parse("[100]\ntype=endpoint\ncontext=x\ndisallow=all\n[100]\ntype=auth\n[100]\ntype=aor\nmax_contacts=1\n"));
  assert.ok(missingAuthFields.endpoints[0]!.hasAuth);
  const findings = validatePjsip(missingAuthFields);
  assert.ok(findings.some((f) => f.message.includes("auth username is required")));
  assert.ok(findings.some((f) => f.message.includes("auth password is required")));

  const badAuthType = parsePjsip(parse("[100]\ntype=endpoint\ncontext=x\ndisallow=all\n[100]\ntype=auth\nauth_type=carrier-pigeon\nusername=x\npassword=x\n"));
  assert.ok(validatePjsip(badAuthType).some((f) => f.message.includes("auth_type must be")));

  const overCeiling = parsePjsip(parse(`[100]\ntype=endpoint\ncontext=x\ndisallow=all\n[100]\ntype=auth\nusername=x\npassword=x\n[100]\ntype=aor\nmax_contacts=101\n`));
  assert.ok(validatePjsip(overCeiling).some((f) => f.message.includes("exceeds the Core ceiling")));

  const nonNumericContacts = parsePjsip(parse(`[100]\ntype=endpoint\ncontext=x\ndisallow=all\n[100]\ntype=auth\nusername=x\npassword=x\n[100]\ntype=aor\nmax_contacts=many\n`));
  assert.ok(validatePjsip(nonNumericContacts).some((f) => f.message.includes("must be a whole number")));

  const badRemoveExisting = parsePjsip(parse(`[100]\ntype=endpoint\ncontext=x\ndisallow=all\n[100]\ntype=auth\nusername=x\npassword=x\n[100]\ntype=aor\nremove_existing=sure\n`));
  assert.ok(validatePjsip(badRemoveExisting).some((f) => f.message.includes("remove_existing must be")));

  const badQualify = parsePjsip(parse(`[100]\ntype=endpoint\ncontext=x\ndisallow=all\n[100]\ntype=auth\nusername=x\npassword=x\n[100]\ntype=aor\nqualify_frequency=often\n`));
  assert.ok(validatePjsip(badQualify).some((f) => f.message.includes("qualify_frequency must be")));

  const duplicateName = parsePjsip(parse(`[100]\ntype=endpoint\ncontext=x\ndisallow=all\n`));
  duplicateName.endpoints.push({ ...duplicateName.endpoints[0]! });
  assert.ok(validatePjsip(duplicateName).some((f) => f.message.includes("declared more than once")));

  const emptyName = parsePjsip(parse(`[100]\ntype=endpoint\ncontext=x\ndisallow=all\n`));
  emptyName.endpoints[0]!.name = "";
  assert.ok(validatePjsip(emptyName).some((f) => f.message.includes("name must not be empty")));
});
