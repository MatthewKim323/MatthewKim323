import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const readJSON = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'));
export const escapeXML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
// Plain text only. HTML attributes still require escapeXML, not this helper.
export const escapeMarkdown = value => String(value)
  .replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))
  .replace(/[\\`*_[\]{}()#+.!|~-]/g, '\\$&');

const controlCharacters = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
const unsafeURLCharacters = /[\s<>"'\\()[\]`{}|]/;

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim() || controlCharacters.test(value)) {
    throw new Error(`Invalid ${field}: expected nonempty text without control characters`);
  }
}

function isEmail(value) {
  return typeof value === 'string'
    && !controlCharacters.test(value)
    && !/[\s?#"'<>\\()[\]]/.test(value)
    && !/(^\.|\.\.|\.@)/.test(value)
    && /^[a-z\d._+-]+@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(value);
}

function requireURL(value, field, { allowMailto = false } = {}) {
  requireText(value, field);
  // Raw delimiters can break Markdown destinations or HTML attributes even when
  // the URL parser accepts them. Encode these characters in the source URL.
  if (unsafeURLCharacters.test(value)) throw new Error(`Unsafe ${field}: encode URL delimiters and whitespace`);
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`Invalid ${field}: expected an absolute URL`); }
  if (parsed.protocol === 'https:') {
    if (!value.startsWith('https://') || !parsed.hostname || parsed.username || parsed.password) {
      throw new Error(`Unsafe ${field}: expected HTTPS without embedded credentials`);
    }
    return;
  }
  if (allowMailto && parsed.protocol === 'mailto:' && isEmail(parsed.pathname) && !parsed.search && !parsed.hash) return;
  throw new Error(`Unsafe ${field}: expected HTTPS${allowMailto ? ' or a bare mailto address' : ''}`);
}

export async function writeChanged(name, content) {
  const target = path.join(root, name);
  const old = await readFile(target, 'utf8').catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  if (old === content) return false;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
  return true;
}

export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error('Invalid profile object');
  for (const key of ['name','handle','tagline','headline','email','awardsLabel']) {
    requireText(profile[key], `profile.${key}`);
  }
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(profile.handle)) throw new Error('Invalid GitHub handle');
  if (!isEmail(profile.email)) throw new Error('Invalid email');
  for (const key of ['projects','links','focus','bio','now']) if (!Array.isArray(profile[key])) throw new Error(`Missing profile.${key}`);
  for (const key of ['focus','bio','now']) profile[key].forEach((value, index) => requireText(value, `profile.${key}[${index}]`));
  if (!profile.projects.length) throw new Error('Profile must contain at least one project');
  const ids = new Set();
  for (const project of profile.projects) {
    if (!project || typeof project !== 'object' || Array.isArray(project)) throw new Error('Invalid project object');
    requireText(project.id, 'project.id');
    if (!/^[a-z\d][a-z\d-]*$/.test(project.id) || ids.has(project.id)) throw new Error(`Duplicate or invalid project id: ${project.id}`);
    ids.add(project.id);
    requireText(project.name, `project.${project.id}.name`);
    requireText(project.description, `project.${project.id}.description`);
    if (project.award !== undefined) requireText(project.award, `project.${project.id}.award`);
    if (!Array.isArray(project.stack)) throw new Error(`Incomplete project stack: ${project.id}`);
    project.stack.forEach((value, index) => requireText(value, `project.${project.id}.stack[${index}]`));
    if (!['featured','archive','tool'].includes(project.category)) throw new Error(`Invalid category: ${project.id}`);
    if (typeof project.featured !== 'boolean' || project.featured !== (project.category === 'featured')) throw new Error(`Inconsistent featured category: ${project.id}`);
    // Empty URLs intentionally represent projects with no public repository.
    if (typeof project.url !== 'string') throw new Error(`Invalid project URL: ${project.id}`);
    if (project.url) requireURL(project.url, `project URL: ${project.id}`);
  }
  for (const link of profile.links) {
    if (!link || typeof link !== 'object' || Array.isArray(link)) throw new Error('Invalid contact link');
    requireText(link.label, 'contact label');
    requireURL(link.url, 'contact URL', { allowMailto: true });
  }
  return profile;
}

function requireISODate(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ${field}: expected an ISO calendar date`);
  const date = new Date(`${value}T00:00:00.000Z`);
  const timestamp = date.getTime();
  // JavaScript normalizes impossible dates such as February 30 into March.
  if (!Number.isFinite(timestamp) || date.toISOString().slice(0, 10) !== value) throw new Error(`Invalid ${field}: calendar date does not exist`);
  return timestamp;
}

function requireCount(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${field}: expected a nonnegative safe integer`);
}

