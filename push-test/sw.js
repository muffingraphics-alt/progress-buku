/* MuffinFlow push test service worker - isolated to /progress-buku/push-test/ */
self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
function safeUrl(raw){
  try{
    const url=new URL(raw||"./",self.registration.scope);
    if(url.origin!==self.location.origin)return new URL("./",self.registration.scope).href;
    return url.href;
  }catch(_){return new URL("./",self.registration.scope).href;}
}
self.addEventListener("push",event=>{
 event.waitUntil((async()=>{
   let data={};
   try{data=event.data?event.data.json():{};}catch(_){data={body:event.data?event.data.text():""};}
   const payload=(data&&typeof data==="object")?data:{};
   const n=payload.notification||payload.data?.notification||{};
   const extra=payload.data||{};
   const title=String(n.title||extra.title||payload.title||"🧁 MuffinFlow");
   const body=String(n.body||extra.body||payload.body||"Ada pemberitahuan baru.");
   await self.registration.showNotification(title,{
     body,icon:"../install/icon-192.png",badge:"../install/icon-192.png",
     tag:extra.tag||"mf-push-test-"+Date.now(),
     data:{url:safeUrl(extra.url||"./")},
     vibrate:[120,70,120]
   });
 })());
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const url=safeUrl(event.notification.data&&event.notification.data.url);
 event.waitUntil((async()=>{
   const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
   const existing=windows.find(w=>w.url===url);
   if(existing)return existing.focus();
   return self.clients.openWindow(url);
 })());
});