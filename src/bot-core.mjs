/**
 * KIM/01, an original analytical ASCII helmet.
 * No DOM, randomness, GPU, font metrics or external assets are required.
 * Render with glyph cells twice as tall as they are wide (CHARACTER_ASPECT).
 */
export const CHARACTER_ASPECT = 0.5;
export const IDLE_PERIOD = 12;
const TAU = Math.PI * 2;
const RAMP = '.:-=+*#%@';
const finite = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const bounded = (value, fallback, lo, hi) => clamp(finite(value, fallback), lo, hi);

function roundBox(x, y, z, hx, hy, hz, radius) {
  const qx = Math.abs(x) - hx;
  const qy = Math.abs(y) - hy;
  const qz = Math.abs(z) - hz;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0))
    + Math.min(Math.max(qx, qy, qz), 0) - radius;
}

function helmetDistance(x, y, z) {
  // A tapered chin, rounded metal shell and separate temple housings.
  const width = 0.95 - Math.max(0, -y - 0.06) * 0.19;
  const shell = roundBox(x, y, z, width, 0.70, 0.47, 0.24);
  const temples = roundBox(Math.abs(x) - 1.19, y + 0.015, z + 0.05, 0.10, 0.35, 0.24, 0.09);
  return Math.min(shell, temples);
}

function ellipsoidDepth(x, y, cx, cy, cz, rx, ry, rz) {
  const u = (x - cx) / rx;
  const v = (y - cy) / ry;
  const inside = 1 - u * u - v * v;
  return inside > 0 ? cz + rz * Math.sqrt(inside) : -Infinity;
}

/**
 * Render a deterministic frame. Angles are radians; gaze is normalized to [-1,1].
 * tones: 0 empty, 1 shadow, 2 shell, 3 highlight, 4 emissive eyes.
 * The caller owns color, accessibility text, scheduling and reduced-motion policy.
 */
