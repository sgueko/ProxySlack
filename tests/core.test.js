const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');

test('profils initiaux Tor', () => {
  assert.deepEqual(core.defaults.map(p => [p.type, p.host, p.port]), [['http','127.0.0.1',8118],['socks5','127.0.0.1',9050]]);
});

test('chaque type de proxy couvre HTTP, HTTPS, FTP et les autres requêtes', () => {
  for (const type of ['http','https','socks4','socks5']) {
    const p = core.validateProfile({ id: `test-${type}`, name: 'Test', type, host: 'proxy.example', port: 1080 });
    const config = core.proxyConfig(p);
    assert.equal(config.mode, 'fixed_servers');
    assert.equal(config.rules.proxyForHttp.scheme, type);
    assert.equal(config.rules.proxyForHttps.scheme, type);
    assert.equal(config.rules.proxyForFtp.scheme, type);
    assert.equal(config.rules.fallbackProxy.scheme, type);
  }
});

test('case cochée par défaut, ancien JSON conservé', () => {
  const old = { id:'old', name:'Old', type:'http', host:'127.0.0.1', port:8118 };
  const profile = core.validateProfile(old);
  assert.equal(profile.applyToAllProtocols, true);
  assert.deepEqual(Object.keys(core.proxyConfig(profile).rules), ['proxyForHttp','proxyForHttps','proxyForFtp','fallbackProxy']);
});

test('case décochée limite le proxy au protocole de destination choisi', () => {
  for (const [targetProtocol, key] of Object.entries({ http:'proxyForHttp', https:'proxyForHttps', ftp:'proxyForFtp', other:'fallbackProxy' })) {
    const p = core.validateProfile({ id:`only-${targetProtocol}`, name:'Only', type:'socks5', host:'127.0.0.1', port:9050, applyToAllProtocols:false, targetProtocol });
    assert.deepEqual(Object.keys(core.proxyConfig(p).rules), [key]);
  }
});

test('rejette les entrées dangereuses ou invalides', () => {
  for (const p of [
    { name: '', type: 'http', host: 'localhost', port: 80 },
    { name: 'X', type: 'ftp', host: 'localhost', port: 80 },
    { name: 'X', type: 'http', host: 'x/y', port: 80 },
    { name: 'X', type: 'http', host: 'localhost', port: 65536 },
    { name: 'X', type: 'http', host: 'localhost', port: 80, applyToAllProtocols: 'yes' },
    { name: 'X', type: 'http', host: 'localhost', port: 80, targetProtocol: 'socks5' },
    { id: 'direct', name: 'X', type: 'http', host: 'localhost', port: 80 }
  ]) assert.throws(() => core.validateProfile(p));
});

test('JSON exporté puis importé conserve les profils', () => {
  assert.deepEqual(core.parseImport(core.exportData(core.defaults)), core.defaults);
  assert.throws(() => core.parseImport('{broken'));
  assert.throws(() => core.parseImport(JSON.stringify({ format:'Other', version:1, profiles:[] })));
  assert.throws(() => core.parseImport(JSON.stringify({ format:'ProxySlack', version:1, profiles:[core.defaults[0], core.defaults[0]] })));
});
