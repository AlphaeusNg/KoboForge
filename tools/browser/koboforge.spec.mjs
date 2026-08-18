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

async function studyFormattingDocxBuffer() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`,
  );
  zip.folder("_rels").file(
    ".rels",
    `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  const word = zip.folder("word");
  word.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
  <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Study worksheet</w:t></w:r></w:p>
  <w:p><w:r><w:rPr><w:u w:val="thick"/></w:rPr><w:t>Underlined study prompt</w:t></w:r></w:p>
  <w:p/><w:p/><w:p><w:pPr><w:spacing w:before="120"/></w:pPr></w:p>
  <w:p><w:r><w:t>Next study prompt</w:t></w:r></w:p>
  <w:sectPr/>
</w:body></w:document>`,
  );
  word.file(
    "styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
</w:styles>`,
  );
  word.folder("_rels").file(
    "document.xml.rels",
    `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

function pdfTextItem(str, x, y, width, {
  height = 11,
  fontName = "Helvetica",
  hasEOL = false,
} = {}) {
  return {
    str,
    transform: [1, 0, 0, height, x, y],
    width,
    height,
    fontName,
    hasEOL,
  };
}

function pdfFidelityModuleSource() {
  const items = [
    pdfTextItem("1", 72, 748, 3.7, { height: 6.6, fontName: "Helvetica-Bold" }),
    pdfTextItem("And every source word remains in order.", 75.7, 744, 250, { hasEOL: true }),
    pdfTextItem("The L", 72, 720, 28),
    pdfTextItem("ORD", 100, 720, 17, { height: 7.7 }),
    pdfTextItem(" ", 117, 720, 4, { height: 0 }),
    pdfTextItem("continues without losing a word.", 121, 720, 190, { hasEOL: true }),
  ];
  for (let index = 0; index < 8; index += 1) {
    const y = 690 - (index * 48);
    items.push(pdfTextItem(
      `Full width sentence ${index + 1} crosses the apparent gutter safely.`,
      72,
      y,
      315,
      { hasEOL: true },
    ));
    items.push(pdfTextItem(
      `Indented continuation ${index + 1} stays immediately after it.`,
      190,
      y - 24,
      230,
      { hasEOL: true },
    ));
  }
  const outlineItems = [
    pdfTextItem("Study outline", 72, 760, 70, { hasEOL: true }),
    pdfTextItem("1)", 90, 730, 10),
    pdfTextItem(" ", 100, 730, 8, { height: 0 }),
    pdfTextItem("The Problem", 108, 730, 68, { hasEOL: true }),
    pdfTextItem("a)", 126, 700, 10),
    pdfTextItem(" ", 136, 700, 8, { height: 0 }),
    pdfTextItem("Death: first study point", 144, 700, 130, { hasEOL: true }),
    pdfTextItem("b)", 126, 640, 10),
    pdfTextItem(" ", 136, 640, 8, { height: 0 }),
    pdfTextItem("Denial: second study point", 144, 640, 145, { hasEOL: true }),
    pdfTextItem("2)", 90, 580, 10),
    pdfTextItem(" ", 100, 580, 8, { height: 0 }),
    pdfTextItem("The Solution", 108, 580, 68, { hasEOL: true }),
  ];
  const pages = [{
    width: 596,
    height: 842,
    items,
  }, {
    width: 596,
    height: 842,
    items: outlineItems,
  }];
  return `
export const GlobalWorkerOptions = {};
export const OPS = {};
const pages = ${JSON.stringify(pages)};
export function getDocument() {
  return {
    promise: Promise.resolve({
      numPages: pages.length,
      async getPage(number) {
        const source = pages[number - 1];
        return {
          commonObjs: { get() { throw new Error("font metadata unavailable"); } },
          getViewport() { return { width: source.width, height: source.height }; },
          async getTextContent() { return { items: source.items, styles: {} }; },
          async getOperatorList() { return { fnArray: [], argsArray: [] }; },
        };
      },
      async destroy() {},
    }),
  };
}`;
}

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

async function openBookDetails(page) {
  const details = page.locator("details.book-details");
  if (await details.count()) {
    await details.evaluate((el) => {
      el.open = true;
    });
  }
}

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

  await openBookDetails(page);
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
  await expect(page.locator("#statWords")).toHaveText("1,209 words");
  const sourceBuffer = await readFile(docxFixturePath);
  const sourceArchive = await JSZip.loadAsync(sourceBuffer);
  const sourceXml = await sourceArchive.file("word/document.xml").async("string");
  const sourceCharacterStream = await page.evaluate((xml) => {
    const wordNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return Array.from(doc.getElementsByTagNameNS(wordNamespace, "p"))
      .map((paragraph) => (
        Array.from(paragraph.getElementsByTagNameNS(wordNamespace, "t"))
          .map((text) => text.textContent || "")
          .join("")
      ))
      .join("")
      .replace(/\s+/g, "");
  }, sourceXml);
  const previewCharacterStream = await preview.evaluate((element) => (
    (element.textContent || "").replace(/\s+/g, "")
  ));
  expect(
    previewCharacterStream,
    "the browser import must retain the fixture's complete character stream",
  ).toBe(sourceCharacterStream);
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

  await openBookDetails(page);
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

test("retains DOCX underline and intentional writing space in EPUB", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#deviceSpec")).not.toHaveText("—");
  await page.locator("#fileInput").setInputFiles({
    name: "study-formatting.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: await studyFormattingDocxBuffer(),
  });

  const preview = page.locator("#deviceBookContent");
  await expect(page.locator("#status")).toHaveText(
    "DOCX ready · editable · Kobo Libra Colour",
  );
  await expect(preview.locator("u")).toHaveText("Underlined study prompt");
  await expect(preview.locator(".kf-note-space")).toHaveAttribute(
    "data-space-lines",
    "4",
  );
  await expect(page.locator("#diagnostics")).toContainText(
    "1 blank writing region retained",
  );

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#downloadBtn").click();
  const download = await downloadPromise;
  const archive = await JSZip.loadAsync(await readFile(await download.path()));
  const chapter = await archive.file("OEBPS/chapter-1.xhtml").async("string");
  expect(chapter).toContain("<u>Underlined study prompt</u>");
  expect(chapter).toContain("kf-note-space kf-space-4");
});

test("keeps single-column PDF words ordered and correctly spaced in EPUB", async ({ page }) => {
  await page.route(
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs",
    async (route) => route.fulfill({
      status: 200,
      contentType: "application/javascript",
      headers: { "access-control-allow-origin": "*" },
      body: pdfFidelityModuleSource(),
    }),
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#deviceSpec")).not.toHaveText("—");
  await page.locator("#fileInput").setInputFiles({
    name: "pdf-reading-order.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% browser fidelity stub\n"),
  });

  const preview = page.locator("#deviceBookContent");
  await expect(page.locator("#status")).toHaveText(
    "PDF ready · editable · Kobo Libra Colour",
  );
  await expect(preview).toContainText("1 And every source word remains in order.");
  await expect(preview).toContainText("The LORD continues without losing a word.");
  await expect(preview.locator("[data-pdf-column]")).toHaveCount(0);
  await expect(preview.locator(".kf-pdf-block").first()).toHaveClass(/kf-align-left/);
  const outlinePage = preview.locator('.kf-pdf-page[data-source-page="2"]');
  await expect(outlinePage.locator(":scope > ol")).toHaveCount(1);
  await expect(outlinePage.locator("ol ol")).toHaveCount(1);
  await expect(outlinePage.locator(".kf-note-space")).toHaveCount(2);
  await expect(outlinePage.locator("li").nth(1)).toContainText(
    "Death: first study point",
  );
  await expect(outlinePage.locator("li").nth(1)).not.toContainText("a)");
  await expect(page.locator("#diagnostics")).toContainText(
    "2 blank writing regions retained",
  );
  const previewText = (await preview.textContent()) || "";
  for (let index = 1; index <= 8; index += 1) {
    expect(previewText.indexOf(`Full width sentence ${index}`)).toBeLessThan(
      previewText.indexOf(`Indented continuation ${index}`),
    );
    if (index < 8) {
      expect(previewText.indexOf(`Indented continuation ${index}`)).toBeLessThan(
        previewText.indexOf(`Full width sentence ${index + 1}`),
      );
    }
  }

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#downloadBtn").click();
  const download = await downloadPromise;
  const archive = await JSZip.loadAsync(await readFile(await download.path()));
  const chapter = await archive.file("OEBPS/chapter-1.xhtml").async("string");
  const chapterText = chapter.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  expect(chapterText).toContain("1 And every source word remains in order.");
  expect(chapterText).toContain("The LORD continues without losing a word.");
  expect(chapter).toContain("kf-note-space kf-space-3");
  expect(chapter).not.toContain("data-pdf-column");
});

test("restores sanitized last Kobo prefs before first preview paint", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("koboforge-device-v1", JSON.stringify({
      device: "sage",
      deviceOrientation: "landscape",
      deviceFontSize: 4.2,
      deviceMargin: 12,
      deviceChrome: false,
    }));
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#deviceSelect")).toHaveValue("sage");
  await expect(page.locator("#deviceOrientation")).toHaveValue("landscape");
  await expect(page.locator("#deviceFontSize")).toHaveValue("4.2");
  await expect(page.locator("#deviceMargin")).toHaveValue("12");
  await expect(page.locator("#deviceChrome")).not.toBeChecked();
  await expect(page.locator("#devicePhysicalSpec")).toContainText("landscape");
  await expect(page.locator("#deviceSpec")).not.toHaveText("—");
});

test("rejects invalid stored device prefs and keeps defaults", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("koboforge-device-v1", JSON.stringify({
      device: "not-a-kobo",
      deviceOrientation: "upside-down",
      deviceFontSize: 99,
      deviceMargin: -4,
      deviceChrome: "yes",
    }));
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#deviceSelect")).toHaveValue("libra-colour");
  await expect(page.locator("#deviceOrientation")).toHaveValue("portrait");
  await expect(page.locator("#deviceFontSize")).toHaveValue("4.8");
  await expect(page.locator("#deviceMargin")).toHaveValue("3");
  await expect(page.locator("#deviceChrome")).toBeChecked();
});

test("fails closed when stored device prefs cannot be parsed", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("koboforge-device-v1", "{not-json");
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#deviceSelect")).toHaveValue("libra-colour");
  await expect(page.locator("#deviceOrientation")).toHaveValue("portrait");
  await expect(page.locator("#deviceFontSize")).toHaveValue("3.6");
  await expect(page.locator("#deviceMargin")).toHaveValue("8");
  await expect(page.locator("#deviceChrome")).toBeChecked();
});

test("remembers the last Kobo after reload and names export stages", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#deviceSelect").selectOption("elipsa-2e");
  await page.locator("#deviceOrientation").selectOption("landscape");
  await page.locator("#deviceFontSize").evaluate((el) => {
    el.value = "4.4";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#deviceMargin").evaluate((el) => {
    el.value = "5";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#deviceChrome").uncheck();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#deviceSelect")).toHaveValue("elipsa-2e");
  await expect(page.locator("#deviceOrientation")).toHaveValue("landscape");
  await expect(page.locator("#deviceFontSize")).toHaveValue("4.4");
  await expect(page.locator("#deviceMargin")).toHaveValue("5");
  await expect(page.locator("#deviceChrome")).not.toBeChecked();

  await page.locator("#fileInput").setInputFiles({
    name: "stage-progress.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Export stage progress text."),
  });
  await expect(page.locator("#downloadBtn")).toBeEnabled();

  const seen = await page.evaluate(() => {
    window.__kfExportStages = [];
    const label = document.getElementById("progressLabel");
    const status = document.getElementById("status");
    const note = (value) => {
      const text = String(value || "").trim();
      if (text && window.__kfExportStages[window.__kfExportStages.length - 1] !== text) {
        window.__kfExportStages.push(text);
      }
    };
    const observer = new MutationObserver(() => {
      note(label?.textContent);
      note(status?.textContent);
    });
    if (label) observer.observe(label, { childList: true, characterData: true, subtree: true });
    if (status) observer.observe(status, { childList: true, characterData: true, subtree: true });
    return true;
  });
  expect(seen).toBe(true);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#downloadBtn").click();
  await downloadPromise;
  const stages = await page.evaluate(() => window.__kfExportStages || []);
  expect(stages).toEqual(expect.arrayContaining(["Images", "Package", "ZIP"]));
  await expect(page.locator("#status")).toContainText(/EPUB downloaded|Reflowable EPUB ready/);
});
