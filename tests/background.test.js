const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function harness(initialLevel = 'controllable_by_this_extension') {
  const memory = {};
  const calls = [];
  let listener;
  let level = initialLevel;
  let value = { mode: 'system' };
  const chrome = {
    storage: { local: { get: async key => ({ [key]: memory[key] }), set: async entry => Object.assign(memory, entry) } },
    proxy: { settings: {
      get: async () => ({ levelOfControl: level, value }),
      set: async args => { calls.push(['set', args.value]); value = args.value; level = 'controlled_by_this_extension'; },
      clear: async () => { calls.push(['clear']); value = { mode: 'system' }; level = 'controllable_by_this_extension'; },
      onChange: { addListener() {} }
    } },
    action: { setBadgeText: async args => calls.push(['badge', args.text]), setBadgeBackgroundColor: async () => {} },
    runtime: { onMessage: { addListener(fn) { listener = fn; } }, onInstalled: { addListener() {} }, onStartup: { addListener() {} } }
  };
  const context = vm.createContext({ chrome, crypto: require('node:crypto').webcrypto, console, fetch: async url => { calls.push(['fetch', url]); return new Response(JSON.stringify({ ip:'203.0.113.1' }), { headers:{ 'content-type':'application/json' } }); }, AbortSignal, URL, TextDecoder, Response });
  context.importScripts = file => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8'), context);
  const send = message => new Promise(resolve => listener(message, {}, resolve)).then(response => { if (!response.ok) throw new Error(response.error); return response.data; });
  return { send, calls, memory, setLevel: next => { level = next; } };
}

test('profil, direct puis libération du réglage', async () => {
  const h = harness();
  let result = await h.send({ type:'snapshot' });
  assert.equal(result.selected, null);
  result = await h.send({ type:'activate', id:'tor-socks5' });
  assert.equal(result.selected, 'tor-socks5');
  assert.equal(h.calls.find(c => c[0] === 'set')[1].rules.proxyForHttps.scheme, 'socks5');
  result = await h.send({ type:'activate', id:'direct' });
  assert.equal(result.actualMode, 'direct');
  result = await h.send({ type:'release' });
  assert.equal(result.selected, null);
  assert.equal(result.actualMode, 'system');
  assert.ok(h.calls.some(c => c[0] === 'clear'));
});

test('conflit empêche activation et import libère le proxy', async () => {
  const h = harness('controlled_by_other_extensions');
  await assert.rejects(h.send({ type:'activate', id:'tor-http' }), /contrôlé/);
  h.setLevel('controllable_by_this_extension');
  await h.send({ type:'activate', id:'direct' });
  const result = await h.send({ type:'import', text: JSON.stringify({ format:'ProxySlack', version:1, profiles:[] }) });
  assert.equal(result.selected, null);
  assert.equal(result.actualMode, 'system');
});

test('réglages sauvegardés pilotent le service de test IP', async () => {
  const h = harness();
  const settings = { language:'en', ipUrl:'https://example.com/ip' };
  const result = await h.send({ type:'saveSettings', settings });
  assert.equal(result.settings.ipUrl, settings.ipUrl);
  assert.equal((await h.send({ type:'testIp' })).ip, '203.0.113.1');
  assert.ok(h.calls.some(call => call[0] === 'fetch' && call[1] === settings.ipUrl));
});
