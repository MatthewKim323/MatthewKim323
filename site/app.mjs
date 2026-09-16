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
  const stillSource = $('#ocean-fallback source');
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

async function startOcean() {
  const canvas = $('#ocean-canvas');
  const stage = $('#ocean-stage');
  const figure = $('.ocean-figure');
  const fallback = $('#ocean-fallback');
  const toggle = $('#motion-toggle');
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  let engine;
  try { engine = await import('./src/ocean-core.mjs'); }
  catch (error) {
    console.warn('The ocean is using its still image.', error);
    return;
  }
  const { renderOcean, COLS, ROWS, LOOP_SECONDS } = engine;
  if (typeof renderOcean !== 'function') return;

  let userPaused = storage.get('matt-motion') === 'paused';
  let enabled = !motionPreference.matches && !userPaused;
  let visible = true;
  let disposed = false;
  let raf = null;
  let previousTime = 0;
  let lastDraw = 0;
  let elapsed = 0;
  let frames = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let atlas;
  let sourceWidth = 0;
  let sourceHeight = 0;
  const cols = COLS || 144;
  const rows = ROWS || 58;
  const period = LOOP_SECONDS || 18;
  const interval = 1000 / 24;
  const sceneCleanup = [];
  const on = (target, name, handler) => {
    target.addEventListener(name, handler);
    sceneCleanup.push(() => target.removeEventListener(name, handler));
  };

  function suspend() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    previousTime = 0;
    lastDraw = 0;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    suspend();
    sceneCleanup.splice(0).forEach(remove => remove());
  }

  function showFallback(error) {
    dispose();
    canvas.hidden = true;
    fallback.hidden = false;
    toggle.hidden = true;
    figure.dataset.state = 'paused';
    if (error) console.warn('The ocean is using its still image.', error);
  }

  function setStatus() {
    figure.dataset.state = enabled ? 'playing' : 'paused';
    toggle.setAttribute('aria-pressed', String(!enabled));
    toggle.setAttribute('aria-label', enabled ? 'Pause ocean animation' : 'Play ocean animation');
    $('#motion-icon').textContent = enabled ? 'Ⅱ' : '▷';
    $('#motion-label').textContent = enabled ? 'pause' : 'play';
  }

  // Sixteen baked tones keep per-frame work to inexpensive atlas copies.
  function buildAtlas() {
    const css = getComputedStyle(document.documentElement);
    const neutral = css.getPropertyValue('--ocean-neutral').trim();
    const warm = css.getPropertyValue('--ocean-warm').trim();
    sourceWidth = Math.max(1, Math.ceil(width / cols * dpr));
    sourceHeight = Math.max(1, Math.ceil(height / rows * dpr));
    atlas = document.createElement('canvas');
    atlas.width = sourceWidth * 95;
    atlas.height = sourceHeight * 16;
    const pen = atlas.getContext('2d');
    if (!pen) throw new Error('Character atlas is unavailable');
    pen.font = `${sourceHeight * .88}px "JetBrains Mono", ui-monospace, monospace`;
    pen.textAlign = 'center';
    pen.textBaseline = 'middle';
    for (let tone = 1; tone <= 16; tone++) {
      pen.fillStyle = tone <= 8 ? neutral : warm;
      pen.globalAlpha = (tone <= 8 ? tone : tone - 8) / 8;
      for (let code = 32; code <= 126; code++) {
        pen.fillText(String.fromCharCode(code), (code - 32 + .5) * sourceWidth, (tone - .5) * sourceHeight);
      }
    }
  }

  function paint() {
    if (disposed || !atlas || !width || !height) return;
    const frame = renderOcean({ time: elapsed, cols, rows });
    const cellWidth = width / frame.cols;
    const cellHeight = height / frame.rows;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    for (let row = 0; row < frame.rows; row++) {
      for (let col = 0; col < frame.cols; col++) {
        const tone = frame.tones[row * frame.cols + col];
        const code = frame.lines[row].charCodeAt(col);
        if (!tone || code <= 32 || code > 126 || !Number.isFinite(code)) continue;
        context.drawImage(atlas, (code - 32) * sourceWidth, (tone - 1) * sourceHeight, sourceWidth, sourceHeight, col * cellWidth, row * cellHeight, cellWidth, cellHeight);
      }
    }
    canvas.dataset.frames = String(++frames);
    canvas.dataset.time = elapsed.toFixed(4);
    canvas.dataset.cols = String(frame.cols);
    canvas.dataset.rows = String(frame.rows);
  }

  function repaint() {
    if (disposed) return;
    try { buildAtlas(); paint(); }
    catch (error) { showFallback(error); }
  }

  function resize() {
    if (disposed) return;
    const rect = stage.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    repaint();
    schedule();
  }

  function step(timestamp) {
    raf = null;
    if (!enabled || !visible || document.hidden || disposed) { previousTime = 0; return; }
    const delta = previousTime ? Math.min((timestamp - previousTime) / 1000, .1) : 0;
    previousTime = timestamp;
    elapsed = (elapsed + delta) % period;
    if (!lastDraw || timestamp - lastDraw >= interval) {
      // Carry the fractional frame remainder for an even 24fps average cadence.
      lastDraw = timestamp - (lastDraw ? (timestamp - lastDraw) % interval : 0);
      try { paint(); }
      catch (error) { showFallback(error); return; }
    }
    schedule();
  }

  function schedule() {
    if (raf === null && enabled && visible && !document.hidden && !disposed) raf = requestAnimationFrame(step);
  }

  on(document, 'visibilitychange', () => { if (document.hidden) suspend(); else schedule(); });
  on(document, 'profile:themechange', repaint);
  on(motionPreference, 'change', event => {
    enabled = !event.matches && !userPaused;
    if (enabled) schedule(); else suspend();
    setStatus();
  });
  on(toggle, 'click', () => {
    enabled = !enabled;
    userPaused = !enabled;
    storage.set('matt-motion', enabled ? 'live' : 'paused');
    if (enabled) schedule(); else suspend();
    setStatus();
  });

  const intersection = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) schedule(); else suspend();
  }, { threshold: 0 });
  intersection.observe(stage);
  sceneCleanup.push(() => intersection.disconnect());
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  sceneCleanup.push(() => observer.disconnect());
  cleanup.push(dispose);
  document.fonts?.ready.then(() => { if (!disposed) repaint(); });
  resize();
  if (disposed) return;
  canvas.hidden = false;
  fallback.hidden = true;
  toggle.hidden = false;
  setStatus();
  schedule();
}

// Reading the complete portfolio never depends on this progressive enhancement.
startOcean().catch(error => {
  $('#ocean-canvas').hidden = true;
  $('#ocean-fallback').hidden = false;
  $('#motion-toggle').hidden = true;
  console.warn('The ocean is using its still image.', error);
});

listen(window, 'pagehide', event => {
  if (!event.persisted) cleanup.splice(0).forEach(dispose => dispose());
});
