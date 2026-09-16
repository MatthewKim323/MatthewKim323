import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root, escapeXML as esc } from './lib.mjs';
import { renderOcean, LOOP_SECONDS, COLS, ROWS } from '../src/ocean-core.mjs';

export const palettes = {
  dark:{bg:'#0d1117',fg:'#e2ded5',bright:'#fffaf2',muted:'#a39f97',line:'#30363d',accent:'#ffb577',faint:'#394552'},
  light:{bg:'#ffffff',fg:'#37352f',bright:'#171d24',muted:'#67635b',line:'#d8dee4',accent:'#994509',faint:'#c1c9d2'}
};
const font = (await readFile(path.join(root,'assets/fonts/ProfileMono-Ascii.woff2'))).toString('base64');
const style = `<style>@font-face{font-family:JB;src:url(data:font/woff2;base64,${font}) format('woff2')}text{font-family:JB,monospace;font-variant-ligatures:none}.poster{display:none}@media(prefers-reduced-motion:reduce){.motion{display:none}.poster{display:inline}}</style>`;
const svg = (w,h,title,content) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title"><title id="title">${esc(title)}</title>${style}${content}</svg>\n`;
const text = (x,y,value,size,fill,extra='') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${esc(value)}</text>`;

// Neighboring glyphs share a sampled opacity curve. This keeps the SVG compact
// without embedding hundreds of full frames or running scripts inside GitHub.
export function oceanGraphic(theme,{animated=true}={}) {
  const c=palettes[theme],sampleCount=24;
  const frames=Array.from({length:sampleCount},(_,i)=>renderOcean({time:i*LOOP_SECONDS/sampleCount}));
  const alpha=tone=>tone?((tone-1)%8+1)/8:0;
  const cw=760/COLS,ch=380/ROWS,fontSize=Number((ch*.88).toFixed(3));
  const fills=theme==='dark'?['#dae0db','#f2c289']:[c.fg,c.accent];
  let poster='',motion='';
  for(let row=0;row<ROWS;row++)for(let start=0;start<COLS;start+=3){
    // Split warm/cool boundaries rather than bleeding moonlight into the sky.
    const end=Math.min(start+3,COLS);
    for(const warm of [false,true]){
      const cells=[];
      for(let col=start;col<end;col++){
        const i=row*COLS+col;
        const reference=frames.find(frame=>frame.tones[i])?.tones[i]||0;
        if(reference&&((reference>8)===warm))cells.push(col);
      }
      if(!cells.length)continue;
      const values=frames.map(frame=>Number((cells.reduce((sum,col)=>sum+alpha(frame.tones[row*COLS+col]),0)/cells.length).toFixed(3)));
      values.push(values[0]);
      const x=cells.map(col=>((col+.5)*cw).toFixed(2)).join(' ');
      const glyphs=cells.map(col=>frames.find(frame=>frame.lines[row][col]!==' ').lines[row][col]).join('');
      const attrs=`x="${x}" y="${((row+.5)*ch).toFixed(2)}" fill="${fills[Number(warm)]}" opacity="${values[0]}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}"`;
      poster+=`<text ${attrs}>${esc(glyphs)}</text>`;
      const animation=values.some(value=>value!==values[0])?`<animate attributeName="opacity" values="${values.join(';')}" dur="${LOOP_SECONDS}s" repeatCount="indefinite" calcMode="linear"/>`:'';
      motion+=`<text ${attrs}>${esc(glyphs)}${animation}</text>`;
    }
  }
  return svg(760,380,'Moonlight over a quiet ocean, drawn in ASCII characters.',animated?`<g class="motion">${motion}</g><g class="poster">${poster}</g>`:poster);
}

export function headingGraphic(label,theme) {
  const c=palettes[theme];
  return svg(760,52,label,`${text(0,30,label,16,c.fg)}<path d="M${Math.min(700,22+label.length*10)} 25H760" stroke="${c.line}"/>`);
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
