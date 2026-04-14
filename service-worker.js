const STATIC_CACHE = "pm2-static-v3";
const RUNTIME_CACHE = "pm2-runtime-v3";

const LOCAL_ASSETS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./css/style1.css",
    "./loader/loader.css",
    "./loader/loader.js",
    "./pwa/register-sw.js",
    "./pwa/icons/icon-192.png",
    "./pwa/icons/icon-512.png",
    "./js/indexedDbStorage.js",
    "./js/indexVictorRelat.js",
    "./js/editModal11.js",
    "./js/analiseGastos8Victor.js",
    "./js/conselhoDeIa2Victor.js",
    "./js/dashboard6.js",
    "./fonts/the_orb_report/The-Orb-Report.ttf",
    "./sound/audioConceitoGastos.mp3",
    "./sound/audioConceitoMeta.mp3",
    "./sound/audioConceitoReceita.mp3",
    "./sound/chachRegister.mp3",
    "./sound/erroSoundMensAlert.mp3",
    "./sound/novoLimiteAudioVoice.mp3"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(STATIC_CACHE);

            await cache.addAll(LOCAL_ASSETS);

            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();

            await Promise.all(
                keys
                    .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
                    .map((key) => caches.delete(key))
            );

            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    if (event.request.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    const networkResponse = await fetch(event.request);
                    const runtimeCache = await caches.open(RUNTIME_CACHE);
                    runtimeCache.put(event.request, networkResponse.clone());
                    return networkResponse;
                } catch (error) {
                    const cachedPage = await caches.match(event.request);
                    return cachedPage || caches.match("./index.html");
                }
            })()
        );
        return;
    }

    if (!event.request.url.startsWith(self.location.origin)) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        (async () => {
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
                return cachedResponse;
            }

            try {
                const networkResponse = await fetch(event.request);
                const runtimeCache = await caches.open(RUNTIME_CACHE);
                runtimeCache.put(event.request, networkResponse.clone());
                return networkResponse;
            } catch (error) {
                return Response.error();
            }
        })()
    );
});
