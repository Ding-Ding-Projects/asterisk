# Every reading, run against a live Asterisk

Until this pass, no reading in this console had ever been taken from a running Asterisk. Every
parser was written against a format string in this checkout's own C sources and tested against a
fixture built from that string, which is a real discipline and a different claim: it says the
parser matches what the source says Asterisk prints, not that it matches what Asterisk printed.

This is the second claim, measured.

Ledger: [`release/evidence/live-exchange/readings.json`](../../release/evidence/live-exchange/readings.json).
Captures: `release/evidence/live-exchange/readings/`.
Harness: [`scripts/live-readings.mjs`](../../scripts/live-readings.mjs).

## What ran

The target is the `ding-pbx-console` WSL2 distribution the console provisions from its own
bundled root filesystem — an exchange this console created and may destroy. Nothing here writes
to an exchange anybody depends on; that remains a separate, annotated roadmap item needing an
authorization only the repository owner can give.

1. **Baseline.** All 63 allowlisted read-only command lines, plus the one object command, run
   through `LocalAsteriskCliGateway` over `NodeProcessExecutor` — the production read path, not a
   re-implementation of it. Every stdout committed verbatim.
2. **Population.** The exchange as provisioned has no configured objects at all: every shipped
   sample file is comment-only, so twelve readings would otherwise have been verified against
   `No objects found.`, which proves the command runs and proves nothing about the parser. A
   fixture was written through the console's own `StructuredConfigPlanner` → `ConfigTransaction`
   → `WslConfigTransport` path across seven resources, and Asterisk reloaded.
3. **Populated capture.** Every command run again. A command whose bytes were unchanged records
   `sameAsBaseline` instead of committing a second identical file.
4. **Restore.** Every backup handle the transaction returned rolled back, then each of the seven
   files hashed on the target again. **All seven came back byte-identical.**

Beside the parsers, all **14 gateway-backed production readers** were driven exactly as a screen
calls them, and the `CapabilityResult` each returned is recorded. That is the half a parser test
cannot reach: a correct parser behind a reader that reports `unavailable` is a blank screen, and
only driving the reader tells the two apart.

## Result

**27 of 27 readings parse the live target's real output. 23 of 27 return rows once populated.**

| Reading | Command | Parser | Baseline | Populated | Rows are |
| --- | --- | --- | --- | --- | --- |
| `channels` | `core show channels concise` | parseChannels | 0 | 0 | live channels |
| `endpoints` | `pjsip show endpoints` | parseEndpoints | 0 | 1 | endpoints |
| `contacts` | `pjsip show contacts` | parseContacts | 0 | 1 | contacts |
| `registrations` | `pjsip show registrations` | parseRegistrations | 0 | 1 | outbound registrations |
| `auths` | `pjsip show auths` | parsePjsipAuths | 0 | 1 | auth objects |
| `channelStats` | `pjsip show channelstats` | parseChannelStats | 0 | 0 | per-channel codec rows |
| `endpointDetail` | `pjsip show endpoint ding-live-probe` | parseEndpointDetail | — | 4 | transport and codec values |
| `queues` | `queue show` | parseQueues | 0 | 1 | queues |
| `modules` | `module show` | parseModules | 255 | 255 | modules |
| `iaxPeers` | `iax2 show peers` | parseIax2Peers | 0 | 1 | IAX2 peers |
| `iaxRegistrations` | `iax2 show registry` | parseIax2Registry | 0 | 1 | IAX2 registrations |
| `uptimeSeconds` | `core show uptime seconds` | parseUptimeSeconds | 1 | 1 | seconds |
| `dialplan` | `dialplan show` | parseDialplanGraph | 101 | 101 | dialplan steps |
| `voicemailUsers` | `voicemail show users` | parseVoicemailUsers | 2 | 3 | mailboxes |
| `voicemailZones` | `voicemail show zones` | parseVoicemailZones | 5 | 5 | zones |
| `confbridgeRooms` | `confbridge list` | parseConfbridgeList | 0 | 0 | running conferences |
| `mohClasses` | `moh show classes` | parseMohClasses | 1 | 2 | music classes |
| `codecs` | `core show codecs` | parseCodecs | 46 | 46 | codecs |
| `translations` | `core show translation` | parseTranslations | 18 | 18 | translation rows |
| `aclRules` | `acl show` | parseAclRules | 0 | 1 | named ACLs |
| `cdrStatus` | `cdr show status` | parseCdrStatus | 10 | 10 | settings and backends |
| `loggerChannels` | `logger show channels` | parseLoggerChannels | 1 | 1 | logger channels |
| `managerSettings` | `manager show settings` | parseManagerSettings | 15 | 15 | settings |
| `managerUsers` | `manager show users` | parseManagerUsers | 0 | 1 | manager users |
| `ariApps` | `ari show apps` | parseAriApps | 0 | 0 | connected REST applications |
| `sysinfo` | `core show sysinfo` | parseSysinfo | 7 | 7 | system values |
| `uptime` | `core show uptime seconds` | parseUptime | 2 | 2 | uptime values |

