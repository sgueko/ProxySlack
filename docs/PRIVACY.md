# Privacy

ProxySlack has no account, telemetry, tracker, remote JavaScript or page content script. Profiles and settings are kept in `chrome.storage.local` on the device, not synchronized. An exported JSON file contains proxy names, addresses and ports in plain text; protect it as appropriate. The extension does not collect proxy usernames or passwords.

The **Test my IP** button contacts the configured HTTPS service on demand. The default is `https://api.ipify.org/?format=json`; a custom service needs optional host permission when saved. That service sees the request's apparent IP address and may have its own logs and privacy policy. The test only accepts a single valid IP address as plain text or JSON and rejects HTML and oversized responses.

Changing Chromium's proxy setting does not control other applications, operating-system DNS behavior, all WebRTC paths or browser fingerprinting. A selected badge reports browser proxy-control state, not confirmed anonymity or proxy reachability. Tor HTTP requires a local HTTP-to-Tor relay; Tor SOCKS5 requires a local Tor SOCKS service. ProxySlack is neither a VPN nor Tor Browser.
