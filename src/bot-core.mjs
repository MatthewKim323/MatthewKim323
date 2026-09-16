/**
 * An original floating ASCII companion: one soft orb and two curious pill eyes.
 * Pure, deterministic and dependency-free in both Node and the browser.
 */
export const CHARACTER_ASPECT = 0.5;
export const IDLE_PERIOD = 12;
const TAU = Math.PI * 2;
const RAMP = '.:-=+*#%@';
const finite = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const bounded = (value, fallback, lo, hi) => clamp(finite(value, fallback), lo, hi);

function pillDistance(x, y, width, height) {
  const radius = Math.min(width, height);
  const qx = Math.abs(x) - (width - radius);
  const qy = Math.abs(y) - (height - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
    + Math.min(Math.max(qx, qy), 0) - radius;
}

/**
 * Angles are radians; gaze is normalized to [-1,1], with positive Y looking up.
 * tones: 0 empty, 1 soft shadow, 2 body, 3 highlight, 4 eyes.
 * Draw cells with a 1:2 width-to-height ratio. Color belongs to the adapter.
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
  const phase = time / IDLE_PERIOD * TAU;
  const roll = bounded(opts.roll, Math.sin(phase) * 0.03, -0.25, 0.25);
  const floatY = Math.sin(phase * 2) * 0.072;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const rx = 1.18, ry = 1.27, rz = 1.07;
  const ix = 1 / (rx * rx), iy = 1 / (ry * ry), iz = 1 / (rz * rz);
  // Inverse-rotated orthographic ray direction, shared by the whole frame.
  const dx = sy, dy = -sp * cy, dz = -cp * cy;
  const a = dx * dx * ix + dy * dy * iy + dz * dz * iz;
  const worldHeight = 4.12;
  const worldWidth = worldHeight * cols / rows * CHARACTER_ASPECT;
  const tones = new Uint8Array(cols * rows);
  const lines = new Array(rows);
  const eyeWidth = 0.142;
  const eyeHeight = 0.335 * (1 - blink) + 0.022;
  const eyeTilt = 0.13;
  const eyeCos = Math.cos(eyeTilt), eyeSin = Math.sin(eyeTilt);

  for (let row = 0; row < rows; row++) {
    const worldY = (0.5 - (row + 0.5) / rows) * worldHeight - floatY;
    let line = '';
    for (let col = 0; col < cols; col++) {
      const worldX = ((col + 0.5) / cols - 0.5) * worldWidth;
      let glyph = ' ', tone = 0;
      if (Math.abs(worldX) < 1.5 && Math.abs(worldY) < 1.5) {
        // Inverse Rz * Ry * Rx, then an exact quadratic ellipsoid intersection.
        const rotatedX = cr * worldX + sr * worldY;
        const rotatedY = -sr * worldX + cr * worldY;
        const ox = cy * rotatedX - sy * 6;
        const ozYaw = sy * rotatedX + cy * 6;
        const oy = cp * rotatedY + sp * ozYaw;
        const oz = -sp * rotatedY + cp * ozYaw;
        const b = 2 * (ox * dx * ix + oy * dy * iy + oz * dz * iz);
        const c = ox * ox * ix + oy * oy * iy + oz * oz * iz - 1;
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= 0) {
          const t = (-b - Math.sqrt(discriminant)) / (2 * a);
          const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
          let nx = x * ix, ny = y * iy, nz = z * iz;
          const length = Math.hypot(nx, ny, nz) || 1;
          nx /= length; ny /= length; nz /= length;
          const pitchedY = cp * ny - sp * nz;
          const pitchedZ = sp * ny + cp * nz;
          const yawedX = cy * nx + sy * pitchedZ;
          const worldNX = cr * yawedX - sr * pitchedY;
          const worldNY = sr * yawedX + cr * pitchedY;
          const worldNZ = -sy * nx + cy * pitchedZ;
          const diffuse = clamp(worldNX * -0.38 + worldNY * 0.54 + worldNZ * 0.75, 0, 1);
          const rim = (1 - Math.abs(worldNZ)) ** 3 * 0.09;
          const broadHighlight = clamp(worldNX * -0.22 + worldNY * 0.30 + worldNZ * 0.93, 0, 1) ** 12 * 0.13;
          const light = clamp(0.14 + diffuse * 0.65 + rim + broadHighlight, 0, 1);
          glyph = RAMP[Math.min(RAMP.length - 1, Math.floor(light * RAMP.length))];
          tone = light > 0.73 ? 3 : light > 0.32 ? 2 : 1;

          // Only two rounded capsules. No visor, mouth, armor or extra markings.
          // Their object-space placement makes them follow the curved face.
          if (z > 0.36) {
            for (let side = -1; side <= 1; side += 2) {
              const px = x - (side * 0.405 + gazeX * 0.13);
              const py = y - (0.10 + gazeY * 0.105);
              const eyeX = eyeCos * px - side * eyeSin * py;
              const eyeY = side * eyeSin * px + eyeCos * py;
              if (pillDistance(eyeX, eyeY, eyeWidth, eyeHeight) < 0) {
                glyph = blink > 0.88 ? '=' : '#';
                tone = 4;
                break;
              }
            }
          }
        }
      }
      line += glyph;
      tones[row * cols + col] = tone;
    }
    lines[row] = line;
  }
  return { cols, rows, lines, tones };
}

/** Seamless 12-second curiosity: gentle floating, looking and two soft blinks. */
export function idlePose(seconds = 0) {
  const time = ((finite(seconds, 0) % IDLE_PERIOD) + IDLE_PERIOD) % IDLE_PERIOD;
  const phase = time / IDLE_PERIOD * TAU;
  const pulse = center => {
    const raw = Math.abs(time - center);
    const distance = Math.min(raw, IDLE_PERIOD - raw);
    return distance < 0.17 ? Math.cos(distance / 0.17 * Math.PI / 2) ** 2 : 0;
  };
  return {
    yaw: Math.sin(phase) * 0.11 + Math.sin(phase * 2) * 0.015,
    pitch: Math.cos(phase) * 0.03 - 0.01,
    roll: Math.sin(phase) * 0.03,
    gazeX: Math.sin(phase + 0.14) * 0.27,
    gazeY: Math.cos(phase) * 0.10,
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
