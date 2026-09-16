import { readJSON, validateProfile, writeChanged } from './lib.mjs';
import { botGraphic, headingGraphic, activityGraphic, languageGraphic } from './graphics.mjs';

const profile=validateProfile(await readJSON('data/profile.json'));
const activity=await readJSON('data/activity.json');
const site='https://matthewkim323.github.io/MatthewKim323/';
const picture=(name,alt,width=760)=>`<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="./assets/${name}-dark.svg">\n  <img src="./assets/${name}-light.svg" width="${width}" alt="${alt}">\n</picture>`;
const section=(label,index)=>picture(`heading-${index}`,label);
const projectLine=p=>`**${p.url?`[${p.name}](${p.url})`:p.name}**${p.award?` · ${p.award}`:''}<br>\n${p.description}${p.stack.length?`<br>\n<sub>${p.stack.join(' · ')}</sub>`:''}`;
const featured=profile.projects.filter(p=>p.featured);
const archive=profile.projects.filter(p=>!p.featured&&p.category!=='tool');
const tools=profile.projects.filter(p=>!p.featured&&p.category==='tool');

const readme=`<!-- Generated from data/profile.json by npm run generate. See docs/DEVELOPMENT.md. -->
<div align="center">

<a href="${site}" aria-label="Meet matt's interactive ASCII bot">
${picture('bot','An original ASCII robot. Click to meet the cursor-tracking version.',620)}
</a>

# ${profile.name}

<samp>${profile.tagline}</samp>

${profile.links.map(l=>`[${l.label}](${l.url})`).join(' &nbsp; / &nbsp; ')} &nbsp; / &nbsp; [meet the bot ↗](${site})

</div>

${section('about',1)}

> ${profile.headline}<br>
> ${profile.awardsLabel}.

${profile.bio.join('\n\n')}

<samp>${profile.focus.join(' &nbsp; / &nbsp; ')}</samp>

${section('selected work',2)}

${featured.map(projectLine).join('\n\n')}

<details>
<summary><strong>more things i've built</strong></summary>
<br>

${archive.map(projectLine).join('\n\n')}

</details>

${section('tools i build with',3)}

${tools.map(projectLine).join('\n\n')}

${section('the build log',4)}

${picture('activity',`${activity.total.toLocaleString('en-US')} contributions across ${activity.activeDays} active days in the displayed period.`)}

${picture('languages','Language bytes across owned public non-fork repositories.')}

<sub>GitHub-reported activity · public repository language bytes · refreshed ${activity.updatedOn}</sub>

${section('under the hood',5)}

The character is drawn from 3D geometry into a grid of ASCII characters. On GitHub, it runs a quiet idle loop. On the [live page](${site}), its eyes and head follow your cursor.

One character engine powers both. The graphics, font, and activity snapshot live in this repo. Light and dark themes, reduced motion, and a static fallback are built in. [How it works](./docs/DEVELOPMENT.md) · [character engine](./src/bot-core.mjs).

<div align="center"><sub>built with care. kept in motion.</sub></div>
`;

let changed=0;
for(const theme of ['dark','light']) {
  changed+=await writeChanged(`assets/bot-${theme}.svg`,botGraphic(theme));
  changed+=await writeChanged(`assets/bot-still-${theme}.svg`,botGraphic(theme,{animated:false}));
  for(const [index,label] of ['about','selected work','tools i build with','the build log','under the hood'].entries()) changed+=await writeChanged(`assets/heading-${index+1}-${theme}.svg`,headingGraphic(label,`0${index+1}`,theme));
  changed+=await writeChanged(`assets/activity-${theme}.svg`,activityGraphic(activity,theme));
  changed+=await writeChanged(`assets/languages-${theme}.svg`,languageGraphic(activity,theme));
}
changed+=await writeChanged('README.md',readme);
console.log(`Generated profile: ${changed} files changed.`);