The four that stayed empty are exactly the four this harness declares it cannot populate, and the
reason is recorded against each rather than left as an unexplained zero: a channel and a channel
statistic exist only while a call is up; `confbridge list` prints conferences that are *running*,
not rooms that are configured; and an ARI application appears when a client connects, not when a
file says so. `--check` refuses any *other* reading landing in that list, so a reading that
quietly stopped returning rows cannot pass as a documented limitation.

**11 of the 63 commands are not built into this target** and the console handles all eleven
correctly: `AsteriskReadings` diverts on `No such command` and reports the subsystem as
unavailable rather than parsing the refusal into an empty table. Those eleven are the three
`dahdi show`, `odbc show`, both `dundi show`, all three `stir_shaken show`, and both `geoloc`.

## Three things it found

**1. The write path cannot represent a file that repeats a section name — high.** Found by the
fixture's first attempt, which added a second `[general]` to `iax.conf` and was refused with
`Post-read mismatch for /etc/asterisk/iax.conf`. Measured directly afterwards: an **unchanged**
round trip of

```
[6001]                     [6001]
type=endpoint              type=aor
context=default            max_contacts=1
allow=ulaw
```

— the pattern nearly every real `pjsip.conf` uses — renders `type = endpoint` as `type = aor`,
deletes `context` and `allow`, and inserts `max_contacts` into the first section. Parsed section
entry counts go from `[3, 2]` to `[2, 2]`. The cause is one line: `renderConfigOver` builds its
desired map with `wanted.set(section.name, section.entries)`, so the last section of a repeated
name overwrites every earlier one.

It **fails safe**: `ConfigTransaction` compares the parsed post-read against the desired value,
finds them unequal, and rolls back. What it costs is that such a resource cannot be written at
all, and the operator is told `Post-read mismatch`, which names nothing about repeated sections.
The fixture routes around it — the aor is `ding-live-probe-aor`, and `mergeFixture` folds the
`register =>` line into the existing `[general]` rather than adding a second one — and refuses
outright, by name, rather than discovering it three steps later.

> **Repaired since this run, in a change of its own.** `renderConfigOver` now groups the desired
> value into one ordered list of entry-lists per name and matches the *n*th `[name]` in the file
> against the *n*th desired section of that name. The exact text above round-trips byte for byte,
> entry counts stay `[3, 2]`, and editing, adding to, dropping and appending an occurrence each
> reach the occurrence that asked for it — held by six tests in
> `tests/control-plane/config-round-trip.test.ts`, each proven by breaking the repair four ways,
> one at a time. Occurrence matching is positional, so which block's *comments* travel with a
> surviving section is decided by position, exactly as it already was for a repeated key.
>
> The finding above is left as it was written, because it is what this run measured and the run
> is not being re-taken. Two things this repair does **not** claim: nothing here has been run
> against a live Asterisk, so the repair is proved against fixtures and this checkout's own
> round-trip contract and no further; and the fixture still avoids the shape, because the
> committed captures were taken under that constraint and widening it without re-running against
> a target would describe a run that never happened.

