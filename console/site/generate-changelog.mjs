import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const tags = execFileSync('git', ['tag'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
const showRef = execFileSync('git', ['show-ref', '--dereference', '--tags'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
const commits = new Map();
for (const line of showRef) {
  const [sha, ref] = line.split(' ');
  const annotated = ref.endsWith('^{}');
  const name = annotated ? ref.slice('refs/tags/'.length, -3) : ref.slice('refs/tags/'.length);
  if (annotated || !commits.has(name)) commits.set(name, sha);
}
const metadata = execFileSync('git', ['for-each-ref', 'refs/tags', '--format=%(refname:short)\t%(creatordate:iso-strict)\t%(subject)'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
const records = metadata.map(line => {
  const [version, date, ...summary] = line.split('\t');
  return { version, date: date.slice(0, 10), category: version.startsWith('ding-pbx-console-') ? 'Release' : 'Upstream tag', summary: summary.join('\t').slice(0, 240), commit: commits.get(version) };
});
if (records.length !== tags.length || records.some(record => !/^[0-9a-f]{40}$/.test(record.commit || '') || !/^\d{4}-\d{2}-\d{2}$/.test(record.date))) throw new Error('Every tag must produce a dated record with a full commit SHA.');
const expectedReleases = tags.filter(tag => tag.startsWith('ding-pbx-console-')).length;
if (records.filter(record => record.category === 'Release').length !== expectedReleases) throw new Error(`Expected ${expectedReleases} product release records.`);
await writeFile(new URL('./changelog-data.js', import.meta.url), `window.DING_SITE_CHANGELOG=${JSON.stringify(records)};\n`, 'utf8');
console.log(`Generated ${records.length} tag records, including ${expectedReleases} product releases.`);
