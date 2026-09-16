import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderContacts, renderProfileHtml, renderProject } from '../scripts/site-content.mjs';

const template = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
const profile = JSON.parse(await readFile(new URL('../data/profile.json', import.meta.url), 'utf8'));
const portfolioProjects = profile.projects.filter(project => project.category !== 'tool');

test('static HTML contains every portfolio project exactly once before JavaScript executes', () => {
  const html = renderProfileHtml(template, profile);
  for (const project of portfolioProjects) {
    assert.equal(html.split(`data-project="${project.id}"`).length - 1, 1, `${project.id} is present exactly once`);
  }
  assert.equal((html.match(/data-project=/g) ?? []).length, portfolioProjects.length);
  assert.ok(!html.includes('{{'));
  assert.ok(html.includes(profile.headline));
  assert.ok(html.includes('<details class="archive" id="archive">'));
});

test('the public site omits tools, decorative numbering, and implementation copy', () => {
  const html = renderProfileHtml(template, profile);
  for (const project of profile.projects.filter(project => project.category === 'tool')) {
    assert.ok(!html.includes(`data-project="${project.id}"`));
  }
  for (const removed of ['project-index', 'work-count', 'archive-count', 'workbench', 'tools-list', 'ascii companion /', 'made of characters', '<noscript>']) {
    assert.ok(!html.includes(removed), `${removed} remains absent`);
  }
  assert.ok(!/\b0[1-9] \/ /.test(html));
  assert.ok(html.includes('data-project="1to1"'), 'meaningful project numbers stay');
  assert.ok(html.includes(profile.awardsLabel), 'meaningful award numbers stay');
});

test('tool projects stay omitted even when marked featured in source data', () => {
  const promotedTools = { ...profile, projects: profile.projects.map(project => project.category === 'tool' ? { ...project, featured: true } : project) };
  const html = renderProfileHtml(template, promotedTools);
  assert.equal((html.match(/data-project=/g) ?? []).length, portfolioProjects.length);
});

test('unlinked projects remain text and do not navigate to the current page', () => {
  const row = renderProject({
    id: 'private-prototype', name: 'private prototype', description: 'a project without a public destination.',
    url: '', stack: [], category: 'archive', featured: false,
  });
  assert.ok(row.includes('<h3>private prototype</h3>'));
  assert.ok(!row.includes('<a '));
});

test('HTML generation escapes hostile content and rejects executable URLs', () => {
  const project = {
    id: 'test" onmouseover="alert(1)', name: '<script>alert(1)</script>',
    url: 'javascript:alert(1)', description: '<img src=x onerror=alert(1)>',
    award: '" onfocus="alert(1)', stack: ['<svg onload=alert(1)>'],
  };
  const row = renderProject(project);
  assert.ok(!row.includes('<script>'));
  assert.ok(!row.includes('<img '));
  assert.ok(!row.includes('href='));
  assert.ok(row.includes('&lt;script&gt;'));
  assert.ok(row.includes('test&quot; onmouseover=&quot;'));
});

test('contact rendering deduplicates email and ignores unsupported links', () => {
  const contacts = renderContacts({ email: 'hello@example.com', links: [
    { label: 'same email', url: 'mailto:hello@example.com' },
    { label: 'github', url: 'https://github.com/example' },
    { label: 'unsafe', url: 'javascript:alert(1)' },
  ] });
  assert.equal((contacts.match(/mailto:/g) ?? []).length, 1);
  assert.equal((contacts.match(/<a /g) ?? []).length, 2);
});

test('template drift fails the build instead of publishing missing content', () => {
  assert.throws(() => renderProfileHtml(template.replace('{{BIO}}', ''), profile), /Missing HTML template slot: BIO/);
  assert.throws(() => renderProfileHtml(`${template}{{UNRECOGNIZED}}`, profile), /Unknown HTML template slot/);
});


test('the selected ocean replaces the old character without interaction or implementation copy', () => {
  const html = renderProfileHtml(template, profile);
  assert.ok(html.includes('id="ocean-canvas"'));
  assert.ok(html.includes('id="ocean-stage"'));
  assert.ok(html.includes('ocean-still-dark.svg'));
  assert.ok(html.includes('ocean-still-light.svg'));
  assert.ok(html.includes('width="760" height="380"'));
  for (const removed of ['bot-canvas', 'bot-stage', 'bot-fallback', 'data-look', 'ascii companion', 'move your cursor']) {
    assert.ok(!html.includes(removed), `${removed} stays removed`);
  }
});