**2. The voicemail reading drops a mailbox and nothing says so — medium.** The live target's own
trailer said **4 voicemail users configured**; the reading produced **3**, and the Voicemail
screen renders exactly those three. The missing row is the shipped sample's
`myaliases  1234@devices`, whose mailbox overruns the five-character field of a fixed-width
table. `parseVoicemailUsers` drops such a row deliberately — misassigning its columns would be
worse — and says so in its own comment. What is missing is that the parser hands back a `total`
beside the list and `readings.ts` never reads it, so an incomplete list is indistinguishable from
a complete one. `parseManagerUsers` carries the same `total` beside the same kind of list into
the same screen.

This is also why the fixture's voicemail context is `dingvm` and not `ding-live-probe-vm`: an
eighteen-character context would have added a mailbox the reading could not see, and the fixture
would have proved nothing about parsing a new row.

> **Repaired since this run, in a change of its own.** `parseVoicemailUsers` now hands back
> `dropped` beside `users` and `total` -- every data line it refused, verbatim -- and both screens
> read the count they were throwing away. The Voicemail screen says *1 of the 4 voicemail users
> on this target is missing from this table*, names the mechanism, and quotes the line it could
> not read; the AMI screen says the same about `manager show users` from its trailer alone,
> because that parser cannot name the line it lost and the count is the whole honest signal it
> has. A reading that never answered now names itself too, on both screens: each edits a
> configuration file, so `note()` returns from its configuration branch and never reaches the
> reading-failure report at the bottom of it, leaving an empty table whose only sentence was
> about the file. The AMI screen acquired that same shape the day it was given a real
> `manager.conf` to read, which is why both of its commands are checked rather than only the one
> this item named. Nine render tests in `tests/ui/dropped-rows-wired.test.tsx` read those
> sentences out of the real `App`'s markup rather than out of the note builder, because a value
> computed and never rendered is exactly the defect being repaired.
>
> **The parse half of the ledger beside this article moved, and how it moved is worth stating.**
> Adding a field to what `parseVoicemailUsers` returns changes the canonical JSON it hashes to,
> so `--check` went red on both phases -- correctly: the recorded hash no longer described what
> the parser produced. It was re-derived from the *same committed captures* by a new `--reparse`
> mode rather than by editing four hashes into JSON by hand. `--reparse` touches only what a
> parser decides (`parsedSha256`, `rows`, `summary`, `threw`), prints every field it moves, and
> refuses to write at all when a capture no longer hashes to what the ledger recorded, so it
> cannot launder an altered capture into a fresh-looking record. Four fields moved: two hashes
> and two summaries, each gaining the `myaliases  1234@devices` line. **No capture was retaken
> and no live-half field was touched** -- the commit, the exchange, the fixture, the restore and
> every production-reader result are exactly as that run recorded them, and a test asserts it.
>
> The finding above is left as it was written, because it is what this run measured and the run
> is not being re-taken. Two things this repair does **not** claim: nothing here ran against a
> live Asterisk, so it is proved against the committed captures, fixtures and render tests and no
> further; and the note reports a shortfall against the target's own trailer wherever there is
> one, so a reading whose target printed no trailer falls back to counting the lines the parser
> refused -- the best estimate available rather than the same measurement.

**3. `media cache show` is allowlisted without the argument it needs — medium.** The live target
answered `Usage: media cache show <uri>` with exit code 0. `AsteriskReadings` diverts only on
`No such command` and `Unable to connect to remote asterisk`, so a usage line reaches the CLI
screen as a successful reading. No parser consumes this command today, so nothing is currently
mis-parsed; what is wrong is that the allowlist carries a line that can never produce one.

