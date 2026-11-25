# Test report — ProxySlack 1.2.0

Date: 2026-11-25. Environment: Slackware Linux, Chromium 158.0.8127.36, Node 24.22.3, Python 3 and OpenSSL.

| Check | Result |
|---|---|
| JavaScript behavior tests: profiles, protocol mapping, import/export, validation, proxy control, IP settings, localization, restart/update storage simulation | Passed (`node --test tests/*.test.js`, four test files) |
| Distribution tests: Manifest V3 and XML version/URL, dry run, isolated local install/uninstall, signed CRX ID | Passed (four Python tests) |
| Bash syntax | Passed (`bash -n` on all shell scripts) |
| ZIP/CRX3/update XML SHA-256 | Passed (`sha256sum -c SHA256SUMS` from `dist/`) |
| CRX3 cross-check with installed Chromium packer | Passed: Chromium's separately packed CRX verified with the same pinned extension ID `dbcomgjlncilknjnenoeaodnfiancdda` |
| Chromium popup and ten screenshots | Passed: real extension loaded in headless Chromium with a temporary profile; test-IP image uses a documentation fixture |
| `shellcheck` locally | Not run: not installed on Slackware; required in GitHub CI |
| Real system-wide external install and browser-managed automatic update | Not run: the GitHub repository/release does not yet exist; requires post-publication browser validation |
| Google Chrome, Edge, Brave, Vivaldi | Not tested locally; installer only enables documented external paths for Chrome/Edge and stops for Brave/Vivaldi |

The screenshots do not demonstrate live proxy reachability or anonymity. The local install/uninstall test writes only below `/tmp`. No real IP address or private signing key is included in public artifacts.