export function summarizeActivity(days) {
  if (!Array.isArray(days)) throw new Error('Invalid contribution days: expected an array');
  let total = 0, activeDays = 0, longest = 0, streak = 0, previous = null;
  for (const day of days) {
    if (!day || typeof day !== 'object' || Array.isArray(day)) throw new Error('Invalid contribution day');
    const timestamp = requireISODate(day.date, 'contribution date');
    requireCount(day.count, 'contribution count');
    if (previous !== null && timestamp - previous !== 86400000) throw new Error('Contribution dates must be unique, sorted, and continuous');
    if (day.weekday !== undefined && (!Number.isInteger(day.weekday) || day.weekday !== new Date(timestamp).getUTCDay())) throw new Error('Contribution weekday does not match its UTC date');
    previous = timestamp;
    total += day.count;
    requireCount(total, 'contribution total');
    if (day.count > 0) { activeDays++; streak++; longest = Math.max(longest, streak); }
    else streak = 0;
  }
  return { total, activeDays, longestStreak: longest };
}

/** Validate the persisted annual GitHub snapshot before writing or rendering it. */
export function validateActivity(activity) {
  if (!activity || typeof activity !== 'object' || Array.isArray(activity)) throw new Error('Invalid activity snapshot');
  if (activity.schemaVersion !== 1) throw new Error('Unsupported activity schema version');
  requireText(activity.source, 'activity source');
  const updated = requireISODate(activity.updatedOn, 'activity update date');
  const summary = summarizeActivity(activity.days);
  if (activity.days.some(day => day.weekday === undefined)) throw new Error('Snapshot contribution days must include UTC weekdays for the calendar grid');
  // The source calendar pads its first week and can span a leap year. Retain
  // the fetcher's broad annual bounds instead of insisting on exactly 365 days.
  if (activity.days.length < 350 || activity.days.length > 373) throw new Error('Invalid annual contribution calendar length');
  if (!activity.period || typeof activity.period !== 'object' || Array.isArray(activity.period)) throw new Error('Missing activity period');
  requireISODate(activity.period.from, 'activity period start');
  const end = requireISODate(activity.period.to, 'activity period end');
  if (activity.period.from !== activity.days[0].date || activity.period.to !== activity.days.at(-1).date) throw new Error('Activity period does not match contribution dates');
  if (updated < end) throw new Error('Activity update date precedes its calendar');
  for (const [field, expected] of Object.entries(summary)) {
    requireCount(activity[field], `activity ${field}`);
    if (activity[field] !== expected) throw new Error(`Activity ${field} does not match contribution days`);
  }
  requireCount(activity.publicRepositories, 'public repository count');
  if (!Array.isArray(activity.languages)) throw new Error('Invalid activity languages');
  const names = new Set();
  let bytes = 0, percentages = 0, previousBytes = Infinity;
  for (const language of activity.languages) {
    if (!language || typeof language !== 'object' || Array.isArray(language)) throw new Error('Invalid activity language');
    requireText(language.name, 'language name');
    if (names.has(language.name)) throw new Error(`Duplicate activity language: ${language.name}`);
    names.add(language.name);
    requireCount(language.bytes, `language bytes: ${language.name}`);
    if (!Number.isFinite(language.percent) || language.percent < 0 || language.percent > 100) throw new Error(`Invalid language percentage: ${language.name}`);
    if (language.bytes > previousBytes) throw new Error('Activity languages must be sorted by descending bytes');
    previousBytes = language.bytes;
    bytes += language.bytes;
    requireCount(bytes, 'total language bytes');
    percentages += language.percent;
  }
  const epsilon = 1e-7;
  for (const language of activity.languages) {
    const expected = bytes ? language.bytes / bytes * 100 : 0;
    // GitHub bytes are exact; the snapshot rounds display percentages to 0.1%.
    if (Math.abs(language.percent - expected) > 0.05 + epsilon) throw new Error(`Language percentage disagrees with bytes: ${language.name}`);
    if (language.bytes === 0 && language.percent !== 0) throw new Error(`Zero-byte language must have zero percent: ${language.name}`);
  }
  const expectedTotal = bytes ? 100 : 0;
  if (Math.abs(percentages - expectedTotal) > 0.05 * activity.languages.length + epsilon) throw new Error('Language percentages do not sum to the byte distribution');
  return activity;
}