export function renderAscii(input = {}) {
  const opts = input && typeof input === 'object' ? input : {};
  const cols = Math.round(bounded(opts.cols, 96, 16, 200));
  const rows = Math.round(bounded(opts.rows, 50, 12, 120));
  const yaw = bounded(opts.yaw, 0, -0.7, 0.7);
  const pitch = bounded(opts.pitch, 0, -0.4, 0.4);
  const gazeX = bounded(opts.gazeX, 0, -1, 1);
  const gazeY = bounded(opts.gazeY, 0, -1, 1);
  const blink = bounded(opts.blink, 0, 0, 1);
  const time = finite(opts.time, 0) % IDLE_PERIOD;
  const breathe = Math.sin(time / IDLE_PERIOD * TAU * 2) * 0.022;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  // Orthographic camera, transformed into the head's local coordinates.
  const dx = sy, dy = -sp * cy, dz = -cp * cy;
  const worldHeight = 4.12;
  const worldWidth = worldHeight * cols / rows * CHARACTER_ASPECT;
  const tones = new Uint8Array(cols * rows);
  const lines = new Array(rows);

  for (let row = 0; row < rows; row++) {
    const worldY = (0.5 - (row + 0.5) / rows) * worldHeight - 0.23;
    let line = '';
    for (let col = 0; col < cols; col++) {
      const worldX = ((col + 0.5) / cols - 0.5) * worldWidth;
      let depth = -Infinity, tone = 0, glyph = ' ';
      // The stationary torso grounds the moving head. Neck sits behind the shell.
      let bodyDepth = ellipsoidDepth(worldX, worldY, 0, -1.41 + breathe * 0.45, -0.18, 1.60, 0.43, 0.52);
      const neckDepth = ellipsoidDepth(worldX, worldY, 0, -0.79 + breathe, -0.12, 0.37, 0.46, 0.32);
      if (bodyDepth !== -Infinity) {
        const nx = worldX / (1.60 * 1.60);
        const ny = (worldY + 1.41 - breathe * 0.45) / (0.43 * 0.43);
        const nz = (bodyDepth + 0.18) / (0.52 * 0.52);
        const n = Math.hypot(nx, ny, nz);
        const light = clamp((-nx * 0.42 + ny * 0.66 + nz * 0.62) / n, 0, 1);
        const panelEdge = Math.abs(Math.abs(worldX) - (0.54 + Math.max(0, -worldY - 1.2) * 0.55)) < 0.027;
        glyph = panelEdge ? '/' : RAMP[Math.min(7, Math.floor(light * 6 + 0.65))];
        tone = light > 0.7 ? 3 : light > 0.25 ? 2 : 1;
        depth = bodyDepth;
        // Small chest insignia, deliberately not a copied brand mark.
        if (Math.abs(worldX) < 0.14 && Math.abs(worldY + 1.40) < 0.038) { glyph = '='; tone = 3; }
      }
      if (neckDepth > depth) {
        depth = neckDepth;
        const ring = Math.floor((worldY + 1.3) * 27) % 3 === 0;
        glyph = ring ? '=' : ':';
        tone = ring ? 2 : 1;
      }

      const hy = worldY - 0.35 - breathe;
      // Cheap projected bound excludes most empty cells before sphere tracing.
      if (Math.abs(worldX) < 1.60 && Math.abs(hy) < 1.45) {
        const ox = cy * worldX - sy * 6;
        const oy = cp * hy + sp * (sy * worldX + cy * 6);
        const oz = -sp * hy + cp * (sy * worldX + cy * 6);
        const projected = worldX * worldX + hy * hy;
        const radius2 = 2.89;
        if (projected < radius2) {
          const interval = Math.sqrt(radius2 - projected);
          let t = 6 - interval;
          const end = 6 + interval;
          let hit = false, x = 0, y = 0, z = 0;
          for (let step = 0; step < 52 && t < end; step++) {
            x = ox + dx * t; y = oy + dy * t; z = oz + dz * t;
            const distance = helmetDistance(x, y, z);
            if (distance < 0.0016) { hit = true; break; }
            // Conservative stepping accounts for the tapered shell's gradient.
            t += Math.max(distance * 0.82, 0.001);
          }
          if (hit && 6 - t > depth) {
            const eps = 0.002;
            let nx = helmetDistance(x + eps, y, z) - helmetDistance(x - eps, y, z);
            let ny = helmetDistance(x, y + eps, z) - helmetDistance(x, y - eps, z);
            let nz = helmetDistance(x, y, z + eps) - helmetDistance(x, y, z - eps);
            const normalLength = Math.hypot(nx, ny, nz) || 1;
            nx /= normalLength; ny /= normalLength; nz /= normalLength;
            const worldNX = cy * nx + sy * (sp * ny + cp * nz);
            const worldNY = cp * ny - sp * nz;
            const worldNZ = -sy * nx + cy * (sp * ny + cp * nz);
            const diffuse = clamp(worldNX * -0.42 + worldNY * 0.66 + worldNZ * 0.62, 0, 1);
            const rim = Math.pow(1 - Math.abs(worldNZ), 3) * 0.22;
            const shine = Math.pow(clamp(worldNX * -0.24 + worldNY * 0.38 + worldNZ * 0.89, 0, 1), 22) * 0.24;
            const light = clamp(diffuse * 0.73 + rim + shine + 0.08, 0, 1);
            glyph = RAMP[Math.min(7, Math.floor(light * 7.99))];
            tone = light > 0.75 ? 3 : light > 0.30 ? 2 : 1;

            const ax = Math.abs(x);
            const front = z > 0.46;
            // Chamfered wraparound visor, with a crisp upper brow and chin vents.
            const visorTop = 0.34 - Math.max(0, ax - 0.77) * 0.47;
            const visorBottom = -0.25 + Math.max(0, ax - 0.76) * 0.27;
            const onVisor = z > 0.38 && ax < 1.13 && y < visorTop && y > visorBottom;
            if (onVisor) {
              glyph = '.'; tone = 1;
              if (Math.abs(y - visorTop) < 0.029 || Math.abs(y - visorBottom) < 0.025) {
                glyph = '-'; tone = 2;
              }
              // Narrow segmented eyes have an outward rising upper edge.
              const eyeX = x - gazeX * 0.115;
              const eyeAbs = Math.abs(eyeX);
              const eyeCenter = 0.055 + (eyeAbs - 0.40) * 0.17 + gazeY * 0.065;
              const eyeHalf = Math.max(0.009, 0.085 * (1 - blink));
              const taper = clamp(Math.min((eyeAbs - 0.18) / 0.12, (0.88 - eyeAbs) / 0.17), 0, 1);
              if (eyeAbs > 0.18 && eyeAbs < 0.88 && Math.abs(y - eyeCenter) < eyeHalf * taper) {
                glyph = blink > 0.84 ? '-' : '#'; tone = 4;
              }
              // A subtle center bridge separates the two lenses.
              if (ax < 0.028 && y > -0.12 && y < 0.29) { glyph = '|'; tone = 1; }
            } else if (front) {
              const crownSeam = Math.abs(ax - 0.57) < 0.019 && y > 0.42 && y < 0.83;
              const jawSeam = Math.abs(ax - (0.69 + (y + 0.58) * 0.34)) < 0.022 && y < -0.35;
              const chinVent = ax < 0.38 && y < -0.52 && y > -0.69;
              if (crownSeam || jawSeam) { glyph = ':'; tone = 1; }
              if (chinVent) { glyph = Math.floor((x + 0.4) * 32) % 3 === 0 ? '|' : ':'; tone = 1; }
              if (ax < 0.085 && y > 0.55 && y < 0.66) { glyph = '/'; tone = 3; }
            }
            // Temple side vents become visible with rotation.
            if (ax > 1.15 && Math.abs(y) < 0.22) {
              glyph = Math.floor((y + 0.25) * 35) % 3 === 0 ? '=' : ':';
              tone = 1;
            }
          }
        }
      }
      tones[row * cols + col] = tone;
      line += glyph;
    }
    lines[row] = line;
  }
  return { cols, rows, lines, tones };
}

