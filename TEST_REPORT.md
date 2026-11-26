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
| `shellcheck` locally | Passed on 2026-11-26 with the same command as GitHub CI (downloaded official ShellCheck 0.11.0 into `/tmp`) |
| Real system-wide external install and browser-managed automatic update | Not run: the GitHub repository/release does not yet exist; requires post-publication browser validation |
| Google Chrome, Edge, Brave, Vivaldi | Not tested locally; installer only enables documented external paths for Chrome/Edge and stops for Brave/Vivaldi |

The screenshots do not demonstrate live proxy reachability or anonymity. The local install/uninstall test writes only below `/tmp`. No real IP address or private signing key is included in public artifacts.

## ShellCheck correction — 2026-11-26

- ShellCheck 0.11.0: passed with the exact workflow command, `shellcheck install.sh uninstall.sh update.sh scripts/*.sh`.
- `bash -n`: passed for every Bash script in that command.
- Manifest JSON validation and JavaScript syntax checks: passed.
- JavaScript tests: four test files passed; Python distribution tests: four passed.
- Chromium installer: remote and local `--dry-run` passed; signed `--local` install/uninstall passed in an isolated `/tmp` root.
- GitHub Actions workflows: `actionlint` 1.7.12 passed with ShellCheck enabled. The release build, CRX3 verification and all SHA-256 checks passed locally.
- Signing-key hash, extension ID and existing `v1.2.0` tag were unchanged. No GitHub workflow was run remotely during this correction.
