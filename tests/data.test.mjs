import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeXML, summarizeActivity, validateProfile } from '../scripts/lib.mjs';

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
