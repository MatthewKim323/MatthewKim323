import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const readJSON = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'));
export const escapeXML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));

export async function writeChanged(name, content) {
  const target = path.join(root, name);
  const old = await readFile(target, 'utf8').catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  if (old === content) return false;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
  return true;
}

export function validateProfile(profile) {
  for (const key of ['name','handle','tagline','headline','email','awardsLabel']) {
    if (typeof profile[key] !== 'string' || !profile[key].trim()) throw new Error(`Missing profile.${key}`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) throw new Error('Invalid email');
  for (const key of ['projects','links','focus','bio','now']) if (!Array.isArray(profile[key])) throw new Error(`Missing profile.${key}`);
  const ids = new Set();
  for (const project of profile.projects) {
    if (!project.id || ids.has(project.id)) throw new Error(`Duplicate or missing project id: ${project.id}`);
    ids.add(project.id);
    if (!project.name || !project.description || !Array.isArray(project.stack)) throw new Error(`Incomplete project: ${project.id}`);
    if (!['featured','archive','tool'].includes(project.category)) throw new Error(`Invalid category: ${project.id}`);
    if (project.url && !/^https:\/\//.test(project.url)) throw new Error(`Unsafe project URL: ${project.id}`);
  }
  for (const link of profile.links) if (!link.label || !/^(https:\/\/|mailto:)/.test(link.url)) throw new Error('Invalid contact link');
  return profile;
}

export function summarizeActivity(days) {
  let total = 0, activeDays = 0, longest = 0, streak = 0;
  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isInteger(day.count) || day.count < 0) throw new Error('Invalid contribution day');
    total += day.count;
    if (day.count > 0) { activeDays++; streak++; longest = Math.max(longest, streak); }
    else streak = 0;
  }
  return { total, activeDays, longestStreak: longest };
}
