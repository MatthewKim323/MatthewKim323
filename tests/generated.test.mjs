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
  assert.doesNotMatch(readme,/tools i build with|under the hood|One character engine|drawn from 3D geometry/);
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
    if(name.startsWith('heading-')||name.startsWith('bot-'))assert.doesNotMatch(body,/>\s*(?:0\d|MATT\s*\/\s*001)\s*<\/text>/,name);
  }
});
test('animation frame intervals cover exactly one visible pose without a seam',async()=>{
  const body=await readFile(path.join(root,'assets/bot-dark.svg'),'utf8');
  const frames=[...body.matchAll(/values="([01;]+)" keyTimes="([\d.;]+)" dur="12s"/g)].map(m=>({values:m[1].split(';').map(Number),times:m[2].split(';').map(Number)}));
  assert.equal(frames.length,96);
  for(let i=0;i<2000;i++){
    const t=i/2000;
    const visible=frames.reduce((sum,f)=>{let index=f.times.findLastIndex(time=>time<=t);return sum+f.values[index];},0);
    assert.equal(visible,1,`time=${t}`);
  }
});
