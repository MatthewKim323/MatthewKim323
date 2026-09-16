import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { escapeXML, escapeMarkdown, summarizeActivity, validateProfile, validateActivity } from '../scripts/lib.mjs';

const profile = JSON.parse(await readFile(new URL('../data/profile.json', import.meta.url), 'utf8'));
const freshProfile = () => structuredClone(profile);
const activity = JSON.parse(await readFile(new URL('../data/activity.json', import.meta.url), 'utf8'));
const freshActivity = () => structuredClone(activity);

test('SVG text cannot inject markup', () => assert.equal(escapeXML('<img x="a&b">'), '&lt;img x=&quot;a&amp;b&quot;&gt;'));
test('activity totals and longest run include isolated and trailing days', () => {
  const days = [0,2,3,0,1,1,4].map((count,i) => ({date:`2026-09-0${i+1}`,count}));
  assert.deepEqual(summarizeActivity(days), {total:11,activeDays:5,longestStreak:3});
});
test('empty activity is represented honestly', () => assert.deepEqual(summarizeActivity([]), {total:0,activeDays:0,longestStreak:0}));
test('invalid GitHub data fails before replacing generated assets', () => {
  assert.throws(() => summarizeActivity([{date:'2026-09-01',count:-1}]));
  assert.throws(() => summarizeActivity([{date:'yesterday',count:1}]));
});
test('missing identity is a hard failure', () => assert.throws(() => validateProfile({})));

test('the checked-in content validates without mutation', () => {
  const data = freshProfile();
  assert.equal(validateProfile(data), data);
  assert.deepEqual(data, profile);
});

test('an explicitly unlinked project validates without inventing a destination', () => {
  const data = freshProfile();
  const unlinked = {
    id: 'private-prototype', name: 'private prototype', description: 'a project without a public destination.',
    url: '', stack: [], category: 'archive', featured: false,
  };
  data.projects.push(unlinked);
  const before = structuredClone(data);
  assert.equal(validateProfile(data), data);
  assert.deepEqual(data, before);
  assert.equal(data.projects.at(-1).url, '');
});

test('Markdown text cannot create headings, links, HTML, emphasis, or inline code', () => {
  assert.equal(escapeMarkdown('[click](https://evil.example)'), '\\[click\\]\\(https://evil\\.example\\)');
  assert.equal(escapeMarkdown('# title *bold* _italic_ `code` | cell'), '\\# title \\*bold\\* \\_italic\\_ \\`code\\` \\| cell');
  assert.equal(escapeMarkdown('<img src="x"> & \\'), '&lt;img src="x"&gt; &amp; \\\\');
  // Names with punctuation remain legitimate content when the generator escapes them.
  const data = freshProfile();
  data.projects[0].name = '[test] <prototype> & friends';
  assert.doesNotThrow(() => validateProfile(data));
});

test('project destinations reject injection delimiters and malformed URLs', () => {
  const values = [
    'https://example.com)\n\n<script>bad</script>',
    'https://example.com/(nested)', 'https://example.com/[nested]',
    'https://example.com/"quoted"', 'https://example.com/\\path',
    'https://example.com/a b', 'https://example.com/\u0000',
    'https://', 'https:/example.com', 'https://user:password@example.com',
    'http://example.com', 'javascript:alert(1)', 'data:text/html,bad',
    null, undefined, {},
  ];
  for (const value of values) {
    const data = freshProfile();
    data.projects[0].url = value;
    assert.throws(() => validateProfile(data), `accepted ${JSON.stringify(value)}`);
  }
  const data = freshProfile();
  data.projects[0].url = 'https://example.com/a%20b%28c%29?q=one&mode=two#section';
  assert.doesNotThrow(() => validateProfile(data));
});

