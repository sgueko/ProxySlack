const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../extension/core.js');

test('IP URL settings accept HTTPS and browser or manual language', () => {
  assert.deepEqual(core.validateSettings({}), { language:'auto', ipUrl:core.defaultIpUrl });
  assert.equal(core.validateSettings({ language:'fr', ipUrl:'https://example.com/ip' }).language, 'fr');
  for (const ipUrl of ['http://example.com/ip', 'https://user:pass@example.com/ip', 'https://example.com/ip#x', 'not a url']) {
    assert.throws(() => core.validateIpUrl(ipUrl));
  }
  assert.throws(() => core.validateSettings({ language:'de' }));
});

test('IP parser accepts only compact JSON with ip or plain IP text', () => {
  assert.equal(core.parseIpResponse('application/json; charset=utf-8', '{"ip":"203.0.113.4"}'), '203.0.113.4');
  assert.equal(core.parseIpResponse('text/plain', '2001:db8::1\n'), '2001:db8::1');
  for (const [type, body] of [
    ['text/html', '<html>203.0.113.4</html>'],
    ['application/json', '{"ip":"203.0.113.4","country":"FR"}'],
    ['application/json', '{"ip":"not-an-ip"}'],
    ['text/plain', '999.999.999.999'],
    ['text/plain', 'x'.repeat(513)]
  ]) assert.throws(() => core.parseIpResponse(type, body));
});
