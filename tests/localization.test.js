const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('English and French have every popup message and localized manifest metadata', () => {
  const root = path.join(__dirname, '..', 'extension');
  const source = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');
  const keys = [...fs.readFileSync(path.join(root, 'popup.js'), 'utf8').matchAll(/\bt\('([a-zA-Z]+)'/g)].map(match => match[1]);
  const htmlKeys = [...fs.readFileSync(path.join(root, 'popup.html'), 'utf8').matchAll(/data-i18n="([a-zA-Z]+)"/g)].map(match => match[1]);
  for (const language of ['en', 'fr']) {
    const context = vm.createContext({ chrome:{ i18n:{ getUILanguage:() => language } }, navigator:{ language }, document:{} });
    vm.runInContext(source, context);
    const i18n = vm.runInContext('ProxySlackI18n', context);
    for (const key of [...keys, ...htmlKeys]) assert.notEqual(i18n.t(key), key, `${language}: ${key}`);
    for (const key of ['appName','appDescription']) assert.ok(JSON.parse(fs.readFileSync(path.join(root, '_locales', language, 'messages.json')))[key]?.message);
  }
});