> **Repaired since this run, in a change of its own, and the fix was neither of the two the
> roadmap offered.** The entry was not a command missing an argument; it was the *wrong command*.
> `main/media_cache.c` registers two CLI entries whose names are prefixes of one another: line 528
> is the singular `media cache show`, which refuses any `a->argc != 4` and reads its subject from
> `a->argv[3]`, and line 477 is `media cache show all`, the container listing that takes no
> argument at all. The allowlist wanted the container and carried the singular. It now carries
> `media cache show all`, `parseMediaCacheItems` reads it, the dispatcher takes it for the `moh`
> view beside the classes, and the Music on Hold screen says what is in the cache — or that it is
> empty, which is a different fact from unread and had to be sayable separately.
>
> **The singular is deliberately not a second object command.** It would fit the mechanism, and it
> prints per-item metadata (`ext`, `content-type`, `__actual_expires`) the listing does not. It is
> left out because its object id is a URI: `OBJECT_ID` admits no `:` and no `/`, and widening the
> one check between a target-supplied string and an `asterisk -rx` argument, for metadata no screen
> displays, is a bad trade. A test fails if that decision is ever reversed quietly.
>
> **It has its own live captures rather than being backdated into this run.** The command was run
> against the same disposable exchange through `LocalAsteriskCliGateway` over
> `NodeProcessExecutor`, empty and populated, and the cache was put back — recorded in
> `commandsAllowlistedAfterThisRun`, which is checked exactly as a phase capture is (a committed
> file, a hash that still matches, a parse that still digests the same) and additionally refuses a
> row for a command the allowlist no longer carries. **Nothing in the phases, the fixture, the
> restore or the production-reader records moved**, because those bytes came from a different run
> against a different exchange state, and merging the two would describe a run that never happened.
>
> Populating it needed the target to *fetch* something: the media cache holds what Asterisk
> retrieved at run time, so no configuration file can fill it, and `media cache create` is not a
> route either — it needs the scheme backend to implement a create wizard, and
> `res_http_media_cache` implements only retrieval, so it answers `Unable to create`. The harness
> serves one file over loopback HTTP and asks the target to refresh two URIs, one inside the
> format's 40-column pad and one well past it, which is what proves the parser rather than asserts
> it: `%-40s` has no precision, so it pads and never truncates, and the long URI arrives in full
> with no padding beside a short one padded out to 40.
>
> **Two things this repair found that are worth more than the repair.** The first
> `--capture-added` run wrote three byte-identical captures of an empty listing and **passed its
> own restore proof**, because after-restore trivially equals before-populate when the populate did
> nothing at all. The cause was that `$name` does not survive the trip to the target: something
> between `spawn` (with `shell: false`) and the Linux side of `wsl.exe` expands a `$`-sigil
> identifier and replaces it with nothing, even inside a quoted heredoc — `my $body = 1; my $fh;
> local $/;` arrives as `my  = 1; my ; local $/;`, with `$/` surviving only because it is not an
> identifier. Nothing reports it: the file is written, the shell exits 0, and the failure surfaces
> later as a perl syntax error nobody is looking at. The payload is base64 now, which has no `$` in
> it for any layer to find. And the harness refuses a populate that changed nothing, because a
> proof whose condition cannot be violated is not a proof.
>
> The finding above is left as it was written, because it is what this run measured and the run is
> not being re-taken.

All three are recorded on the roadmap. None is repaired here: this pass verifies readings, and
closing a write-path or screen defect inside it would be a change nobody reviewing this item
would be looking for.

## One thing worth knowing about `dialplan show`

The baseline `dialplan show` disagreed with `/etc/asterisk/extensions.conf` as it stood on the
target. The file contained `[dundi-e164]` at line 287, `[iax2-trunk]` at 306 and `[trunkint]` at
318; the running Asterisk had none of them, because it had not reloaded `pbx_config` since an
earlier session restored that file. The harness reload brought the two into agreement, which is
why `dialplan show` is the one command still differing after the restore — the file is identical,
and it is the *loaded state* that moved.

That is a fact about readings in general and not about this run: **`dialplan show` reads what is
loaded, not what is on disk**, and the console cannot presently tell an operator when the two have
diverged. The baseline capture is a genuine reading of a dialplan that no configuration file on
that target described.

## Capture records

