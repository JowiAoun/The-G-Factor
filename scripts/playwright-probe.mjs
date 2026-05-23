// Drive a real Chromium against the dev server and dump everything that
// could explain a blank screen: page errors, console output, failed
// network responses, and the rendered DOM under #root.
//
// Run with the playwright already present under the playwright-mcp npx
// cache so we don't need to install anything in this repo:
//   NODE_PATH=/home/jaoun/.npm/_npx/9833c18b2d85bc59/node_modules \
//     node scripts/playwright-probe.mjs <url>

const URL = process.argv[2] ?? 'http://localhost:5174/';
// ESM ignores NODE_PATH; import from the playwright-mcp npx cache by
// absolute path so we don't need to install anything in this repo.
const { chromium } = await import(
  'file:///home/jaoun/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs'
);

const browser = await chromium.launch({
  headless: true,
  // Disable the COOP/COEP-strict context: dev server sets these, and
  // we want to mirror exactly what the user's browser sees.
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const consoleLines = [];
const pageErrors = [];
const failedResponses = [];
const requestFailures = [];

page.on('console', (msg) => {
  consoleLines.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => {
  pageErrors.push(`${err.name}: ${err.message}\n${err.stack ?? ''}`);
});
page.on('response', async (res) => {
  if (res.status() >= 400) {
    failedResponses.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  }
});
page.on('requestfailed', (req) => {
  requestFailures.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`);
});

let gotoError = null;
try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15_000 });
} catch (err) {
  gotoError = err.message;
}

// Settle a beat to give useEffect / async errors a chance to fire.
await page.waitForTimeout(2000);

const title = await page.title().catch(() => '<?>');
const url = page.url();
const rootHtml = await page.evaluate(() => {
  const root = document.getElementById('root');
  return {
    rootChildCount: root?.children.length ?? -1,
    rootInnerLength: root?.innerHTML.length ?? -1,
    rootSnippet: (root?.innerHTML ?? '').slice(0, 600),
    bodyInnerLength: document.body.innerHTML.length,
  };
}).catch((e) => ({ evalError: e.message }));

console.log('=== PLAYWRIGHT PROBE ===');
console.log('URL:', url);
console.log('Title:', JSON.stringify(title));
if (gotoError) console.log('Goto error:', gotoError);
console.log('Root:', JSON.stringify(rootHtml, null, 2));
console.log('--- Page errors (' + pageErrors.length + ') ---');
for (const e of pageErrors) console.log(e);
console.log('--- Console (' + consoleLines.length + ') ---');
for (const l of consoleLines) console.log(l);
console.log('--- Failed responses (' + failedResponses.length + ') ---');
for (const r of failedResponses) console.log(r);
console.log('--- Request failures (' + requestFailures.length + ') ---');
for (const r of requestFailures) console.log(r);

await browser.close();
