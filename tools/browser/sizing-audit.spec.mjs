import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const output = process.env.SIZING_OUTPUT || '/tmp/kobo-sizing-audit';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6T9sAAAAASUVORK5CYII=', 'base64');
for (const scenario of [{width:320},{width:375},{width:768},{width:1280},{width:1280,zoom:2},{width:375,text:2}]) {
  const name = `${scenario.width}${scenario.zoom ? '-zoom200' : ''}${scenario.text ? '-text200' : ''}`;
  test(name, async ({page}) => {
    await mkdir(output,{recursive:true});
    await page.setViewportSize({width:scenario.width,height:900});
    await page.addInitScript({path:fileURLToPath(new URL('../../node_modules/jszip/dist/jszip.min.js',import.meta.url))});
    await page.route(/^https:\/\//, route => route.fulfill({status:200,body:''}));
    await page.goto('/');
    await page.waitForFunction(() => document.querySelector('#deviceSpec').textContent !== '—');
    if (scenario.zoom) await page.evaluate(() => document.body.style.zoom='2');
    if (scenario.text) await page.evaluate(() => document.documentElement.style.fontSize='32px');
    const reports=[];
    async function record(state) {
      await page.waitForTimeout(200);
      await page.screenshot({path:`${output}/${name}-${state}.png`,fullPage:true});
      reports.push(await page.evaluate(state => {
        const visible = e => e.checkVisibility() && e.getBoundingClientRect().width>0;
        const controls = [...document.querySelectorAll('button,input:not([type="file"]),select,summary,a')].filter(visible).map(e=>{
          const r=e.getBoundingClientRect();
          const range=document.createRange(); range.selectNodeContents(e);
          const textBounds=range.getBoundingClientRect();
          return {id:e.id||e.getAttribute('aria-label')||e.textContent.trim().slice(0,45),tag:e.tagName,type:e.type,width:+r.width.toFixed(1),height:+r.height.toFixed(1),left:+r.left.toFixed(1),right:+r.right.toFixed(1),textClips:!!e.textContent.trim()&&(textBounds.height>r.height+2||textBounds.width>r.width+2),disabled:e.disabled||false};
        });
        return {state,viewport:innerWidth,scroll:document.documentElement.scrollWidth,controls,
          overflow: [...document.querySelectorAll('body *')].filter(e=>visible(e)&&e.getBoundingClientRect().right>innerWidth+1&&!e.closest('#editToolbar,#deviceFrame,#tablePicker')).slice(0,20).map(e=>({tag:e.tagName,id:e.id,classes:e.className,right:e.getBoundingClientRect().right}))};
      },state));
    }
    await page.locator('details.book-details').evaluate(e=>e.open=true);
    await record('empty-settings');
    await page.locator('#fileInput').setInputFiles({name:'Sizing document.png',mimeType:'image/png',buffer:png});
    await page.locator('#deviceBookContent img').waitFor();
    await page.locator('#deviceBookContent img').click();
    await record('image-editor');
    for (const selector of ['#imageDescription','#saveImageDescriptionBtn','#imageDecorative']) {
      const clipped = await page.locator(selector).evaluate(e => {
        const r=e.getBoundingClientRect();
        for(let p=e.parentElement;p;p=p.parentElement) {
          const s=getComputedStyle(p), b=p.getBoundingClientRect();
          if (/(hidden|clip|auto|scroll)/.test(s.overflowY) && (r.top<b.top-1||r.bottom>b.bottom+1)) return p.id||p.tagName;
          if (/(hidden|clip|auto|scroll)/.test(s.overflowX) && (r.left<b.left-1||r.right>b.right+1)) return p.id||p.tagName;
        }
        return '';
      });
      expect(clipped, `${name}: ${selector} clipped by ancestor`).toBe('');
    }
    await page.locator('#insertTableBtn').click();
    await record('table-dialog');
    await page.keyboard.press('Escape');
    await page.locator('[data-mode="html"]').click();
    await record('html-editor');
    await page.locator('#cancelHtmlBtn').click();
    await page.locator('[data-mode="diff"]').click();
    await record('diff-editor');
    await page.locator('[data-mode="edit"]').click();
    const backup=page.waitForEvent('download');
    await page.locator('#downloadBackupBtn').click();
    await backup;
    await record('backup-saved');
    const epub=page.waitForEvent('download');
    await page.locator('#downloadBtn').click();
    await epub;
    await record('export-ready');
    await page.reload();
    if (scenario.zoom) await page.evaluate(() => document.body.style.zoom='2');
    if (scenario.text) await page.evaluate(() => document.documentElement.style.fontSize='32px');
    await page.locator('#restoreDraftBtn').waitFor();
    await record('recovery-choice');
    await page.locator('#restoreDraftBtn').click();
    await record('restored-book');
    await writeFile(`${output}/${name}.json`,JSON.stringify(reports,null,2));
    for (const report of reports) expect(report.scroll, `${name}: ${report.state} document width`).toBeLessThanOrEqual(scenario.width);
  });
}