| State | Record | Run from commit | Coverage | Result |
| --- | --- | --- | --- | --- |
| Every allowlisted command against the exchange as provisioned | `release/evidence/live-exchange/readings/baseline/` and `readings.json` at `phases.baseline.commands` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 64 command lines, one capture each | 52 returned data, 11 are not built into this target, 1 answered with a usage line |
| Every reading parsed from those exact bytes | `readings.json` at `phases.baseline.readings` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 27 of 27 readings | 26 parsed; `endpointDetail` threw, and the production reader turned that into an honest `unavailable` in the target's own words |
| Every gateway-backed reader driven as a screen calls it | `readings.json` at `phases.baseline.productionReaders` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 14 of 14 readers | 13 `available`, 1 `unavailable` naming the endpoint that did not exist yet |
| The fixture written through the console's own transaction path | `readings.json` at `fixture` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 7 resources, 35 backup/stage/validate/apply/post-read actions | `applied`, "Configuration applied and verified" |
| Every allowlisted command against the populated exchange | `release/evidence/live-exchange/readings/populated/` and `readings.json` at `phases.populated.commands` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 64 command lines; 16 changed and were captured again, 48 recorded `sameAsBaseline` | 23 of 27 readings returned real rows |
| Every gateway-backed reader against the populated exchange | `readings.json` at `phases.populated.productionReaders` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 14 of 14 readers | 14 of 14 `available` |
| The exchange put back | `readings.json` at `restore` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 7 resources hashed on the target before and after | all 7 byte-identical; 4 commands still differ and every one has a recorded reason |

## Capture method

Every command was run by `LocalAsteriskCliGateway` over `NodeProcessExecutor` — the production
read path, imported from `control-plane/`, not a re-implementation of it — against the
`ding-pbx-console` WSL2 distribution the console provisions from its own bundled root filesystem.
Every stdout is committed exactly as the console received it, which means after the executor's own
redaction: a capture is what the console sees rather than what Asterisk printed, and
`redactedMarkers` counts each place that mattered.

The fixture went through `StructuredConfigPlanner` → `ConfigTransaction` → `WslConfigTransport`,
so it is the console writing to the exchange rather than a shell heredoc. The one command that is
**not** a production path is `asterisk -rx "core reload"`: the control plane has no reload action,
which is a recorded roadmap gap, so the harness issues it directly and the ledger says so.

Re-run the live half with `npx tsx console/scripts/live-readings.mjs --capture`. Re-derive the
parse half from committed bytes, on any machine and against no target, with
`npx tsx console/scripts/live-readings.mjs --check`, which `npm test` runs.

The captures are pinned to LF in `.gitattributes`. Without that, `core.autocrlf=true` would check
them out as CRLF on a fresh Windows clone, changing every recorded hash and shifting every
fixed-width column the voicemail and IAX2 parsers slice by — a red gate with nothing wrong with
the evidence, and no way for a reader to tell that from tampering. Proven by deleting the capture
directory, checking it out again, and re-running `--check`: zero carriage returns, still green.

## Verification boundary

`--check` re-derives the **parse** half. It reads every committed capture back, re-hashes it,
re-runs the production parser over it, and requires the canonical JSON to hash to exactly what was
recorded — so a parser that moves after a capture turns the suite red rather than leaving a stale
claim standing. It requires every allowlisted command to have a record, so a command added later
cannot be silently unverified while the ledger goes on saying all 63 were covered. And it
re-derives the ledger's headline counts from the ledger's own rows, so a count that stopped
matching its rows cannot keep reading as a verification.

It **cannot** re-derive the gateway, the executor, the reload or the restore. Those ran once,
against one exchange, at one moment.

Four readings were never exercised with rows, because no configuration file can create what they
read: a live channel, a per-channel codec statistic, a *running* conference, or a connected REST
application. Their zeroes are the target being truthful and are labelled as such rather than left
unexplained.

Nothing here writes to an exchange anybody depends on. The target is one this console created and
may destroy, and a write to a production exchange needs an authorization only the repository owner
can give — still open on the roadmap.

