import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { root } from './lib.mjs';

const base = path.join(root,'dist');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.gif':'image/gif'};
const server = createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    let name = decodeURIComponent(url.pathname).replace(/^\/MatthewKim323(?=\/|$)/,'');
    if (name.endsWith('/')) name += 'index.html';
    const file = path.resolve(base,'.'+name);
    if (!file.startsWith(base+path.sep)) {res.writeHead(403);res.end('Forbidden');return;}
    if (!(await stat(file)).isFile()) throw Object.assign(new Error('Not found'),{code:'ENOENT'});
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(await readFile(file));
  } catch(error) {res.writeHead(error.code==='ENOENT'?404:400);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Profile preview: http://127.0.0.1:${port}/MatthewKim323/`));
for (const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>server.close(()=>process.exit(0)));