/** A seamless, deterministic 12-second idle performance, including two blinks. */
export function idlePose(seconds = 0) {
  const time = ((finite(seconds, 0) % IDLE_PERIOD) + IDLE_PERIOD) % IDLE_PERIOD;
  const phase = time / IDLE_PERIOD * TAU;
  const pulse = (center) => {
    const raw = Math.abs(time - center);
    const distance = Math.min(raw, IDLE_PERIOD - raw);
    return distance < 0.17 ? Math.cos(distance / 0.17 * Math.PI / 2) ** 2 : 0;
  };
  return {
    yaw: Math.sin(phase) * 0.17 + Math.sin(phase * 2) * 0.025,
    pitch: Math.cos(phase) * 0.035 - 0.01,
    gazeX: Math.sin(phase + 0.14) * 0.35,
    gazeY: Math.cos(phase) * 0.12,
    blink: Math.max(pulse(2.7), pulse(8.6)),
    time,
  };
}

/**
 * Stable damped spring with bounded catch-up. dt is seconds.
 * Long background-tab gaps advance at most 250ms. The browser should reset its
 * frame timestamp on visibilitychange to resume without a visible catch-up.
 */
export function advanceSpring(state, target, dt, options = {}) {
  const opts = options && typeof options === 'object' ? options : {};
  let value = bounded(state?.value, 0, -1e6, 1e6);
  let velocity = bounded(state?.velocity, 0, -1e6, 1e6);
  const goal = bounded(target, 0, -1e6, 1e6);
  const elapsed = bounded(dt, 0, 0, 0.25);
  const stiffness = bounded(opts.stiffness, 100, 0, 2000);
  const damping = bounded(opts.damping, 10, 0, 200);
  if (!elapsed) return { value, velocity };
  const steps = Math.max(1, Math.ceil(elapsed * Math.max(120, damping * 2)));
  const step = elapsed / steps;
  for (let i = 0; i < steps; i++) {
    velocity += (stiffness * (goal - value) - damping * velocity) * step;
    value += velocity * step;
  }
  return { value, velocity };
}
