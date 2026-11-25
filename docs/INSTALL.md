# Linux installation

Requirements: Bash, curl, Python 3, OpenSSL, sha256sum and sudo for system-wide registration. On Slackware, Chromium's external extension metadata directory is `/usr/share/chromium/extensions/`. The script detects the distribution and installed browsers, but you can specify `--browser` explicitly.

Before the first GitHub Release, build locally with `PROXYSLACK_KEY_PATH=/secure/path/proxyslack.pem ./scripts/sign.sh` and run `./install.sh --browser chromium --local`. Use `--dry-run` to see paths before any writes. Once a release exists, `./install.sh --browser chromium` downloads the versioned CRX and checks its SHA-256, CRX3 signature, pinned extension ID and manifest version. `--version 1.2.0` selects an exact release.

The installer registers a local signed CRX using Linux external extension JSON, without changing browser flags or managed policies. Restart the browser and accept any external extension prompt. Some browser builds or policies may reject external installation. Chrome and Edge paths are included according to their official Linux documentation; only Slackware Chromium has been run in this environment. Brave/Vivaldi are detected, but external paths are unverified, so the installer stops safely. For development, load `extension/` unpacked through `chrome://extensions` with Developer mode.

`./update.sh --browser chromium` fetches the latest feed and reinstalls the new signed CRX. `./uninstall.sh --browser chromium` removes ProxySlack's external registration; browser profile data remains. Browser-managed automatic updates depend on support for the embedded `update_url` and GitHub-hosted feed and need post-publication verification. See [distribution](DISTRIBUTION.md).

For a harmless end-to-end installer test, run `./install.sh --browser chromium --local --test-root /tmp/proxyslack-check` and then `./uninstall.sh --browser chromium --test-root /tmp/proxyslack-check`. This creates external metadata only inside that temporary test directory and does not install into the actual browser.
