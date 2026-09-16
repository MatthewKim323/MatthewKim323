import { readJSON, validateProfile, validateActivity, writeChanged, escapeMarkdown as md, escapeXML as html } from './lib.mjs';
import { botGraphic, headingGraphic, activityGraphic, languageGraphic } from './graphics.mjs';

const profile=validateProfile(await readJSON('data/profile.json'));
const activity=validateActivity(await readJSON('data/activity.json'));
const site='https://matthewkim323.github.io/MatthewKim323/';
const picture=(name,alt,width=760)=>`<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="./assets/${name}-dark.svg">\n  <img src="./assets/${name}-light.svg" width="${width}" alt="${alt}">\n</picture>`;
const section=(label,key)=>picture(`heading-${key}`,label);
const projectLine=p=>`**${p.url?`[${md(p.name)}](${p.url})`:md(p.name)}**${p.award?` · ${md(p.award)}`:''}<br>\n${md(p.description)}${p.stack.length?`<br>\n<sub>${html(p.stack.join(' · '))}</sub>`:''}`;
const featured=profile.projects.filter(p=>p.featured);
const archive=profile.projects.filter(p=>!p.featured&&p.category!=='tool');

const readme=`<!-- Generated from data/profile.json by npm run generate. See docs/DEVELOPMENT.md. -->
<div align="center">

<a href="${site}" aria-label="Meet matt's interactive ASCII bot">
${picture('bot','A floating ASCII companion. Click to meet the cursor-tracking version.',620)}
</a>

# ${md(profile.name)}

<samp>${html(profile.tagline)}</samp>

${profile.links.map(l=>`[${md(l.label)}](${l.url})`).join(' &nbsp; / &nbsp; ')} &nbsp; / &nbsp; [meet the bot ↗](${site})

</div>

${section('about','about')}

> ${md(profile.headline)}<br>
> ${md(profile.awardsLabel)}.

${profile.bio.map(md).join('\n\n')}

<samp>${profile.focus.map(html).join(' &nbsp; / &nbsp; ')}</samp>

${section('selected work','work')}

${featured.map(projectLine).join('\n\n')}

<details>
<summary><strong>more things i've built</strong></summary>
<br>

${archive.map(projectLine).join('\n\n')}

</details>

${section('the build log','activity')}

${picture('activity',`${activity.total.toLocaleString('en-US')} contributions across ${activity.activeDays} active days in the displayed period.`)}

${picture('languages','Language bytes across owned public non-fork repositories.')}

<sub>GitHub-reported activity · public repository language bytes · refreshed ${activity.updatedOn}</sub>
`;

let changed=0;
for(const theme of ['dark','light']) {
  changed+=await writeChanged(`assets/bot-${theme}.svg`,botGraphic(theme));
  changed+=await writeChanged(`assets/bot-still-${theme}.svg`,botGraphic(theme,{animated:false}));
  for(const [key,label] of [['about','about'],['work','selected work'],['activity','the build log']]) changed+=await writeChanged(`assets/heading-${key}-${theme}.svg`,headingGraphic(label,theme));
  changed+=await writeChanged(`assets/activity-${theme}.svg`,activityGraphic(activity,theme));
  changed+=await writeChanged(`assets/languages-${theme}.svg`,languageGraphic(activity,theme));
}
changed+=await writeChanged('README.md',readme);
console.log(`Generated profile: ${changed} files changed.`);
