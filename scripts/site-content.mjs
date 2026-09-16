import { escapeXML } from './lib.mjs';

const arrow = '<span aria-hidden="true">↗</span>';
const text = escapeXML;

function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ['https:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function title(project) {
  const href = safeUrl(project.url);
  return href ? `<a href="${text(href)}">${text(project.name)} ${arrow}</a>` : text(project.name);
}

export function renderProject(project, index, tool = false) {
  const identity = `data-project="${text(project.id)}"`;
  if (tool) return `<article class="tool-row" ${identity}><h3>${title(project)}</h3><p>${text(project.description)}</p></article>`;
  const award = project.award ? `<span class="project-award">${text(project.award)}</span>` : '';
  const stack = project.stack.length ? `<ul class="stack-list" aria-label="built with">${project.stack.map(item => `<li>${text(item)}</li>`).join('')}</ul>` : '';
  return `<article class="project-row" ${identity}><span class="project-index">${String(index + 1).padStart(2, '0')}</span><div class="project-heading"><h3>${title(project)}</h3>${award}</div><div class="project-details"><p>${text(project.description)}</p>${stack}</div></article>`;
}

export function renderContacts(profile) {
  const seen = new Set();
  const candidates = [{ label: 'get in touch', url: `mailto:${profile.email}`, primary: true }, ...profile.links];
  return candidates.map(link => {
    const href = safeUrl(link.url);
    if (!href || seen.has(href)) return '';
    seen.add(href);
    return `<a class="${link.primary ? 'text-link' : 'quiet-link'}" href="${text(href)}">${text(link.label)} ${arrow}</a>`;
  }).join('');
}

/**
 * The entire document is generated from the same source as the GitHub README.
 * No client-side fetch or JavaScript is required to read any project or contact.
 * Text and attribute contexts are escaped before the template is populated.
 */
export function renderProfileHtml(template, profile) {
  const featured = profile.projects.filter(project => project.featured || project.category === 'featured');
  const archive = profile.projects.filter(project => !project.featured && project.category === 'archive');
  const tools = profile.projects.filter(project => !project.featured && project.category === 'tool');
  const [first, ...last] = profile.name.split(/\s+/);
  const heroName = last.length
    ? `<span>${text(first)}</span><br><span>${text(last.join(' '))}<span class="title-period">.</span></span>`
    : `<span>${text(first)}<span class="title-period">.</span></span>`;
  const slots = {
    NAME: text(profile.name),
    HANDLE: text(profile.handle.toLowerCase()),
    PAGE_TITLE: text(`${profile.name} / ${profile.tagline}`),
    DESCRIPTION: text(`${profile.name}. ${profile.headline} Selected work, open-source tools, and an original ASCII companion.`),
    HERO_NAME: heroName,
    TAGLINE: text(profile.tagline),
    HEADLINE: text(profile.headline),
    AWARDS: text(profile.awardsLabel),
    BIO: profile.bio.map(paragraph => `<p>${text(paragraph)}</p>`).join(''),
    FOCUS: profile.focus.map(item => `<li>${text(item)}</li>`).join(''),
    WORK_COUNT: `${String(featured.length).padStart(2, '0')} selected`,
    FEATURED_PROJECTS: featured.map((project, index) => renderProject(project, index)).join('\n'),
    ARCHIVE_SECTION: archive.length ? `<details class="archive" id="archive"><summary><span>the rest of the rabbit hole <span id="archive-count">(${archive.length})</span></span><span class="archive-toggle" aria-hidden="true">+</span></summary><div id="archive-projects" class="archive-projects">${archive.map((project, index) => renderProject(project, index)).join('\n')}</div></details>` : '',
    TOOLS_SECTION: tools.length ? `<section class="workbench-section" id="workbench" aria-labelledby="workbench-title"><div class="section-heading"><div><p class="section-code">03 / the workbench</p><h2 id="workbench-title">tools i build to keep building.</h2></div><span class="section-note">open source</span></div><div class="tools-list" id="tools-list">${tools.map((project, index) => renderProject(project, index, true)).join('\n')}</div></section>` : '',
    NOW_SECTION: profile.now.length ? `<section class="now-section" id="now-section" aria-labelledby="now-title"><p class="section-code" id="now-title">currently thinking about</p><ul id="now-list">${profile.now.map(item => `<li>${text(item)}</li>`).join('')}</ul></section>` : '',
    CONTACTS: renderContacts(profile),
  };
  const used = new Set();
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, slot) => {
    if (!Object.hasOwn(slots, slot)) throw new Error(`Unknown HTML template slot: ${slot}`);
    used.add(slot);
    return slots[slot];
  });
  for (const slot of Object.keys(slots)) if (!used.has(slot)) throw new Error(`Missing HTML template slot: ${slot}`);
  return html;
}
