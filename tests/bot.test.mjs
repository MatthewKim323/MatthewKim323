import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAscii, idlePose, advanceSpring, CHARACTER_ASPECT, IDLE_PERIOD } from '../src/bot-core.mjs';

test('frame has exact ASCII dimensions and coherent palette data at desktop and mobile sizes', () => {
  for (const [cols, rows] of [[96, 50], [64, 34], [48, 26]]) {
    const frame = renderAscii({ cols, rows });
    assert.equal(frame.lines.length, rows);
    assert.equal(frame.tones.length, cols * rows);
    assert.ok(frame.tones instanceof Uint8Array);
    let occupied = 0;
    for (let row = 0; row < rows; row++) {
      assert.equal(frame.lines[row].length, cols);
      assert.match(frame.lines[row], /^[\x20-\x7e]+$/);
      for (let col = 0; col < cols; col++) {
        const tone = frame.tones[row * cols + col];
        assert.ok(tone >= 0 && tone <= 4);
        assert.equal(frame.lines[row][col] === ' ', tone === 0);
        if (tone) occupied++;
      }
    }
    assert.ok(occupied > cols * rows * 0.23, 'silhouette must be substantial');
    assert.ok(occupied < cols * rows * 0.75, 'silhouette must retain breathing room');
    assert.ok(frame.tones.includes(4), 'eyes remain legible at mobile resolution');
  }
  assert.equal(CHARACTER_ASPECT, 0.5);
});

test('pose changes true geometry while eye movement stays on the soft orb face', () => {
  const neutral = renderAscii();
  const turning = renderAscii({ yaw: 0.5, pitch: -0.2 });
  const looking = renderAscii({ gazeX: 1, gazeY: 1 });
  assert.notDeepEqual(neutral.lines, turning.lines);
  assert.notDeepEqual(neutral.tones.map(x => x > 0 ? 1 : 0), turning.tones.map(x => x > 0 ? 1 : 0));
  assert.notDeepEqual(neutral.lines, looking.lines);
  assert.deepEqual(neutral.tones.map(x => x > 0 ? 1 : 0), looking.tones.map(x => x > 0 ? 1 : 0));
  const closed = renderAscii({ blink: 1 });
  assert.ok(closed.tones.filter(x => x === 4).length < neutral.tones.filter(x => x === 4).length);
});

test('the companion has exactly two substantial capsule eyes at desktop and mobile sizes', () => {
  for (const [cols, rows] of [[96, 50], [64, 34], [48, 26]]) {
    const frame = renderAscii({ cols, rows });
    const unseen = new Set([...frame.tones.keys()].filter(index => frame.tones[index] === 4));
    const eyes = [];
    while (unseen.size) {
      const seed = unseen.values().next().value;
      const pending = [seed], component = [];
      unseen.delete(seed);
      while (pending.length) {
        const index = pending.pop();
        component.push(index);
        const x = index % cols, y = Math.floor(index / cols);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (x + dx < 0 || x + dx >= cols || y + dy < 0 || y + dy >= rows) continue;
            const neighbor = (y + dy) * cols + x + dx;
            if (unseen.delete(neighbor)) pending.push(neighbor);
          }
        }
      }
      eyes.push(component);
    }
    assert.equal(eyes.length, 2, 'two readable, separate eyes');
    for (const eye of eyes) assert.ok(eye.length >= 8, 'capsules must survive downsampling');
  }
});

test('rendering is deterministic and sanitizes untrusted dimensions and pose values', () => {
  assert.deepEqual(renderAscii({ ...idlePose(3.1) }), renderAscii({ ...idlePose(3.1) }));
  assert.deepEqual(renderAscii(null), renderAscii());
  const invalid = renderAscii({ cols: NaN, rows: Infinity, yaw: Infinity, pitch: NaN, gazeX: 'x', blink: NaN });
  assert.deepEqual(invalid, renderAscii());
  const small = renderAscii({ cols: -5, rows: -100 });
  assert.equal(small.cols, 16);
  assert.equal(small.rows, 12);
  const bounded = renderAscii({ cols: 1e6, rows: 1e6, yaw: 1e6, pitch: -1e6, gazeX: 5, gazeY: -5, blink: 5 });
  assert.equal(bounded.cols, 200);
  assert.equal(bounded.rows, 120);
  assert.deepEqual(bounded, renderAscii({ cols: 200, rows: 120, yaw: 0.7, pitch: -0.4, gazeX: 1, gazeY: -1, blink: 1 }));
});

test('idle closes its loop exactly and remains smooth around the seam', () => {
  assert.equal(IDLE_PERIOD, 12);
  assert.deepEqual(idlePose(0), idlePose(IDLE_PERIOD));
  assert.deepEqual(idlePose(0), idlePose(IDLE_PERIOD * 100));
  assert.deepEqual(idlePose(NaN), idlePose(0));
  for (const t of [0, 0.25, 1, 2.7, 8.6, 11.99]) {
    const pose = idlePose(t);
    const looped = idlePose(t + 12);
    for (const key of Object.keys(pose)) assert.ok(Math.abs(pose[key] - looped[key]) < 1e-11);
    assert.ok(Object.values(pose).every(Number.isFinite));
  }
  const before = idlePose(12 - 0.0001), after = idlePose(0.0001);
  for (const key of ['yaw', 'pitch', 'roll', 'gazeX', 'gazeY', 'blink']) {
    assert.ok(Math.abs(before[key] - after[key]) < 0.001, key);
  }
  assert.equal(idlePose(2.7).blink, 1);
  assert.equal(idlePose(8.6).blink, 1);
  assert.equal(idlePose(0).blink, 0);
  assert.deepEqual(renderAscii(idlePose(0)), renderAscii(idlePose(12)));
});

test('spring converges, preserves velocity when retargeted and remains frame-rate consistent', () => {
  const simulate = (fps) => {
    let state = { value: 0, velocity: 0 };
    for (let i = 0; i < fps * 4; i++) state = advanceSpring(state, 1, 1 / fps);
    return state;
  };
  for (const fps of [24, 30, 60, 120]) {
    const state = simulate(fps);
    assert.ok(Math.abs(state.value - 1) < 1e-7);
    assert.ok(Math.abs(state.velocity) < 1e-6);
  }
  const moving = advanceSpring({ value: 0, velocity: 3 }, -1, 1 / 120);
  assert.ok(moving.velocity > 0, 'retargeting must not discard momentum');
  assert.ok(moving.value > 0);
});

test('spring bounds long gaps, rejects nonfinite input, handles zero timestep and extreme settings', () => {
  const state = { value: 0, velocity: 0 };
  assert.deepEqual(advanceSpring(state, 1, 60), advanceSpring(state, 1, 0.25));
  assert.deepEqual(advanceSpring(state, 1, -1), state);
  assert.deepEqual(advanceSpring(state, 1, NaN), state);
  assert.deepEqual(advanceSpring(state, 1, 0), state);
  assert.deepEqual(advanceSpring(null, NaN, Infinity), state);
  for (const options of [{ stiffness: 2000, damping: 200 }, { stiffness: 2000, damping: 0 }, { stiffness: 0, damping: 200 }]) {
    let current = { value: 1, velocity: 2 };
    for (let i = 0; i < 200; i++) current = advanceSpring(current, 0, 0.25, options);
    assert.ok(Number.isFinite(current.value));
    assert.ok(Number.isFinite(current.velocity));
    assert.ok(Math.abs(current.value) < 5);
  }
});
