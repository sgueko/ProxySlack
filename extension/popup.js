const $ = id => document.getElementById(id);
const { t, error: localError } = ProxySlackI18n;
ProxySlackI18n.apply();
let appState;
let editingId = null;
let busy = false;

function notify(message, success = false) {
  const el = $('notice');
  el.textContent = message;
  el.classList.toggle('success', success);
}

async function request(type, extra = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...extra });
  if (!response?.ok) throw new Error(localError(response?.error || t('noResponse')));
  return response.data;
}

async function action(type, extra = {}, successMessage = '') {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  notify('');
  try {
    appState = await request(type, extra);
    render();
    if (successMessage) notify(successMessage, true);
    return true;
  } catch (err) { notify(localError(err.message)); return false; }
  finally {
    busy = false;
    document.querySelectorAll('button').forEach(button => { button.disabled = false; });
    if (appState) render();
  }
}

function render() {
  const { profiles, selected, levelOfControl, actualMode } = appState;
  const controlled = levelOfControl === 'controlled_by_this_extension';
  const blocked = levelOfControl === 'controlled_by_other_extensions' || levelOfControl === 'not_controllable';
  const notApplied = selected !== null && !controlled;
  const chosen = profiles.find(p => p.id === selected);
  const pill = $('statusPill');
  pill.className = `pill ${blocked || notApplied ? 'warn' : selected === null ? 'off' : ''}`;
  pill.textContent = blocked ? t('conflict') : notApplied ? t('notApplied') : selected === null ? t('browser') : selected === 'direct' ? t('direct') : t('proxyActive');
  $('currentTitle').textContent = blocked ? t('controlUnavailable') : selected === 'direct' && controlled ? t('directConnection') : chosen && controlled ? chosen.name : t('browserSetting');
  const scope = chosen?.applyToAllProtocols === false ? chosen.targetProtocol.toUpperCase() : t('allProtocols');
  $('currentDetail').textContent = blocked ? t('otherControls') : notApplied ? t('reactivate') : selected === 'direct' && controlled ? t('proxyDisabled') : chosen && controlled ? `${chosen.type.toUpperCase()} · ${chosen.host}:${chosen.port} · ${scope}` : t('currentMode', actualMode || '?');
  const list = $('profiles');
  list.replaceChildren();
  if (!profiles.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = t('noProfiles'); list.append(empty); }
  profiles.forEach(profile => {
    const row = document.createElement('div'); row.className = `profile ${selected === profile.id && controlled ? 'active' : ''}`;
    const protocol = document.createElement('span'); protocol.className = 'protocol'; protocol.textContent = profile.type.toUpperCase().replace('SOCKS','S');
    const main = document.createElement('div'); main.className = 'profile-main';
    const title = document.createElement('div'); title.className = 'profile-title'; title.textContent = profile.name;
    const sub = document.createElement('div'); sub.className = 'profile-sub'; sub.textContent = `${profile.host}:${profile.port} · ${profile.applyToAllProtocols === false ? profile.targetProtocol.toUpperCase() : t('allProtocols')}`;
    main.append(title, sub);
    const controls = document.createElement('div'); controls.className = 'profile-actions';
    const use = document.createElement('button'); use.className = 'activate'; use.type = 'button'; use.textContent = selected === profile.id && controlled ? t('active') : t('use'); use.disabled = blocked; use.addEventListener('click', () => action('activate', { id: profile.id }, t('profileActivated')));
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '✎'; edit.title = t('edit', profile.name); edit.setAttribute('aria-label', edit.title); edit.addEventListener('click', () => openEditor(profile));
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.title = t('delete', profile.name); remove.setAttribute('aria-label', remove.title); remove.addEventListener('click', () => { if (confirm(t('deleteConfirm', profile.name))) action('remove', { id: profile.id }, t('profileDeleted')); });
    controls.append(use, edit, remove); row.append(protocol, main, controls); list.append(row);
  });
  $('directBtn').disabled = blocked;
}

function updateTargetVisibility() { $('targetField').hidden = $('applyAll').checked; }

function openEditor(profile = null) {
  editingId = profile?.id ?? null;
  $('dialogTitle').textContent = profile ? t('editProfile') : t('newProfile');
  $('name').value = profile?.name ?? '';
  $('type').value = profile?.type ?? 'http';
  $('host').value = profile?.host ?? '';
  $('port').value = profile?.port ?? '';
  $('applyAll').checked = profile?.applyToAllProtocols !== false;
  $('targetProtocol').value = profile?.targetProtocol ?? 'http';
  updateTargetVisibility();
  $('editor').showModal();
  $('name').focus();
}

