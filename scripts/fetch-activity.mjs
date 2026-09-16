import { execFileSync } from 'node:child_process';
import { writeChanged, summarizeActivity } from './lib.mjs';

const query = `query ProfileActivity($login: String!, $cursor: String) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount weekday } } }
    }
    repositories(first:100, after:$cursor, privacy:PUBLIC, ownerAffiliations:OWNER, isFork:false) {
      pageInfo { hasNextPage endCursor }
      nodes { name isArchived languages(first:100) { edges { size node { name } } } }
    }
  }
}`;

let cursor = null, calendar, repos = [];
do {
  const response = JSON.parse(execFileSync('gh', ['api','graphql','--input','-'], {
    input: JSON.stringify({query,variables:{login:'MatthewKim323',cursor}}), encoding:'utf8', maxBuffer:8*1024*1024, timeout:30000
  }));
  if (response.errors || !response.data?.user) throw new Error('GitHub returned an incomplete activity response');
  const user = response.data.user;
  calendar ??= user.contributionsCollection.contributionCalendar;
  repos.push(...user.repositories.nodes);
  cursor = user.repositories.pageInfo.hasNextPage ? user.repositories.pageInfo.endCursor : null;
} while (cursor);

const days = calendar.weeks.flatMap(week => week.contributionDays.map(day => ({date:day.date,count:day.contributionCount,weekday:day.weekday})));
const summary = summarizeActivity(days);
if (days.length < 350 || days.length > 373 || summary.total !== calendar.totalContributions) throw new Error('GitHub calendar validation failed; preserving existing snapshot');
const languages = new Map();
for (const repo of repos) for (const edge of repo.languages.edges) languages.set(edge.node.name, (languages.get(edge.node.name) || 0) + edge.size);
const languageBytes = [...languages.values()].reduce((sum,value) => sum+value,0);
const snapshot = {
  schemaVersion:1, updatedOn:new Date().toISOString().slice(0,10),
  source:'GitHub GraphQL contribution calendar; languages from owned public non-fork repositories',
  period:{from:days[0].date,to:days.at(-1).date},
  ...summary, publicRepositories:repos.length,
  languages:[...languages].sort((a,b)=>b[1]-a[1]).map(([name,bytes])=>({name,bytes,percent:Math.round(bytes/languageBytes*1000)/10})),
  days
};
const changed = await writeChanged('data/activity.json', JSON.stringify(snapshot,null,2)+'\n');
console.log(`${changed?'Updated':'Unchanged'} activity snapshot: ${summary.total} contributions, ${summary.activeDays} active days, ${repos.length} public repositories.`);
