importScripts('core.js');

const KEY = 'proxySlackState';
const initialState = () => ({ profiles: ProxySlackCore.defaults, selected: null, settings: ProxySlackCore.validateSettings({}) });
let queue = Promise.resolve();

async function state() {
  const stored = (await chrome.storage.local.get(KEY))[KEY];
  if (!stored) {
    const value = initialState();
    await chrome.storage.local.set({ [KEY]: value });
    return value;
  }
  return { profiles: ProxySlackCore.validateCollection(stored.profiles), selected: stored.selected ?? null, settings: ProxySlackCore.validateSettings(stored.settings ?? {}) };
}

async function control() {
  return chrome.proxy.settings.get({ incognito: false });
}

function canControl(level) {
  return level === 'controllable_by_this_extension' || level === 'controlled_by_this_extension';
}

async function badge(selected, level) {
  const notApplied = selected !== null && level !== 'controlled_by_this_extension';
  const blocked = !canControl(level);
  await chrome.action.setBadgeText({ text: blocked || notApplied ? '!' : selected === null ? '' : selected === 'direct' ? 'DIR' : 'ON' });
  await chrome.action.setBadgeBackgroundColor({ color: blocked || notApplied ? '#d4525a' : selected === 'direct' ? '#69788d' : '#2a9d85' });
}

async function snapshot() {
  const data = await state();
  const current = await control();
  await badge(data.selected, current.levelOfControl);
  return { ...data, levelOfControl: current.levelOfControl, actualMode: current.value?.mode ?? null };
}

async function activate(id) {
  const data = await state();
  const current = await control();
  if (!canControl(current.levelOfControl)) throw new Error('Le proxy est contrôlé par une règle ou une autre extension.');
  let config;
  if (id === 'direct') config = { mode: 'direct' };
  else {
    const profile = data.profiles.find(p => p.id === id);
    if (!profile) throw new Error('Profil introuvable.');
    config = ProxySlackCore.proxyConfig(profile);
  }
  await chrome.proxy.settings.set({ value: config, scope: 'regular' });
  const verified = await control();
  if (verified.levelOfControl !== 'controlled_by_this_extension' || verified.value?.mode !== config.mode) {
    throw new Error('Chromium n’a pas appliqué le réglage proxy.');
  }
  data.selected = id;
  await chrome.storage.local.set({ [KEY]: data });
  return snapshot();
}

async function release() {
  await chrome.proxy.settings.clear({ scope: 'regular' });
  const data = await state();
  data.selected = null;
  await chrome.storage.local.set({ [KEY]: data });
  return snapshot();
}

async function save(profile) {
  const data = await state();
  const clean = ProxySlackCore.validateProfile(profile);
  const index = data.profiles.findIndex(p => p.id === clean.id);
  if (index < 0 && data.profiles.length >= 100) throw new Error('Limite de 100 profils atteinte.');
  if (index < 0) data.profiles.push(clean); else data.profiles[index] = clean;
  await chrome.storage.local.set({ [KEY]: data });
  if (data.selected === clean.id) return activate(clean.id);
  return snapshot();
}

async function remove(id) {
  const data = await state();
  if (!data.profiles.some(p => p.id === id)) throw new Error('Profil introuvable.');
  if (data.selected === id) await release();
  const fresh = await state();
  fresh.profiles = fresh.profiles.filter(p => p.id !== id);
  await chrome.storage.local.set({ [KEY]: fresh });
  return snapshot();
}

async function importProfiles(text) {
  const profiles = ProxySlackCore.parseImport(text);
  const data = await state();
  if (data.selected !== null) await release();
  data.profiles = profiles;
  data.selected = null;
  await chrome.storage.local.set({ [KEY]: data });
  return snapshot();
}

async function saveSettings(settings) {
  const data = await state();
  data.settings = ProxySlackCore.validateSettings(settings);
  await chrome.storage.local.set({ [KEY]: data });
  return snapshot();
}

async function testIp() {
  const { settings } = await state();
  let response;
  try { response = await fetch(settings.ipUrl, { cache: 'no-store', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(12000) }); }
  catch { throw new Error('Service IP inaccessible ou redirection refusée.'); }
  if (!response.ok) throw new Error('Service IP indisponible.');
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > 512) throw new Error('Réponse IP trop volumineuse.');
  if (!response.body) throw new Error('Réponse IP vide.');
  const reader = response.body.getReader();
  let total = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 512) { await reader.cancel(); throw new Error('Réponse IP trop volumineuse.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { ip: ProxySlackCore.parseIpResponse(response.headers.get('content-type'), new TextDecoder().decode(bytes)) };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const run = async () => {
    switch (message?.type) {
      case 'snapshot': return snapshot();
      case 'activate': return activate(message.id);
      case 'release': return release();
      case 'save': return save(message.profile);
      case 'remove': return remove(message.id);
      case 'import': return importProfiles(message.text);
      case 'saveSettings': return saveSettings(message.settings);
      case 'testIp': return testIp();
      default: throw new Error('Commande inconnue.');
    }
  };
  const pending = queue.then(run, run);
  queue = pending.catch(() => {});
  pending.then(data => sendResponse({ ok: true, data }), error => sendResponse({ ok: false, error: error.message || 'Erreur inconnue.' }));
  return true;
});

chrome.runtime.onInstalled.addListener(() => { state().then(snapshot).catch(console.error); });
chrome.runtime.onStartup.addListener(() => { snapshot().catch(console.error); });
chrome.proxy.settings.onChange.addListener(() => { snapshot().catch(console.error); });