$('applyAll').addEventListener('change', updateTargetVisibility);
$('profileForm').addEventListener('submit', async event => {
  event.preventDefault();
  let profile;
  try {
    profile = ProxySlackCore.validateProfile({ id: editingId, name: $('name').value, type: $('type').value, host: $('host').value, port: $('port').value, applyToAllProtocols: $('applyAll').checked, targetProtocol: $('targetProtocol').value });
  } catch (err) { notify(localError(err.message)); return; }
  $('editor').close();
  await action('save', { profile }, t('profileSaved'));
});
$('closeBtn').addEventListener('click', () => $('editor').close());
$('cancelBtn').addEventListener('click', () => $('editor').close());
$('addBtn').addEventListener('click', () => openEditor());
$('directBtn').addEventListener('click', () => action('activate', { id: 'direct' }, t('directActivated')));
$('releaseBtn').addEventListener('click', () => action('release', {}, t('browserRestored')));
$('testBtn').addEventListener('click', async () => {
  if (busy) return;
  $('ipResult').hidden = false;
  $('ipResult').textContent = t('ipTesting');
  try { const result = await request('testIp'); $('ipResult').textContent = t('ipResult', result.ip); }
  catch (err) { $('ipResult').textContent = t('ipFailed', localError(err.message)); }
});
$('importBtn').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 100000) { notify(t('fileTooLarge')); return; }
  try { const contents = await file.text(); ProxySlackCore.parseImport(contents); if (confirm(t('importConfirm'))) await action('import', { text: contents }, t('profilesImported')); }
  catch (err) { notify(localError(err.message)); }
});
$('exportBtn').addEventListener('click', () => {
  try {
    const content = ProxySlackCore.exportData(appState.profiles);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'proxyslack-profiles.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(t('profilesExported'), true);
  } catch (err) { notify(localError(err.message)); }
});

function permissionOrigin(ipUrl) {
  const url = new URL(ipUrl);
  return `${url.protocol}//${url.hostname}/*`;
}

$('settingsBtn').addEventListener('click', () => {
  $('languageSelect').value = appState.settings.language;
  $('ipUrl').value = appState.settings.ipUrl;
  $('settingsNotice').textContent = '';
  $('settingsDialog').showModal();
});
$('settingsCloseBtn').addEventListener('click', () => $('settingsDialog').close());
$('resetIpBtn').addEventListener('click', () => { $('ipUrl').value = ProxySlackCore.defaultIpUrl; });
$('settingsForm').addEventListener('submit', async event => {
  event.preventDefault();
  let settings;
  try { settings = ProxySlackCore.validateSettings({ language: $('languageSelect').value, ipUrl: $('ipUrl').value }); }
  catch (err) { $('settingsNotice').textContent = localError(err.message); return; }
  const oldOrigin = permissionOrigin(appState.settings.ipUrl);
  const newOrigin = permissionOrigin(settings.ipUrl);
  if (newOrigin !== permissionOrigin(ProxySlackCore.defaultIpUrl)) {
    try {
      const granted = await chrome.permissions.request({ origins: [newOrigin] });
      if (!granted) { $('settingsNotice').textContent = t('permissionDenied'); return; }
    } catch (err) { $('settingsNotice').textContent = localError(err.message); return; }
  }
  const saved = await action('saveSettings', { settings }, t('settingsSaved'));
  if (!saved) { $('settingsNotice').textContent = $('notice').textContent; return; }
  ProxySlackI18n.setPreference(settings.language);
  render();
  notify(t('settingsSaved'), true);
  $('ipResult').hidden = true;
  $('settingsDialog').close();
  if (oldOrigin !== newOrigin && oldOrigin !== permissionOrigin(ProxySlackCore.defaultIpUrl)) {
    chrome.permissions.remove({ origins: [oldOrigin] }).catch(() => {});
  }
});

$('statusPill').textContent = t('loading');
$('currentTitle').textContent = t('loading');
request('snapshot').then(value => { appState = value; ProxySlackI18n.setPreference(value.settings.language); render(); }, err => notify(localError(err.message)));