One safety property this happens to have measured rather than assumed. The fixture configured a
real `password=` on a PJSIP auth object and a real `secret=` on a manager user, and **that value
appears in none of the 80 committed captures**, from any of the 64 command lines, in either phase.
The console's claim that its read-only allowlist prints no credential — the reason `pjsip show
auth <id>` is kept out of it while `pjsip show auths` is in — now has a live exchange behind it
rather than only a reading of Asterisk's sources. The executor's redactor fired zero times across
the whole run, so nothing was hidden on the way past either.

Three defects were found and none was repaired here. This pass verifies readings; closing a
write-path or screen defect inside it would be a change nobody reviewing this item would be
looking for.

## Guards

`tests/live/live-readings.test.mjs` (26 tests) and `scripts/negative-live-readings.mjs`
(12 breaks, each planted alone, each watched go red, each restored green).

The five tests added after this run guard `--reparse`, the mode that re-derives the parse half
from the committed captures: that it is a no-op against a ledger already matching its bytes, that
it repairs a hand-damaged hash and names exactly what it moved, that it refuses to write when a
capture no longer hashes to what was recorded, that it leaves every live-half field alone, and
that the ledger still names the exact voicemail line the reading could not turn into a row.
`scripts/negative-dropped-rows.mjs` holds the repair those describe with 18 further breaks, two
of them aimed at `--reparse` itself.

The media cache repair adds `tests/control-plane/media-cache.test.ts` (12 tests, run against the
committed live captures rather than against fixtures), `tests/ui/media-cache-wired.test.tsx` (7,
which render the real `App` on the Music on Hold screen and read the sentence out of its markup,
because a reading computed and never rendered is exactly the defect being repaired),
`tests/live/live-readings-added.test.mjs` (13, mostly refusals — a mechanism that satisfies a
coverage check is a mechanism that can become a hole in it), and
`scripts/negative-media-cache.mjs` with 18 further breaks, each planted alone, each watched go
red, each restored green.

`tests/scripts/test-suites-are-wired.test.mjs` gained an assertion of its own at the same time,
one layer over all of these: every `scripts/negative-*.mjs` must actually appear in the `npm test`
chain. It is derived from the filesystem for the same reason its neighbour is — a hand-written
list cannot catch a script that was never added to the list, which is the exact failure it exists
to stop. Proved by unchaining the new script and watching it name it.

Two of those eighteen stayed green when first planted, and both found something real rather than
merely needing rewording.

The first made the AMI screen claim a shortfall for a reading that had failed, and nothing went
red, because `note()` returned the failure before the shortfall could be reached: the break was
unreachable rather than unwatched. **The property genuinely unguarded was the one beside it** --
a screen fed by two commands, one failing while the other comes back a row light, reported
whichever sentence came first and dropped the other. Both are said now.

The second stayed green because of the assertion rather than the code. Three negative needles
read `missing from this table`, and once a failed reading had a sentence of its own that phrase
belonged to both, so the needle could no longer fail for the reason it was written for. Tightened
to `on this target is missing from this table`, it then missed a *plural* fabricated claim, since
that phrase inflects. All three are anchored on the uninflected `<unit>s on this target` now.
**A negative assertion whose needle drifted onto neighbouring prose is the quietest kind of dead
guard there is**, and only planting the exact lie it was written to catch shows it up.

Two of those twelve had to be rewritten, and the reason is worth recording. Commenting out
`if (!recorded.has(command))` inside the coverage check left everything green — not because
nothing watches that line, but because every command *did* have a capture, so the condition it
guards was not violated and there was nothing to find. **A break that removes a guard whose
condition currently holds can never go red, and it reads exactly like a guard that is watched.**
Both were rewritten to violate the condition instead — a ledger missing a command, and a recorded
hash that no longer matches the bytes on disk — and both then went red.

## Suggested articles

- [The first approved write plan against a live exchange](../../release/evidence/live-exchange/write-plan.json) — the pass that proved the write path this fixture rides on, and the two defects it found.
- [What `statusCell`'s remaining pixels are](statuscell-text-pixels.md) — the same discipline applied to a rendered frame rather than to a reading.
- [The per-destination Material Design 3 audit](design-parity-material-audit.md) — the other place a machine is allowed to write a verdict, and what constrains it.
