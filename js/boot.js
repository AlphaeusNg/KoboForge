const statusElement = document.getElementById("status");
const appUrl = window.SITE_VERSION.asset(
  new URL("app.js", import.meta.url).href,
);

try {
  await import(appUrl);
} catch (error) {
  console.error("[KoboForge] Application startup failed", error);
  if (statusElement) {
    statusElement.textContent =
      "KoboForge could not start. Refresh the page and try again.";
  }
}
