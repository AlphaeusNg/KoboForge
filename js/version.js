/**
 * KoboForge deployment stamp.
 * Format: YYYY.MM.DD.N (N = revision that day).
 */
(function (global) {
  "use strict";

  global.SITE_VERSION = {
    id: "2026.08.11.4",
    repo: "KoboForge",
    label: "Kobo EPUB converter",
    asset: function (path) {
      return path + "?v=" + encodeURIComponent(this.id);
    },
  };

  function paintVersion() {
    var element =
      global.document && global.document.getElementById("site-version");
    if (element) {
      element.textContent =
        "v" + global.SITE_VERSION.id + " · " + global.SITE_VERSION.repo;
    }
  }

  if (global.document && global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", paintVersion, {
      once: true,
    });
  } else {
    paintVersion();
  }
})(window);
