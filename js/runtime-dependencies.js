export const RUNTIME_DEPENDENCIES = Object.freeze({
  jszip: Object.freeze({
    globalName: "JSZip",
    label: "EPUB packaging tools",
    url: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  }),
  mammoth: Object.freeze({
    globalName: "mammoth",
    label: "DOCX converter",
    url: "https://unpkg.com/mammoth@1.12.0/mammoth.browser.min.js",
  }),
  pdfjs: Object.freeze({
    key: "pdfjs",
    label: "PDF converter",
    url: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs",
    workerUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs",
  }),
});

export class RuntimeDependencyError extends Error {
  constructor(label, cause) {
    super(`${label} could not load. Check your connection, then try again.`);
    this.name = "RuntimeDependencyError";
    if (cause !== undefined) this.cause = cause;
  }
}

export function createScriptDependencyLoader({
  documentRef = globalThis.document,
  globalRef = globalThis.window || globalThis,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
} = {}) {
  const pending = new Map();

  return function loadScriptDependency(dependency, { timeoutMs = 12000 } = {}) {
    const { globalName, label, url } = dependency || {};
    if (!documentRef || !globalName || !label || !url) {
      return Promise.reject(new TypeError("Invalid script dependency descriptor"));
    }
    if (globalRef[globalName]) return Promise.resolve(globalRef[globalName]);
    if (pending.has(globalName)) return pending.get(globalName);

    const script = documentRef.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.koboforgeDependency = globalName;

    let timerId;
    const promise = new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeoutFn(timerId);
        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);
      };
      const fail = (cause) => {
        cleanup();
        reject(new RuntimeDependencyError(label, cause));
      };
      const handleLoad = () => {
        if (!globalRef[globalName]) {
          fail(new Error(`${globalName} was unavailable after its script loaded`));
          return;
        }
        cleanup();
        resolve(globalRef[globalName]);
      };
      const handleError = () => fail(new Error(`Failed to fetch ${url}`));

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      timerId = setTimeoutFn(
        () => fail(new Error(`Timed out after ${timeoutMs} ms`)),
        timeoutMs,
      );
      (documentRef.head || documentRef.documentElement).appendChild(script);
    });

    pending.set(globalName, promise);
    promise.then(
      () => {},
      () => {
        if (pending.get(globalName) === promise) pending.delete(globalName);
        script.remove();
      },
    );
    return promise;
  };
}

export function createModuleDependencyLoader({
  importFn = (url) => import(url),
} = {}) {
  const pending = new Map();

  return function loadModuleDependency(dependency) {
    const { key, label, url } = dependency || {};
    if (!key || !label || !url) {
      return Promise.reject(new TypeError("Invalid module dependency descriptor"));
    }
    if (pending.has(key)) return pending.get(key);

    let imported;
    try {
      imported = importFn(url);
    } catch (error) {
      return Promise.reject(new RuntimeDependencyError(label, error));
    }
    const promise = Promise.resolve(imported).catch((error) => {
      if (pending.get(key) === promise) pending.delete(key);
      throw new RuntimeDependencyError(label, error);
    });
    pending.set(key, promise);
    return promise;
  };
}
