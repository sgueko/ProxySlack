// Real Chromium extension screenshots. All hosts and IPs shown are documentation fixtures.
let chromium;
try { ({chromium} = require(process.env.PLAYWRIGHT_CORE || 'playwright-core')); }
catch { ({chromium} = require('/usr/lib64/node_modules/rea-agents/node_modules/playwright-core')); }
const fs = require('fs');
const os = require('os');
const path = require('path');
(async () => {
  const root = path.resolve(__dirname, '..');
  const ext = path.join(root, 'extension');
  const out = path.join(root, 'screenshots');
  fs.mkdirSync(out, {recursive:true});
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'proxyslack-shots-'));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`], viewport: {width:420,height:760}
  });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', {timeout:15000});
    const id = new URL(worker.url()).host;
    const page = await context.newPage();
    await page.emulateMedia({colorScheme:'dark'});
    await page.goto(`chrome-extension://${id}/popup.html`);
    await page.waitForSelector('.profile');
    const shot = async name => { await page.screenshot({path:path.join(out,name), fullPage:true}); console.log(name); };
    await shot('01-popup.png');
    await shot('02-profiles.png');
    await page.click('#addBtn'); await shot('03-create-profile.png');
    await page.click('#cancelBtn');
    await page.locator('.profile-actions button[title^="Edit"]').first().click(); await shot('04-edit-profile.png');
    await page.click('#cancelBtn');
    await page.locator('.profile-actions .activate').first().click();
    await page.waitForFunction(() => document.querySelector('#currentTitle').textContent === 'Tor HTTP');
    await shot('05-active-profile.png');
    await page.evaluate(() => { const send = chrome.runtime.sendMessage.bind(chrome.runtime); chrome.runtime.sendMessage = (message, ...rest) => message?.type === 'testIp' ? Promise.resolve({ok:true,data:{ip:'203.0.113.10'}}) : send(message, ...rest); });
    await page.click('#testBtn'); await page.waitForFunction(() => !document.querySelector('#ipResult').textContent.includes('Testing'), {timeout:15000}).catch(() => {});
    await shot('06-connection-test.png');
    await page.click('#settingsBtn'); await shot('07-settings.png'); await page.click('#settingsCloseBtn');
    await page.click('#exportBtn'); await shot('08-import-export.png');
    await page.reload(); await page.waitForSelector('.profile');
    await page.emulateMedia({colorScheme:'light'}); await shot('09-light-theme.png');
    await page.emulateMedia({colorScheme:'dark'}); await shot('10-dark-theme.png');
  } finally { await context.close(); fs.rmSync(profile,{recursive:true,force:true}); }
})().catch(e=>{console.error(e);process.exit(1)});
