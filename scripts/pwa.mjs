import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const all = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
    ),
  );
  return all.flat();
}
const assets = (await files('out')).filter((p) => !p.endsWith('/sw.js'));
const hash = createHash('sha256');
for (const path of assets) hash.update(await readFile(path));
const version = hash.digest('hex').slice(0, 12);
const urls = assets.map((p) => '/' + p.slice(4));
urls.push('/');
const source = `const CACHE='migraine-${version}'; const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('migraine-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(async cache=>{if(event.request.mode==='navigate'){try{return await fetch(event.request);}catch{return await cache.match('/')||Response.error();}}const cached=await cache.match(event.request);return cached||fetch(event.request);}));});
`;
await writeFile('out/sw.js', source);
console.log('PWA: ' + urls.length + ' assets precached, version ' + version);
