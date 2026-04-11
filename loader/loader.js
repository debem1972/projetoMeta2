const pm2Loader = document.querySelector(".pm2-loader");

if (pm2Loader) {
    window.addEventListener("load", () => {
        const minimumDisplayTime = 3000;

        window.setTimeout(() => {
            pm2Loader.classList.add("is-hidden");

            window.setTimeout(() => {
                pm2Loader.remove();
            }, 550);
        }, minimumDisplayTime);
    });
}
