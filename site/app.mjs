const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const cleanup = [];
const listen = (target, name, handler, options) => {
  target.addEventListener(name, handler, options);
  cleanup.push(() => target.removeEventListener(name, handler, options));
};

// Storage can be unavailable in privacy modes. Theme and motion still work.
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* optional persistence */ } },
};
const darkPreference = matchMedia('(prefers-color-scheme: dark)');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let themeChoice = storage.get('matt-theme');
if (!['light', 'dark', 'system'].includes(themeChoice)) themeChoice = 'system';

function applyTheme() {
  if (themeChoice === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = themeChoice;
  $$('[data-theme-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === themeChoice));
  });
  const dark = themeChoice === 'dark' || (themeChoice === 'system' && darkPreference.matches);
  $('meta[name="theme-color"]').content = dark ? '#0d1117' : '#f4f2eb';
  const stillSource = $('#bot-fallback source');
  if (stillSource) stillSource.media = themeChoice === 'system' ? '(prefers-color-scheme: dark)' : dark ? 'all' : 'not all';
  document.dispatchEvent(new Event('profile:themechange'));
}
$('.theme-picker').hidden = false;
$$('[data-theme-choice]').forEach(button => listen(button, 'click', () => {
  themeChoice = button.dataset.themeChoice;
  storage.set('matt-theme', themeChoice);
  applyTheme();
}));
listen(darkPreference, 'change', applyTheme);
applyTheme();
$('#footer-year').textContent = new Date().getFullYear();