test('contact destinations require valid HTTPS or one bare email address', () => {
  for (const value of ['mailto:', 'mailto:not-an-email', 'mailto:a@', 'mailto:a@example.com?body=hello', 'mailto:a@example.com#fragment', 'mailto:a@example.com,b@example.com', 'mailto:a,b@example.com', 'mailto:a%0d%0a@example.com', 'ftp://example.com', 'https://example.com\t']) {
    const data = freshProfile();
    data.links[0].url = value;
    assert.throws(() => validateProfile(data), `accepted ${value}`);
  }
  for (const value of [null, {label:'',url:'https://example.com'}, {label:'email',url:123}]) {
    const data = freshProfile();
    data.links[0] = value;
    assert.throws(() => validateProfile(data));
  }
  const data = freshProfile();
  data.links.push({label:'plus address',url:'mailto:hello+profile@example.com'});
  assert.doesNotThrow(() => validateProfile(data));
});

test('text fields reject control characters and string arrays reject non-text entries', () => {
  for (const key of ['name','handle','tagline','headline','email','awardsLabel']) {
    const data = freshProfile();
    data[key] += '\n';
    assert.throws(() => validateProfile(data), key);
  }
  for (const key of ['bio','focus','now']) {
    for (const value of [null, 42, {}, '', 'line\u2028break']) {
      const data = freshProfile();
      data[key] = [value];
      assert.throws(() => validateProfile(data), key);
    }
  }
  for (const key of ['name','description','award']) {
    const data = freshProfile();
    data.projects[0][key] = 'bad\u0000text';
    assert.throws(() => validateProfile(data), key);
  }
  const data = freshProfile();
  data.projects[0].stack = ['typescript', 42];
  assert.throws(() => validateProfile(data));
});

test('identity email cannot introduce a mailto query or a second address', () => {
  for (const value of ['a@example.com?subject=bad', 'a@example.com#fragment', 'a@example.com,b@example.com', 'a,b@example.com', 'a%0d%0a@example.com', 'a@@example.com', 'a@.example.com', 'a@example..com', '.a@example.com', 'a..b@example.com', 'a.@example.com']) {
    const data = freshProfile();
    data.email = value;
    assert.throws(() => validateProfile(data), value);
  }
});

test('project identity and featured category cannot disagree across renderers', () => {
  const mutations = [
    data => { data.projects = []; },
    data => { data.projects[0] = null; },
    data => { data.projects[1].id = data.projects[0].id; },
    data => { data.projects[0].id = 'invalid id'; },
    data => { data.projects[0].featured = 'true'; },
    data => { data.projects[0].featured = false; },
    data => { data.projects[0].category = 'unknown'; },
    data => { data.projects[0].category = 'archive'; },
  ];
  for (const mutate of mutations) {
    const data = freshProfile();
    mutate(data);
    assert.throws(() => validateProfile(data));
  }
  for (const value of [null, [], 'profile']) assert.throws(() => validateProfile(value));
});

test('contribution dates must exist, be ordered, and contain every day exactly once', () => {
  for (const value of ['2026-02-29','2026-02-30','2026-04-31','2026-13-01','2026-00-01','2026-01-00','2026-1-01',null,20260901]) {
    assert.throws(() => summarizeActivity([{date:value,count:1}]), String(value));
  }
  for (const dates of [
    ['2026-09-01','2026-09-15'],
    ['2026-09-01','2026-09-01'],
    ['2026-09-02','2026-09-01'],
  ]) assert.throws(() => summarizeActivity(dates.map(date => ({date,count:1}))));
  // Both leap day and year boundaries are real, consecutive UTC dates.
  assert.equal(summarizeActivity(['2024-02-28','2024-02-29','2024-03-01'].map(date => ({date,count:1}))).longestStreak, 3);
  assert.equal(summarizeActivity(['2025-12-31','2026-01-01'].map(date => ({date,count:1}))).longestStreak, 2);
});

test('weekday is checked against UTC whenever the source supplies it', () => {
  assert.doesNotThrow(() => summarizeActivity([{date:'2026-09-01',count:1,weekday:2}]));
  for (const weekday of [0,1,7,-1,null,'2',NaN]) {
    assert.throws(() => summarizeActivity([{date:'2026-09-01',count:1,weekday}]));
  }
});

