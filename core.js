const ProxySlackCore = (() => {
  const types = new Set(['http', 'https', 'socks4', 'socks5']);
  const targets = new Set(['http', 'https', 'ftp', 'other']);
  const defaultIpUrl = 'https://api.ipify.org/?format=json';
  const defaults = [
    { id: 'tor-http', name: 'Tor HTTP', type: 'http', host: '127.0.0.1', port: 8118, applyToAllProtocols: true, targetProtocol: 'http' },
    { id: 'tor-socks5', name: 'Tor SOCKS5', type: 'socks5', host: '127.0.0.1', port: 9050, applyToAllProtocols: true, targetProtocol: 'http' }
  ];

  function validateProfile(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Profil invalide.');
    const name = String(input.name ?? '').trim();
    const host = String(input.host ?? '').trim();
    const type = String(input.type ?? '').toLowerCase();
    const port = Number(input.port);
    if (!name || name.length > 60) throw new Error('Le nom doit contenir entre 1 et 60 caractères.');
    if (!types.has(type)) throw new Error('Protocole proxy invalide.');
    if (!host || host.length > 253 || /[\s/:@?#\\]/.test(host) || !/^[a-zA-Z0-9.\-]+$/.test(host) || host.startsWith('-') || host.endsWith('-')) {
      throw new Error('Hôte invalide : utilisez une adresse IPv4 ou un nom DNS ASCII.');
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port invalide (1–65535).');
    const applyToAllProtocols = input.applyToAllProtocols === undefined ? true : input.applyToAllProtocols;
    if (typeof applyToAllProtocols !== 'boolean') throw new Error('Option « tous les protocoles » invalide.');
    const targetProtocol = input.targetProtocol ?? 'http';
    if (!targets.has(targetProtocol)) throw new Error('Protocole de destination invalide.');
    const id = typeof input.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(input.id) ? input.id : crypto.randomUUID();
    if (id === 'direct') throw new Error('Identifiant de profil réservé.');
    return { id, name, type, host, port, applyToAllProtocols, targetProtocol };
  }

  function validateCollection(input) {
    if (!Array.isArray(input) || input.length > 100) throw new Error('Le fichier doit contenir au plus 100 profils.');
    const profiles = input.map(validateProfile);
    const ids = new Set(profiles.map(p => p.id));
    if (ids.size !== profiles.length) throw new Error('Identifiants de profil dupliqués.');
    return profiles;
  }

  function proxyConfig(profile) {
    const p = validateProfile(profile);
    const server = { scheme: p.type, host: p.host, port: p.port };
    const keys = p.applyToAllProtocols
      ? ['proxyForHttp', 'proxyForHttps', 'proxyForFtp', 'fallbackProxy']
      : [{ http: 'proxyForHttp', https: 'proxyForHttps', ftp: 'proxyForFtp', other: 'fallbackProxy' }[p.targetProtocol]];
    return { mode: 'fixed_servers', rules: Object.fromEntries(keys.map(key => [key, server])) };
  }

  function parseImport(text) {
    if (typeof text !== 'string' || text.length > 100000) throw new Error('Fichier JSON trop volumineux.');
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('JSON invalide.'); }
    if (!data || data.format !== 'ProxySlack' || data.version !== 1) throw new Error('Format ProxySlack non reconnu.');
    return validateCollection(data.profiles);
  }

  function exportData(profiles) {
    return JSON.stringify({ format: 'ProxySlack', version: 1, profiles: validateCollection(profiles) }, null, 2);
  }

  function validateIpUrl(input) {
    if (typeof input !== 'string' || input.length > 500) throw new Error('Adresse du test IP invalide.');
    let url;
    try { url = new URL(input.trim()); } catch { throw new Error('Adresse du test IP invalide.'); }
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.hash) {
      throw new Error('Utilisez une adresse HTTPS sans identifiants ni fragment.');
    }
    return url.href;
  }

  function validateSettings(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Réglages invalides.');
    const language = input.language ?? 'auto';
    if (!['auto', 'en', 'fr'].includes(language)) throw new Error('Langue invalide.');
    return { language, ipUrl: validateIpUrl(input.ipUrl ?? defaultIpUrl) };
  }

  function isIp(value) {
    if (typeof value !== 'string' || value.length > 45 || value !== value.trim()) return false;
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) return value.split('.').every(part => Number(part) <= 255);
    if (!/^[0-9a-fA-F:.]+$/.test(value) || !value.includes(':')) return false;
    try { new URL(`http://[${value}]/`); return true; } catch { return false; }
  }

  function parseIpResponse(contentType, body) {
    if (typeof body !== 'string' || body.length > 512) throw new Error('Réponse IP trop volumineuse.');
    const mediaType = String(contentType ?? '').split(';')[0].trim().toLowerCase();
    let ip;
    if (mediaType === 'application/json') {
      let data;
      try { data = JSON.parse(body); } catch { throw new Error('JSON de réponse IP invalide.'); }
      if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length !== 1 || !Object.hasOwn(data, 'ip')) {
        throw new Error('Le JSON doit contenir uniquement la clé « ip ».');
      }
      ip = data.ip;
    } else if (mediaType === 'text/plain') ip = body.trim();
    else throw new Error('Réponse IP attendue en JSON ou texte brut, pas en HTML.');
    if (!isIp(ip)) throw new Error('La réponse ne contient pas une adresse IP valide.');
    return ip;
  }

  return { defaults, defaultIpUrl, validateProfile, validateCollection, proxyConfig, parseImport, exportData, validateIpUrl, validateSettings, parseIpResponse };
})();
if (typeof module !== 'undefined') module.exports = ProxySlackCore;
