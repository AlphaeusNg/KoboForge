import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const jsZipBrowserPath = fileURLToPath(
  new URL("../../node_modules/jszip/dist/jszip.min.js", import.meta.url),
);
const runtimeErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.addInitScript({ path: jsZipBrowserPath });
  await page.route(/^https:\/\//, async (route) => {
    const resourceType = route.request().resourceType();
    const contentType = resourceType === "stylesheet"
      ? "text/css"
      : "application/javascript";
    await route.fulfill({ status: 200, contentType, body: "" });
  });
});

test.afterEach(async ({ page }) => {
  await page.waitForTimeout(100);
  expect(runtimeErrors.get(page), "unexpected browser runtime errors").toEqual([]);
});

test("imports TXT, exports a direct Kobo edit, and packages metadata", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#deviceSpec")).not.toHaveText("—");

  await page.locator("#fileInput").setInputFiles({
    name: "browser-smoke.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Original browser smoke text."),
  });

  const preview = page.locator("#deviceBookContent");
  await expect(page.locator("#status")).toHaveText(
    "TXT ready · editable · Kobo Libra Colour",
  );
  await expect(page.locator("#downloadBtn")).toBeEnabled();
  await expect(preview).toHaveAttribute("contenteditable", "true");
  await expect(preview).toContainText("Original browser smoke text.");

  await page.locator("#bookTitle").fill("Browser Smoke Title");
  await page.locator("#bookAuthor").fill("KoboForge Test");
  await preview.evaluate((element) => {
    const paragraph = element.querySelector("p");
    if (!paragraph) throw new Error("TXT preview did not contain an editable paragraph");
    paragraph.textContent = "Edited inside the paginated Kobo preview.";
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: "Edited inside the paginated Kobo preview.",
    }));
  });
  await expect(page.locator("#editedBadge")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#downloadBtn").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("browser-smoke-title.epub");
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  const archive = await JSZip.loadAsync(await readFile(downloadPath));
  const mimetype = await archive.file("mimetype").async("string");
  const chapter = await archive.file("OEBPS/chapter-1.xhtml").async("string");
  const packageDocument = await archive.file("OEBPS/content.opf").async("string");

  expect(mimetype).toBe("application/epub+zip");
  expect(chapter).toContain("Edited inside the paginated Kobo preview.");
  expect(chapter).not.toContain("Original browser smoke text.");
  expect(packageDocument).toContain("<dc:title>Browser Smoke Title</dc:title>");
  expect(packageDocument).toContain("<dc:creator>KoboForge Test</dc:creator>");
  await expect(page.locator("#status")).toContainText(
    "EPUB downloaded with your edits",
  );
});
