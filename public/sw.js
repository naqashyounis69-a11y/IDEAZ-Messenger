const CACHE_NAME="ideaz-shell-v3";
const SHELL=["/login","/register","/manifest.webmanifest","/assets/ideaz-icon.svg","/css/theme.css","/css/auth.css","/css/pwa.css","/js/pwa.js"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{const request=event.request;const url=new URL(request.url);if(request.method!=="GET"||url.origin!==self.location.origin)return;if(url.pathname.startsWith("/api/")||url.pathname.startsWith("/socket.io/")||url.pathname.startsWith("/uploads/"))return;if(request.mode==="navigate"){event.respondWith(fetch(request).catch(()=>caches.match("/login")));return}event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response}))) });
self.addEventListener("push", event => {
  let data = {}; try { data = event.data?.json() || {}; } catch { data = { title: "IDEAZ Messenger", body: event.data?.text() || "New notification" }; }
  event.waitUntil(self.registration.showNotification(data.title || "IDEAZ Messenger", {
    body: data.body || "New activity", icon: "/assets/ideaz-icon.svg", badge: "/assets/ideaz-icon.svg",
    tag: data.tag || "ideaz", renotify: true, requireInteraction: Boolean(data.requireInteraction),
    vibrate: data.type === "call" ? [700,300,700,300,700,300,700] : [250,100,250],
    data: { url: data.url || "/chat", type: data.type || "message" }, actions: data.type === "call" ? [{action:"open",title:"Open call"},{action:"dismiss",title:"Dismiss"}] : []
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close(); if (event.action === "dismiss") return;
  const target = new URL(event.notification.data?.url || "/chat", self.location.origin).href;
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list => {
    for (const client of list) { if (client.url.startsWith(self.location.origin)) { client.navigate(target); return client.focus(); } }
    return clients.openWindow(target);
  }));
});
