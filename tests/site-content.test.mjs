import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderContacts, renderProfileHtml, renderProject } from '../scripts/site-content.mjs';

const template = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
const profile = JSON.parse(await readFile(new URL('../data/profile.json', import.meta.url), 'utf8'));

test('static HTML contains every project exactly once before JavaScript executes', () => {
  const html = renderProfileHtml(template, profile);
  for (const project of profile.projects) {
    assert.equal(html.split(`data-project="${project.id}"`).length - 1, 1, `${project.id} is present exactly once`);
  }
  assert.equal((html.match(/data-project=/g) ?? []).length, profile.projects.length);
  assert.ok(!html.includes('{{'));
  assert.ok(html.includes(profile.headline));
  assert.ok(html.includes('<details class="archive" id="archive">'));
  assert.ok(!html.includes('id="workbench" aria-labelledby="workbench-title" hidden'));
});

test('unlinked projects remain text and do not navigate to the current page', () => {
  const row = renderProject(profile.projects.find(project => project.id === 'jabby'), 0);
  assert.ok(row.includes('<h3>jabby</h3>'));
  assert.ok(!row.includes('<a '));
});

test('HTML generation escapes hostile content and rejects executable URLs', () => {
  const project = {
    id: 'test" onmouseover="alert(1)', name: '<script>alert(1)</script>',
    url: 'javascript:alert(1)', description: '<img src=x onerror=alert(1)>',
    award: '" onfocus="alert(1)', stack: ['<svg onload=alert(1)>'],
  };
  const row = renderProject(project, 0);
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
