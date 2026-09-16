import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root, escapeXML as esc } from './lib.mjs';
import { renderAscii, idlePose } from '../src/bot-core.mjs';

export const palettes = {
  dark:{bg:'#0d1117',fg:'#e2ded5',bright:'#fffaf2',muted:'#a39f97',line:'#30363d',accent:'#ffb577',faint:'#394552'},
  light:{bg:'#ffffff',fg:'#37352f',bright:'#171d24',muted:'#67635b',line:'#d8dee4',accent:'#994509',faint:'#c1c9d2'}
};
const font = (await readFile(path.join(root,'assets/fonts/ProfileMono-Ascii.woff2'))).toString('base64');
const style = `<style>@font-face{font-family:JB;src:url(data:font/woff2;base64,${font}) format('woff2')}text{font-family:JB,monospace;font-variant-ligatures:none}.poster{display:none}@media(prefers-reduced-motion:reduce){.motion{display:none}.poster{display:inline}}</style>`;
const svg = (w,h,title,content) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title"><title id="title">${esc(title)}</title>${style}${content}</svg>\n`;
const text = (x,y,value,size,fill,extra='') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${esc(value)}</text>`;

function poseSVG(pose,c) {
  const cols=96,rows=48,grid=renderAscii({cols,rows,...pose});
  const cw=4.4,ch=8.8,ox=(760-cols*cw)/2,oy=20;
  let out='';
  grid.lines.forEach((line,row)=>{
    const first=line.search(/\S/),last=line.search(/\s*$/);
    if(first<0)return;
    const value=line.slice(first,last);
    out+=text((ox+first*cw).toFixed(2),(oy+row*ch).toFixed(2),value,9.8,c.fg,`xml:space="preserve" textLength="${(value.length*cw).toFixed(2)}" lengthAdjust="spacingAndGlyphs"`);
    for(let col=first;col<last;col++) {
      if(grid.tones[row*cols+col]!==4)continue;
      const start=col;while(col+1<last&&grid.tones[row*cols+col+1]===4)col++;
      const accent=line.slice(start,col+1);
      out+=text((ox+start*cw).toFixed(2),(oy+row*ch).toFixed(2),accent,9.8,c.accent,`xml:space="preserve" textLength="${(accent.length*cw).toFixed(2)}" lengthAdjust="spacingAndGlyphs"`);
    }
  });
  return out;
}

export function botGraphic(theme,{animated=true}={}) {
  const c=palettes[theme],frames=animated?96:1;
  let defs='',motion='';
  for(let i=0;i<frames;i++) {
    defs+=`<g id="p${i}">${poseSVG(idlePose(i*12/frames),c)}</g>`;
    if(!animated)continue;
    const start=(i/frames).toFixed(6),end=((i+1)/frames).toFixed(6);
    const values=i===0?'1;0;0':i===frames-1?'0;1;1':'0;1;0;0';
    const times=i===0?`0;${end};1`:i===frames-1?`0;${start};1`:`0;${start};${end};1`;
    motion+=`<g opacity="${i===0?1:0}"><use xlink:href="#p${i}"/><animate attributeName="opacity" values="${values}" keyTimes="${times}" dur="12s" repeatCount="indefinite" calcMode="discrete"/></g>`;
  }
  const footer=`<path d="M260 458H500" stroke="${c.line}"/>${text(380,484,'MATT / 001',11,c.muted,'text-anchor="middle" letter-spacing="3"')}`;
  return svg(760,504,'A floating ASCII companion with two rounded eyes. Open the live page for cursor tracking.',`<defs>${defs}</defs>${animated?`<g class="motion">${motion}</g><g class="poster"><use xlink:href="#p0"/></g>`:'<use xlink:href="#p0"/>'}${footer}`);
}

export function headingGraphic(label,number,theme) {
  const c=palettes[theme];
  return svg(760,52,label,`${text(0,30,number,11,c.muted)}${text(38,30,label,16,c.fg)}<path d="M${Math.min(700,60+label.length*10)} 25H760" stroke="${c.line}"/>`);
}

export function activityGraphic(activity,theme) {
  const c=palettes[theme];let content='';
  const metrics=[['CONTRIBUTIONS',activity.total.toLocaleString('en-US')],['DAYS BUILDING',String(activity.activeDays)],['LONGEST RUN',`${activity.longestStreak} days`]];
  metrics.forEach(([label,value],i)=>{const x=24+i*246;content+=text(x,33,label,10,c.muted,'letter-spacing="1.4"')+text(x,69,value,26,c.fg);});
  content+=`<path d="M24 90H736" stroke="${c.line}"/>`;
  const firstWeekday=activity.days[0].weekday,weekCount=Math.ceil((firstWeekday+activity.days.length)/7),step=688/(weekCount-1);
  const max=Math.max(1,...activity.days.map(d=>d.count));
  activity.days.forEach((day,i)=>{
    const week=Math.floor((firstWeekday+i)/7),level=day.count===0?0:Math.min(4,1+Math.floor(Math.log1p(day.count)/Math.log1p(max)*3));
    const char=['.','+', '*','#','@'][level];
    content+=`<text x="${(32+week*step).toFixed(1)}" y="${115+day.weekday*14}" font-size="12" fill="${level?c.accent:c.faint}"><title>${day.date}: ${day.count} contributions</title>${char}</text>`;
  });
  content+=text(24,231,`${activity.period.from} to ${activity.period.to}`,10,c.muted)+text(736,231,'one character / one day',10,c.muted,'text-anchor="end"');
  return svg(760,250,`${activity.total} GitHub contributions across ${activity.activeDays} active days. Updated ${activity.updatedOn}.`,content);
}

export function languageGraphic(activity,theme) {
  const c=palettes[theme],top=activity.languages.slice(0,4);
  let content=text(24,24,'PUBLIC REPO LANGUAGE BYTES',10,c.muted,'letter-spacing="1.2"');
  top.forEach((lang,i)=>{
    const x=24+i*183;
    content+=text(x,56,lang.name,12,c.fg)+text(x,79,`${lang.percent}%`,12,c.muted)+`<path d="M${x} 92h150" stroke="${c.line}" stroke-width="2"/><path d="M${x} 92h${Math.max(1,150*lang.percent/100).toFixed(2)}" stroke="${c.accent}" stroke-width="2"/>`;
  });
  return svg(760,116,'Language distribution by bytes across owned public non-fork repositories.',content);
}
