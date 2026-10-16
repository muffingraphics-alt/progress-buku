/* MuffinFlow v5.0 - shared launcher and push worker for ONE installed app. */
const NAME='muffinflow-install-v5-badge2';
const LOCAL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./badge-muffin-96.png','./activate.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(NAME).then(cache=>cache.addAll(LOCAL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith('muffinflow-install-')&&n!==NAME).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const u=new URL(event.request.url);
 if(u.origin!==self.location.origin||!u.pathname.startsWith('/progress-buku/install/'))return;
 event.respondWith(fetch(event.request).then(res=>{if(res.ok){const clone=res.clone();event.waitUntil(caches.open(NAME).then(cache=>cache.put(event.request,clone)));}return res;}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let p={};try{p=event.data?event.data.json():{};}catch(_){p={body:event.data?event.data.text():''};}
  const d=(p&&p.data)||{};
  const title=String(d.title||p.notification?.title||'🧁 MuffinFlow');
  const body=String(d.body||p.notification?.body||'Ada pemberitahuan baru.');
  await self.registration.showNotification(title,{
   body,icon:'./icon-192.png',badge:'./badge-muffin-96.png',
   tag:d.tag||'mf-'+Date.now(),data:{url:'./'},vibrate:[110,70,110]
  });
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL('./',self.registration.scope).href;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=windows.find(w=>w.url.startsWith(self.registration.scope));
  if(existing)return existing.focus();
  return self.clients.openWindow(url);
 })());
});