if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
            await navigator.serviceWorker.register("./service-worker.js");
        } catch (error) {
            console.error("Falha ao registrar o service worker:", error);
        }
    });
}
