# ProxySlack

ProxySlack is a Manifest V3 Chromium extension for switching HTTP, HTTPS, SOCKS4, and SOCKS5 proxy profiles.

## Install

1. Extract `ProxySlack.zip`.
2. Open `chrome://extensions` in Chromium or Chrome (`edge://extensions` in Edge).
3. Enable **Developer mode**, choose **Load unpacked**, and select the `ProxySlack` folder containing `manifest.json`.
4. Pin the extension to the toolbar.

ProxySlack initially leaves the browser's existing proxy setting alone. Select a profile to activate it. **Direct mode** explicitly disables proxy use in Chromium. **Browser settings** releases ProxySlack's control.

## Profiles and protocol scope

The initial profiles are **Tor HTTP** at `127.0.0.1:8118` and **Tor SOCKS5** at `127.0.0.1:9050`. The HTTP profile needs a running HTTP-to-Tor relay such as Privoxy. The SOCKS5 profile needs a running Tor SOCKS service. ProxySlack does not start either service.

When creating or editing a profile, **Apply for all protocols** is checked by default. It routes HTTP, HTTPS, FTP, and the fallback category of Chromium proxy requests through the selected proxy. Uncheck it to select one destination protocol. Other destination protocols then connect directly under Chromium's proxy rules. The profile's HTTP/HTTPS/SOCKS type is the protocol used **to reach the proxy server**. An HTTPS proxy requires a TLS connection to the proxy; it is not simply a proxy for HTTPS websites.

These settings affect Chromium's proxy configuration, not your operating system's proxy panel or other applications.

## Import, export, and IP test

**Test my IP** asks `https://api.ipify.org/?format=json` for the public IP it sees by default. In **Settings** (⚙), choose another HTTPS URL if needed. The service must return `application/json` containing only `{ "ip": "address" }` or `text/plain` containing only the IP address. HTML, responses over 512 bytes, redirects, and invalid IP values are rejected. The test is initiated only when you click the button and does not prove anonymity.

**Export JSON** saves profiles without the active selection. **Import JSON** replaces profiles after confirmation and returns to browser settings. The limit is 100 profiles and a 100 KB file. Older ProxySlack JSON files without the scope fields remain valid and default to all protocols.

```json
{
  "format": "ProxySlack",
  "version": 1,
  "profiles": [
    { "id": "my-proxy", "name": "My proxy", "type": "socks5", "host": "127.0.0.1", "port": 9050, "applyToAllProtocols": true, "targetProtocol": "http" }
  ]
}
```

## Privacy and limits

- A Chromium proxy is not a VPN or an anonymity guarantee. Other applications, and some browser or system mechanisms such as WebRTC or DNS depending on configuration, may use different network paths. For sensitive use, choose Tor Browser and its built-in protections.
- The badge reports the selected setting and whether ProxySlack still controls Chromium's proxy API. It does not prove that a proxy server is reachable or that a particular connection used it.
- Profiles are stored in `chrome.storage.local` on your device, without passwords or synchronization. Exported JSON contains hosts and ports in plain text.
- ProxySlack has no page scripts, browsing-history access, or telemetry. The IP test contacts `api.ipify.org` only on request.
- A policy or another extension may control the proxy. ProxySlack shows a conflict in that case.

## Permissions

`proxy` changes Chromium's proxy settings. `storage` stores profiles and settings locally. The default IP test has host access to `https://api.ipify.org/*`. A custom HTTPS test site receives an optional host permission only when you save it; the previous optional host permission is removed if you change sites. There are no broad required website, tab, or content-script permissions.

## Language

In **Settings** (⚙), the interface can follow the browser or be set to English or French. The extension name and description in the browser's extension manager still follow the browser language.

## Tests

Run `node --test tests/*.test.js` in the `ProxySlack` folder. A manual test with an actual proxy is still needed to confirm network behavior on your system.