async function startBot() {
  const canvas = $('#bot-canvas');
  const stage = $('#bot-stage');
  const figure = $('.bot-figure');
  const toggle = $('#motion-toggle');
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  let engine;
  try { engine = await import('./src/bot-core.mjs'); }
  catch (error) {
    $('#bot-instruction').textContent = 'the interactive companion is offline. the work is still here.';
    console.warn('ASCII companion is using its static fallback.', error);
    return;
  }
  const { renderAscii, idlePose, advanceSpring } = engine;
  if (![renderAscii, idlePose, advanceSpring].every(item => typeof item === 'function')) return;

  const pointerPreference = matchMedia('(hover: hover) and (pointer: fine)');
  const pausedByUser = storage.get('matt-motion') === 'paused';
  let enabled = !motionPreference.matches && !pausedByUser;
  let reduced = motionPreference.matches;
  let visible = true;
  let disposed = false;
  let raf = null;
  let previousTime = 0;
  let elapsed = 0;
  let lastDraw = 0;
  let lastPointer = 0;
  let tracking = false;
  let keyboardTarget = false;
  let pointerX = 0;
  let pointerY = 0;
  let renderCount = 0;
  let cols = 96;
  let rows = 50;
  let drawWidth = 0;
  let drawHeight = 0;
  let dpr = 1;
  let atlas;
  let atlasCellWidth = 0;
  let atlasCellHeight = 0;
  let palette;
  let targetInterval = 1000 / 40;
  const state = {
    yaw: { value: 0, velocity: 0 },
    pitch: { value: 0, velocity: 0 },
    gazeX: { value: 0, velocity: 0 },
    gazeY: { value: 0, velocity: 0 },
  };
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  function readPalette() {
    const css = getComputedStyle(document.documentElement);
    palette = ['', '--bot-dim', '--bot-shell', '--bot-bright', '--accent'].map(token => token ? css.getPropertyValue(token).trim() : 'transparent');
  }

  // The atlas avoids measuring and rasterizing thousands of glyphs every frame.
  function buildAtlas() {
    readPalette();
    atlasCellWidth = Math.max(1, Math.ceil(drawWidth / cols));
    atlasCellHeight = Math.max(1, Math.ceil(drawHeight / rows));
    const scale = dpr;
    const glyphWidth = Math.ceil(atlasCellWidth * scale);
    const glyphHeight = Math.ceil(atlasCellHeight * scale);
    atlas = document.createElement('canvas');
    atlas.width = glyphWidth * 95;
    atlas.height = glyphHeight * 4;
    const pen = atlas.getContext('2d');
    const fontSize = Math.max(4, Math.min(atlasCellHeight * .91, atlasCellWidth / .61));
    pen.font = `${fontSize * scale}px "JetBrains Mono", ui-monospace, monospace`;
    pen.textAlign = 'center';
    pen.textBaseline = 'middle';
    for (let tone = 1; tone < 5; tone++) {
      pen.fillStyle = palette[tone];
      for (let code = 32; code <= 126; code++) {
        pen.fillText(String.fromCharCode(code), (code - 32 + .5) * glyphWidth, (tone - .5) * glyphHeight);
      }
    }
  }

  function setStatus() {
    const status = !enabled ? 'paused' : tracking ? 'tracking' : 'idle';
    figure.dataset.state = status;
    $('#bot-state').textContent = status;
    toggle.setAttribute('aria-pressed', String(!enabled));
    toggle.setAttribute('aria-label', enabled ? 'Pause companion animation' : 'Play companion animation');
    $('#motion-icon').textContent = enabled ? 'Ⅱ' : '▷';
    $('#motion-label').textContent = enabled ? 'pause' : 'play';
    $('#bot-instruction').textContent = !enabled
      ? reduced ? 'still by preference. play when you want.' : 'taking a breath. press play to continue.'
      : pointerPreference.matches ? 'move your cursor. he is paying attention.' : 'tap around him. he is paying attention.';
  }

  function poseAtRest() {
    return { yaw: state.yaw.value, pitch: state.pitch.value, gazeX: state.gazeX.value, gazeY: state.gazeY.value, blink: 0, time: elapsed };
  }

  function paint(pose) {
    if (!drawWidth || !drawHeight || !atlas) return;
    const begin = performance.now();
    const frame = renderAscii({ cols, rows, ...pose });
    const cellWidth = drawWidth / frame.cols;
    const cellHeight = drawHeight / frame.rows;
    const sourceWidth = atlas.width / 95;
    const sourceHeight = atlas.height / 4;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, drawWidth, drawHeight);
    for (let row = 0; row < frame.rows; row++) {
      const line = frame.lines[row];
      for (let col = 0; col < frame.cols; col++) {
        const tone = frame.tones[row * frame.cols + col];
        const code = line.charCodeAt(col);
        if (!tone || code === 32 || !Number.isFinite(code)) continue;
        const glyph = clamp(code, 32, 126) - 32;
        context.drawImage(atlas, glyph * sourceWidth, (clamp(tone, 1, 4) - 1) * sourceHeight, sourceWidth, sourceHeight, col * cellWidth, row * cellHeight, cellWidth, cellHeight);
      }
    }
    renderCount++;
    canvas.dataset.frames = String(renderCount);
    canvas.dataset.yaw = Number(pose.yaw ?? 0).toFixed(3);
    canvas.dataset.pitch = Number(pose.pitch ?? 0).toFixed(3);
    const cost = performance.now() - begin;
    // Prefer a stable cadence to keeping a slow device busy chasing 60fps.
    if (cost > 20) targetInterval = 1000 / 24;
    else if (cost > 12) targetInterval = 1000 / 30;
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    drawWidth = Math.max(1, rect.width);
    drawHeight = Math.max(1, rect.height);
    dpr = Math.min(devicePixelRatio || 1, 2);
    cols = drawWidth < 320 ? 72 : drawWidth < 430 ? 84 : 96;
    rows = Math.round(cols * .52);
    canvas.width = Math.round(drawWidth * dpr);
    canvas.height = Math.round(drawHeight * dpr);
    canvas.dataset.cols = String(cols);
    canvas.dataset.rows = String(rows);
    buildAtlas();
    paint(poseAtRest());
    schedule();
  }

  function step(timestamp) {
    raf = null;
    if (!enabled || !visible || document.hidden || disposed) { previousTime = 0; return; }
    if (timestamp - lastDraw < targetInterval) { schedule(); return; }
    const dt = previousTime ? Math.min((timestamp - previousTime) / 1000, .05) : 1 / 40;
    previousTime = timestamp;
    lastDraw = timestamp;
    elapsed += dt;
    if (tracking && !keyboardTarget && !pointerPreference.matches && timestamp - lastPointer > 3500) {
      tracking = false;
      setStatus();
    }
    const idle = idlePose(elapsed);
    const targets = tracking
      ? { yaw: pointerX * .55, pitch: pointerY * .32, gazeX: pointerX, gazeY: -pointerY }
      : { yaw: idle.yaw ?? 0, pitch: idle.pitch ?? 0, gazeX: idle.gazeX ?? 0, gazeY: idle.gazeY ?? 0 };
    for (const key of ['yaw', 'pitch', 'gazeX', 'gazeY']) {
      const config = key.startsWith('gaze') ? { stiffness: 240, damping: 24 } : { stiffness: 100, damping: 10 };
      const next = advanceSpring(state[key], targets[key], dt, config);
      // The engine returns a state; accepting in-place engines is harmless too.
      if (next && Number.isFinite(next.value)) state[key] = next;
    }
    paint({ ...poseAtRest(), blink: idle.blink ?? 0, time: elapsed });
    schedule();
  }

  function schedule() {
    if (raf === null && enabled && visible && !document.hidden && !disposed) raf = requestAnimationFrame(step);
  }

  function suspend() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    previousTime = 0;
  }

  function updatePointer(event) {
    if (!enabled || !visible) return;
    if (event.type === 'pointermove' && (!pointerPreference.matches || event.pointerType === 'touch')) return;
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width * .8);
    const y = (event.clientY - rect.top - rect.height / 2) / (rect.height * .8);
    pointerX = clamp(x, -1, 1);
    pointerY = clamp(y, -1, 1);
    keyboardTarget = false;
    lastPointer = performance.now();
    if (!tracking) { tracking = true; setStatus(); }
    schedule();
  }

  listen(document, 'pointermove', updatePointer, { passive: true });
  listen(stage, 'pointerdown', updatePointer, { passive: true });
  listen(document, 'pointerout', event => {
    if (!event.relatedTarget && !keyboardTarget) { tracking = false; setStatus(); }
  });
  listen(document, 'visibilitychange', () => { if (document.hidden) suspend(); else schedule(); });
  listen(window, 'blur', () => { if (!keyboardTarget) { tracking = false; setStatus(); } });
  listen(document, 'profile:themechange', () => { buildAtlas(); paint(poseAtRest()); });
  listen(pointerPreference, 'change', setStatus);
  listen(motionPreference, 'change', event => {
    reduced = event.matches;
    if (reduced) { enabled = false; suspend(); }
    else if (storage.get('matt-motion') !== 'paused') { enabled = true; schedule(); }
    setStatus();
  });
  listen(toggle, 'click', () => {
    enabled = !enabled;
    storage.set('matt-motion', enabled ? 'live' : 'paused');
    if (enabled) schedule(); else suspend();
    setStatus();
  });
  $$('[data-look]').forEach(button => listen(button, 'click', () => {
    const direction = button.dataset.look;
    tracking = direction !== 'center';
    keyboardTarget = tracking;
    pointerX = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    pointerY = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
    if (!enabled) {
      // A deliberate keyboard action gets an instant, non-animated response.
      state.yaw = { value: pointerX * .55, velocity: 0 };
      state.pitch = { value: pointerY * .32, velocity: 0 };
      state.gazeX = { value: pointerX, velocity: 0 };
      state.gazeY = { value: -pointerY, velocity: 0 };
      paint(poseAtRest());
    }
    setStatus();
    schedule();
  }));

  const intersection = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) schedule(); else suspend();
  }, { threshold: 0 });
  intersection.observe(stage);
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  cleanup.push(() => { disposed = true; suspend(); intersection.disconnect(); observer.disconnect(); });
  if (document.fonts?.ready) document.fonts.ready.then(() => { if (!disposed) { buildAtlas(); paint(poseAtRest()); } });
  canvas.hidden = false;
  $('#bot-fallback').hidden = true;
  toggle.hidden = false;
  $('#bot-keyboard').hidden = false;
  resize();
  setStatus();
  schedule();
}

// The complete profile is already in the HTML. JavaScript only adds interaction.
startBot().catch(error => {
  $('#bot-canvas').hidden = true;
  $('#bot-fallback').hidden = false;
  $('#motion-toggle').hidden = true;
  $('#bot-keyboard').hidden = true;
  $('#bot-instruction').textContent = 'a little curiosity, in characters.';
  console.warn('The ASCII companion could not initialize.', error);
});

listen(window, 'pagehide', event => {
  // The browser preserves handlers when this page enters its back-forward cache.
  if (!event.persisted) cleanup.splice(0).forEach(dispose => dispose());
});
