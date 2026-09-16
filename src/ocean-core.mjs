/** The selected moonlit ocean. Pure, deterministic ASCII with an 18-second loop. */
export const LOOP_SECONDS = 18;
export const COLS = 144;
export const ROWS = 58;
const TAU = Math.PI * 2;
const ramp = ' .,:;+=*#%@';
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const finite = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const noise = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };

/** tones: 0 transparent, 1..8 neutral, 9..16 warm; each color has 8 alpha levels. */
export function renderOcean(input = {}) {
  const options = input && typeof input === 'object' ? input : {};
  const cols = Math.round(clamp(finite(options.cols, COLS), 32, 192));
  const rows = Math.round(clamp(finite(options.rows, ROWS), 16, 96));
  const time = ((finite(options.time, 0) % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
  const phase = time / LOOP_SECONDS * TAU;
  const lines = [], tones = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    const y = (row + .5) / rows;
    let line = '';
    for (let col = 0; col < cols; col++) {
      const x = (col + .5) / cols;
      const inMoon = Math.hypot(x - .65, (y - .23) * .5) < .055;
      let value = inMoon ? .75 + noise(Math.floor(x * 600), Math.floor(y * 300)) * .18 : 0;
      let warm = inMoon, glyph = '';
      if (y < .51 && !value && noise(col, row) > .993) value = .24 + .17 * Math.sin(phase + noise(x, y) * TAU);
      if (y > .52) {
        const depth = (y - .52) / .48;
        const waves = Math.sin(y * 165 - phase * 2 + x * 7) + .5 * Math.sin(x * 64 + y * 88 + phase * 3);
        const shine = Math.exp(-((x - .65 - .014 * Math.sin(y * 85 + phase * 2)) ** 2) / (.001 + depth * .022));
        value = (.035 + Math.max(0, waves) * .11) * (1 + depth * 2.8) + shine * Math.max(0, waves) * .45;
        warm = shine > .24;
        glyph = value > .45 ? '=' : value > .15 ? '~' : value > .06 ? '-' : '.';
      }
      value = clamp(value);
      if (value < .065) { line += ' '; continue; }
      const alpha = clamp(value * (warm ? 1.15 : 1.22), warm ? .13 : .12);
      tones[row * cols + col] = Math.max(1, Math.round(alpha * 8)) + (warm ? 8 : 0);
      line += glyph || ramp[Math.max(1, Math.min(9, Math.floor(value * 10)))];
    }
    lines.push(line);
  }
  return { cols, rows, lines, tones };
}
