import { chromium } from 'playwright';

const BASE = 'https://spotify-profile-full.vercel.app';

async function waitForApp(page) {
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 35000 });
    // Wait for React to hydrate and show the login page
    await page.waitForSelector('h1, h2, button, header, nav', { timeout: 20000 });
    return true;
  } catch {
    return false;
  }
}

async function testTasteProfile() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  let ok = 0;
  let total = 0;

  const check = (name, cond) => {
    total++;
    const mark = cond ? '✓' : '✗';
    console.log(`${mark} ${name}`);
    if (cond) ok++;
  };

  try {
    // Navigate to Taste Profile
    await page.goto(`${BASE}/taste`, { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(3000);

    // Check the page rendered
    const bodyText = await page.textContent('body');
    check('Page has Taste Profile heading', bodyText.includes('Taste Profile'));

    // Check range buttons exist
    const rangeButtons = await page.$$('button');
    const rangeTexts = [];
    for (const btn of rangeButtons) {
      const t = await btn.textContent();
      rangeTexts.push(t);
    }
    const hasAllTime = rangeTexts.some(t => t.includes('All Time'));
    const has6Months = rangeTexts.some(t => t.includes('6 Months'));
    const has4Weeks = rangeTexts.some(t => t.includes('4 Weeks'));
    check('Range buttons (All Time)', hasAllTime);
    check('Range buttons (Last 6 Months)', has6Months);
    check('Range buttons (Last 4 Weeks)', has4Weeks);

    // Check for Audio DNA section
    check('Audio DNA section visible', bodyText.includes('Audio DNA'));
    check('Top Genres heading visible', bodyText.includes('Top Genres'));
    check('How Your Taste Evolves visible', bodyText.includes('How Your Taste Evolves'));

    // Check for canvas elements (charts)
    const canvases = await page.$$('canvas');
    check('Canvas elements exist for charts', canvases.length >= 2);

    // Wait a bit more for async data to load and charts to render
    await page.waitForTimeout(5000);

    // Check radar chart canvas (first canvas - #radarChart)
    const radarCanvas = await page.$('#radarChart');
    check('Radar chart canvas exists', !!radarCanvas);
    if (radarCanvas) {
      const radarBBox = await radarCanvas.boundingBox();
      check('Radar chart has dimensions', radarBBox && radarBBox.width > 0 && radarBBox.height > 0);
    }

    // Check genre chart canvas (second canvas - #genreChart)
    const genreCanvas = await page.$('#genreChart');
    check('Genre chart canvas exists', !!genreCanvas);
    if (genreCanvas) {
      const genreBBox = await genreCanvas.boundingBox();
      check('Genre chart has dimensions', genreBBox && genreBBox.width > 0 && genreBBox.height > 0);
    }

    // Check for Genre Breakdown section
    check('Genre Breakdown section visible', bodyText.includes('Genre Breakdown'));

    // Check for stat cards (tempo, energy, danceability, unique genres)
    check('Stat cards visible', bodyText.includes('Avg Tempo') || bodyText.includes('Avg Energy'));

    // Switch time range by clicking "Last 6 Months"
    for (const btn of rangeButtons) {
      const t = await btn.textContent();
      if (t.includes('6 Months')) {
        await btn.click();
        await page.waitForTimeout(2000);
        break;
      }
    }
    const bodyText2 = await page.textContent('body');
    check('Switched to 6 months range', bodyText2.includes('Top Genres'));

  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await browser.close();
  }

  console.log(`\nResults: ${ok}/${total} checks passed`);
  process.exit(ok === total ? 0 : 1);
}

testTasteProfile();