test('contribution counts and totals cannot silently lose integer precision', () => {
  for (const count of [NaN,Infinity,'1',1.5,Number.MAX_SAFE_INTEGER+1]) assert.throws(() => summarizeActivity([{date:'2026-09-01',count}]));
  assert.throws(() => summarizeActivity([{date:'2026-09-01',count:Number.MAX_SAFE_INTEGER},{date:'2026-09-02',count:1}]));
  for (const value of [null,{},'days',[null]]) assert.throws(() => summarizeActivity(value));
});

test('the real padded GitHub snapshot validates without changing any data', () => {
  const data = freshActivity();
  assert.equal(validateActivity(data), data);
  assert.deepEqual(data, activity);
});

test('annual snapshots accept leap years and padded weeks instead of exactly 365 days', () => {
  for (const length of [365,366,368,373]) {
    const data = freshActivity();
    const start = Date.parse('2024-01-01T00:00:00Z');
    data.days = Array.from({length}, (_,i) => {
      const day = new Date(start + i * 86400000);
      return {date:day.toISOString().slice(0,10),weekday:day.getUTCDay(),count:1};
    });
    data.period = {from:data.days[0].date,to:data.days.at(-1).date};
    data.updatedOn = data.period.to;
    Object.assign(data,summarizeActivity(data.days));
    assert.doesNotThrow(() => validateActivity(data), `${length} days`);
  }
});

test('snapshot metadata, period and computed contribution totals must agree', () => {
  const mutations = [
    data => { data.schemaVersion = 2; },
    data => { data.source = ''; },
    data => { data.updatedOn = '2026-02-30'; },
    data => { data.updatedOn = '2020-01-01'; },
    data => { data.period = null; },
    data => { data.period.from = data.days[1].date; },
    data => { data.period.to = data.days.at(-2).date; },
    data => { data.total++; },
    data => { data.activeDays++; },
    data => { data.longestStreak++; },
    data => { data.publicRepositories = -1; },
    data => { data.publicRepositories = '30'; },
    data => { data.days = []; },
    data => { data.days.splice(20,1); },
    data => { data.days[0].weekday = 7; },
    data => { delete data.days[0].weekday; },
  ];
  for (const mutate of mutations) {
    const data = freshActivity();
    mutate(data);
    assert.throws(() => validateActivity(data));
  }
  for (const value of [null,[],{}]) assert.throws(() => validateActivity(value));
});

test('language percentages reflect byte totals with honest rounding tolerance', () => {
  const data = freshActivity();
  data.languages = ['one','two','three'].map(name => ({name,bytes:1,percent:33.3}));
  assert.doesNotThrow(() => validateActivity(data)); // 99.9% is correct after rounding.
  data.languages[0].percent = 34;
  assert.throws(() => validateActivity(data));
  data.languages = [{name:'only',bytes:100,percent:100}];
  assert.doesNotThrow(() => validateActivity(data));
  data.languages = [{name:'empty',bytes:0,percent:0}];
  assert.doesNotThrow(() => validateActivity(data));
  data.languages[0].percent = 0.01;
  assert.throws(() => validateActivity(data));
  data.languages = [];
  assert.doesNotThrow(() => validateActivity(data));
});

test('language metadata rejects duplicate names, unsorted bytes and malformed numbers', () => {
  const mutations = [
    data => { data.languages = null; },
    data => { data.languages[0] = null; },
    data => { data.languages[0].name = ''; },
    data => { data.languages[0].name = 'bad\nname'; },
    data => { data.languages[1].name = data.languages[0].name; },
    data => { data.languages[0].bytes = -1; },
    data => { data.languages[0].bytes = 1.5; },
    data => { data.languages[0].percent = NaN; },
    data => { data.languages[0].percent = Infinity; },
    data => { data.languages[0].percent = '61.3'; },
    data => { data.languages[0].percent = -1; },
    data => { data.languages[0].percent = 101; },
    data => { data.languages.reverse(); },
    data => { data.languages[0].percent = 0; },
  ];
  for (const mutate of mutations) {
    const data = freshActivity();
    mutate(data);
    assert.throws(() => validateActivity(data));
  }
});
