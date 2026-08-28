const statusElement = document.getElementById("status");

function bindAutoHideHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  let lastY = Math.max(0, window.scrollY);
  let ticking = false;

  function update() {
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    if (y <= 16 || delta < 0 || header.matches(":focus-within")) {
      header.classList.remove("is-scroll-hidden");
    } else if (delta > 0 && y > header.offsetHeight) {
      header.classList.add("is-scroll-hidden");
    }
    lastY = y;
    ticking = false;
  }

  header.addEventListener("focusin", () => header.classList.remove("is-scroll-hidden"));
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
}

bindAutoHideHeader();

const appUrl = window.SITE_VERSION.asset(
  new URL("app.js", import.meta.url).href,
);
const imageSizeHoldUrl = window.SITE_VERSION.asset(
  new URL("image-size-hold.js", import.meta.url).href,
);
const koboImageProcessUrl = window.SITE_VERSION.asset(
  new URL("kobo-image-process.js", import.meta.url).href,
);

try {
  await import(appUrl);
  await import(imageSizeHoldUrl);
  await import(koboImageProcessUrl);
} catch (error) {
  console.error("[KoboForge] Application startup failed", error);
  if (statusElement) {
    statusElement.textContent =
      "KoboForge could not start. Refresh the page and try again.";
  }
}
