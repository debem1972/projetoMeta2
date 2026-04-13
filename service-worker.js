const STATIC_CACHE = "pm2-static-v2";
const RUNTIME_CACHE = "pm2-runtime-v2";

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

const EXTERNAL_ASSETS = [
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
    "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css",
    "https://cdn.jsdelivr.net/npm/chart.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(STATIC_CACHE);

            await cache.addAll(LOCAL_ASSETS);

            await Promise.all(
                EXTERNAL_ASSETS.map(async (url) => {
                    try {
                        const response = await fetch(url, { mode: "no-cors" });
                        await cache.put(url, response);
                    } catch (error) {
                        console.warn("Nao foi possivel armazenar recurso externo no cache:", url, error);
                    }
                })
            );

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

    event.respondWith(
        (async () => {
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
                return cachedResponse;
            }

            try {
                const networkResponse = await fetch(event.request);

                if (event.request.url.startsWith(self.location.origin)) {
                    const runtimeCache = await caches.open(RUNTIME_CACHE);
                    runtimeCache.put(event.request, networkResponse.clone());
                }

                return networkResponse;
            } catch (error) {
                return cachedResponse || Response.error();
            }
        })()
    );
});
