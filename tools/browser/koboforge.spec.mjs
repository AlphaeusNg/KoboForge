import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const jsZipBrowserPath = fileURLToPath(
  new URL("../../node_modules/jszip/dist/jszip.min.js", import.meta.url),
);
const mammothBrowserPath = fileURLToPath(
  new URL("../../node_modules/mammoth/mammoth.browser.min.js", import.meta.url),
);
const docxFixturePath = fileURLToPath(
  new URL("../fixtures/numbers-13-15-outline-slim.docx", import.meta.url),
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
  await page.addInitScript({ path: mammothBrowserPath });
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

test("imports DOCX fidelity, preserves verse prose, and exports an edit", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#deviceSpec")).not.toHaveText("—");
  await page.locator("#fileInput").setInputFiles(docxFixturePath);

  const preview = page.locator("#deviceBookContent");
  await expect(page.locator("#status")).toHaveText(
    "DOCX ready · editable · Kobo Libra Colour",
  );
  await expect(preview).toContainText(
    "And your children shall be shepherds in the wilderness forty years",
  );
  await expect(preview).toContainText("So Near Yet So Far");
  await expect(preview).toContainText("Discussion questions:");
  const verse33Preserved = await preview.evaluate((element) => (
    Array.from(element.querySelectorAll('sup.kf-verse-num[data-kf-verse="33"]'))
      .some((marker) => {
        let following = "";
        let node = marker.nextSibling;
        while (node && following.length < 180) {
          following += node.textContent || "";
          node = node.nextSibling;
        }
        return /And your children shall be shepherds/.test(following);
      })
  ));
  expect(verse33Preserved).toBe(true);

  await page.locator("#bookTitle").fill("DOCX Browser Fidelity");
  await preview.evaluate((element) => {
    const paragraph = Array.from(element.querySelectorAll("p")).find((candidate) => (
      candidate.textContent?.includes("Discussion questions:")
    ));
    if (!paragraph) throw new Error("DOCX preview did not retain discussion questions");
    paragraph.textContent = "Discussion questions: browser-export verified.";
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: "browser-export verified",
    }));
  });
  await expect(page.locator("#editedBadge")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#downloadBtn").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("docx-browser-fidelity.epub");
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  const archive = await JSZip.loadAsync(await readFile(downloadPath));
  const chapter = await archive.file("OEBPS/chapter-1.xhtml").async("string");
  const packageDocument = await archive.file("OEBPS/content.opf").async("string");
  expect(chapter).toContain(
    "And your children shall be shepherds in the wilderness forty years",
  );
  expect(chapter).toContain("So Near Yet So Far");
  expect(chapter).toContain("Discussion questions: browser-export verified.");
  expect(chapter).toContain('class="kf-verse-num"');
  expect(chapter).toContain('data-kf-verse="33"');
  expect(packageDocument).toContain("<dc:title>DOCX Browser Fidelity</dc:title>");
});
