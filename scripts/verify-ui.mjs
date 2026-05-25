// Visual smoke test for The G Factor rebrand. Boots a Playwright
// chromium against the running Vite dev server (assumed up at :5173),
// dismisses the backend chooser modal (local mode), and screenshots:
//   1. / (Main Stage: setup phase + GemmaHost banner)
//   2. ?studio=1 (Rehearsal Room)
//   3. ?leaderboard=1 (Hall of Fame)
// Also checks the .primary button hover contrast bug is fixed by
// programmatically hovering the "Hold the show" button and reading
// its computed background-color (should NOT be the dark burgundy).

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'http://localhost:5173';
const OUT  = 'screens';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

async function dismissBackendModal() {
  // First-visit modal: pick Local, then Save.
  const local = page.locator('button:has-text("Locally")');
  if (await local.isVisible().catch(() => false)) {
    await local.click();
    const save = page.locator('button:has-text("Save")').first();
    if (await save.isVisible().catch(() => false)) await save.click();
    await page.waitForTimeout(300);
  }
}

async function visit(path, name) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await dismissBackendModal();
  await page.waitForTimeout(400);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  saved ${file}`);
}

console.log('1. Visiting / (should be Main Stage with GemmaHost)…');
await visit('/', '01-home-mainstage');

console.log('2. Visiting ?studio=1 (Rehearsal Room)…');
await visit('/?studio=1', '02-rehearsal-room');

console.log('3. Visiting ?leaderboard=1 (Hall of Fame)…');
await visit('/?leaderboard=1', '03-hall-of-fame');

console.log('4. Checking primary-button hover contrast…');
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await dismissBackendModal();
await page.waitForTimeout(400);
// Pick the first enabled .primary button on the page. On the Main
// Stage that's typically the active bracket-size toggle ("4
// contestants"), or LOAD GEMMA if model is unloaded. Either tests
// the same .primary hover cascade.
const primaryBtn = page.locator('button.primary:not([disabled])').first();
const count = await primaryBtn.count();
if (count === 0) {
  console.log('  WARN: no enabled .primary button found on the page.');
} else {
  const labelBefore = await primaryBtn.innerText();
  console.log(`  hovering primary button: "${labelBefore.trim()}"`);
  await primaryBtn.hover();
  await page.waitForTimeout(250);
  const styles = await primaryBtn.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      bgImage: cs.backgroundImage,
      bgColor: cs.backgroundColor,
      color: cs.color,
      borderColor: cs.borderColor,
      filter: cs.filter,
      boxShadow: cs.boxShadow,
    };
  });
  console.log('  computed style on hover:', JSON.stringify(styles, null, 2));
  // Expectation: backgroundImage should still be a brass-rail
  // gradient. If it's "none" or bgColor flipped to dark-burgundy,
  // the contrast bug is back.
  const bgIsGradient = styles.bgImage && styles.bgImage.includes('linear-gradient');
  const bgIsDarkBurgundy =
    /rgb\(58,\s*4,\s*4\)/.test(styles.bgColor) ||
    /rgb\(33,\s*2,\s*2\)/.test(styles.bgColor);
  if (!bgIsGradient || bgIsDarkBurgundy) {
    console.error('  FAIL: primary button hover lost its brass gradient.');
    process.exitCode = 1;
  } else {
    console.log('  PASS: primary button keeps brass gradient on hover.');
  }
  // Zoom + screenshot the hovered button for visual confirmation.
  await primaryBtn.screenshot({ path: `${OUT}/04-hover-primary.png` });
  console.log(`  saved ${OUT}/04-hover-primary.png`);
}

await browser.close();
console.log('done.');
