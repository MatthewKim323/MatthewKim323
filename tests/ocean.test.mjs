import test from 'node:test';
import assert from 'node:assert/strict';
import { renderOcean, LOOP_SECONDS, COLS, ROWS } from '../src/ocean-core.mjs';

test('ocean frames are coherent printable ASCII with bounded color and opacity data', () => {
  for (const size of [{}, {cols:96,rows:40}, {cols:32,rows:16}]) {
    const frame = renderOcean(size);
    assert.equal(frame.lines.length, frame.rows);
    assert.equal(frame.tones.length, frame.cols * frame.rows);
    for (const line of frame.lines) { assert.equal(line.length, frame.cols); assert.match(line, /^[ -~]+$/); }
    for (let i=0;i<frame.tones.length;i++) {
      assert.ok(frame.tones[i]>=0 && frame.tones[i]<=16);
      assert.equal(frame.lines[Math.floor(i/frame.cols)][i%frame.cols]===' ',frame.tones[i]===0);
    }
  }
});
test('the ocean loops exactly, including negative time, without randomness or input mutation', () => {
  const options={time:2.5};const expected=renderOcean(options);
  assert.deepEqual(renderOcean(options),expected);
  assert.deepEqual(renderOcean({time:2.5+LOOP_SECONDS}),expected);
  assert.deepEqual(renderOcean({time:2.5-LOOP_SECONDS}),expected);
  assert.deepEqual(renderOcean({time:0}),renderOcean({time:LOOP_SECONDS}));
  assert.deepEqual(options,{time:2.5});
});
test('the moon holds its place while water animates beneath a quiet horizon', () => {
  const a=renderOcean(),b=renderOcean({time:4.5});
  const index=(x,y)=>Math.floor(y*ROWS)*COLS+Math.floor(x*COLS);
  assert.ok(a.tones[index(.65,.23)]>8);
  assert.equal(a.tones[index(.4,.51)],0);
  for(let row=7;row<20;row++)for(let col=86;col<100;col++) {
    const i=row*COLS+col;
    if(a.tones[i]>8)assert.equal(a.tones[i],b.tones[i]);
  }
  assert.notDeepEqual(a.tones.slice(31*COLS),b.tones.slice(31*COLS));
  const reflected=[...a.tones.slice(35*COLS)].filter(tone=>tone>8).length;
  assert.ok(reflected>250,'the moon has a substantial warm path across the sea');
});
test('bad external parameters cannot produce nonfinite data or unbounded allocations', () => {
  for(const input of [null,undefined,{}, {time:NaN,cols:Infinity,rows:-Infinity}])assert.deepEqual(renderOcean(input),renderOcean());
  const bounded=renderOcean({cols:1e9,rows:-1e9,time:1e20});
  assert.equal(bounded.cols,192);assert.equal(bounded.rows,16);
  assert.equal(renderOcean({cols:32.4,rows:16.4}).cols,32);
});
