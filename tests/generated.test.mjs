import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { root, readJSON, validateProfile, summarizeActivity } from '../scripts/lib.mjs';

test('selected work and archive remain in the README while tool listings stay omitted',async()=>{
  const p=validateProfile(await readJSON('data/profile.json'));
  const readme=await readFile(path.join(root,'README.md'),'utf8');
  for(const project of p.projects.filter(project=>project.category!=='tool'))assert.ok(readme.includes(project.url||project.name),project.id);
  for(const project of p.projects.filter(project=>project.category==='tool'))assert.ok(!readme.includes(project.url),project.id);
  assert.doesNotMatch(readme,/tools i build with|under the hood|One character engine|drawn from 3D geometry|meet the bot|bot-dark/);
  assert.ok(readme.includes('assets/ocean-dark.svg'));
  assert.ok(!readme.includes(']()'));
  assert.equal(p.projects.length,22);
});
test('committed calendar is consecutive and reconciles with the display metrics',async()=>{
  const activity=await readJSON('data/activity.json');
  assert.deepEqual(summarizeActivity(activity.days),{total:activity.total,activeDays:activity.activeDays,longestStreak:activity.longestStreak});
  activity.days.forEach((day,i)=>{
    assert.equal(new Date(day.date+'T00:00:00Z').getUTCDay(),day.weekday);
    if(i)assert.equal(Date.parse(day.date)-Date.parse(activity.days[i-1].date),86400000);
  });
});
test('SVGs are self-contained, accessible, and support reduced motion',async()=>{
  const names=(await readdir(path.join(root,'assets'))).filter(n=>n.endsWith('.svg'));
  assert.equal(names.length,14);
  for(const name of names){
    const body=await readFile(path.join(root,'assets',name),'utf8');
    assert.ok(body.includes('<title id="title">'),name);
    assert.ok(!/<script|onload=|javascript:|https?:\/\/(?!www\.w3\.org)/i.test(body),name);
    assert.ok(body.includes('data:font/woff2;base64,'),name);
    assert.ok(body.includes('prefers-reduced-motion:reduce'),name);
    assert.ok(Buffer.byteLength(body)<1_000_000,`${name} budget`);
    if(name.startsWith('heading-')||name.startsWith('ocean-'))assert.doesNotMatch(body,/>\s*(?:0\d|MATT\s*\/\s*001)\s*<\/text>/,name);
  }
});
test('ocean brightness curves close the loop and the reduced-motion poster matches the still asset',async()=>{
  for(const theme of ['dark','light']){
    const body=await readFile(path.join(root,`assets/ocean-${theme}.svg`),'utf8');
    const curves=[...body.matchAll(/<animate attributeName="opacity" values="([\d.;]+)" dur="18s" repeatCount="indefinite" calcMode="linear"/g)].map(m=>m[1].split(';').map(Number));
    assert.ok(curves.length>500 && curves.length<2000);
    for(const curve of curves){
      assert.equal(curve.length,25);
      assert.equal(curve[0],curve.at(-1));
      assert.ok(curve.every(value=>Number.isFinite(value)&&value>=0&&value<=1));
      assert.ok(curve.some(value=>value!==curve[0]));
    }
    const still=await readFile(path.join(root,`assets/ocean-still-${theme}.svg`),'utf8');
    const poster=body.match(/<g class="poster">([\s\S]*)<\/g><\/svg>/)[1];
    assert.equal(poster,still.match(/<\/style>([\s\S]*)<\/svg>/)[1]);
    assert.doesNotMatch(still,/<animate/);
    assert.match(body,/width="760" height="380"/);
  }
});
