#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
id=$(<"$root/EXTENSION_ID")
usage() { echo 'Usage: ./uninstall.sh --browser chromium|chrome|edge [--dry-run] [--test-root /tmp/dir]'; }
browser=''; dry_run=false; test_root=''
while (($#)); do case $1 in
  --browser) [[ $# -ge 2 ]] || exit 2; browser=$2; shift 2;;
  --dry-run) dry_run=true; shift;;
  --test-root) [[ $# -ge 2 ]] || exit 2; test_root=$2; shift 2;;
  --help|-h) usage; exit 0;;
  *) usage; exit 2;;
esac; done
case $browser in
  chromium) metadata=/usr/share/chromium/extensions;;
  chrome) metadata=/usr/share/google-chrome/extensions;;
  edge) metadata=/usr/share/microsoft-edge/extensions;;
  *) usage; exit 2;;
esac
if [[ -n $test_root ]]; then
  [[ $test_root == /tmp/* && $test_root != *..* ]] || { echo '--test-root must be below /tmp.' >&2; exit 2; }
  metadata="$test_root$metadata"
fi
file="$metadata/$id.json"
if $dry_run; then echo "Would remove $file and ProxySlack-owned CRX files."; exit 0; fi
if [[ $EUID -eq 0 || -n $test_root ]]; then admin=(); else command -v sudo >/dev/null || exit 1; admin=(sudo); fi
"${admin[@]}" rm -f -- "$file"
# Only artifacts inside the dedicated ProxySlack directory are removed.
remaining=false
for dir in /usr/share/chromium/extensions /usr/share/google-chrome/extensions /usr/share/microsoft-edge/extensions; do
  if [[ -f $test_root$dir/$id.json ]]; then remaining=true; fi
done
if ! $remaining; then
  "${admin[@]}" rm -f -- "$test_root"/usr/local/share/proxyslack/ProxySlack-*.crx
  "${admin[@]}" rmdir --ignore-fail-on-non-empty "$test_root"/usr/local/share/proxyslack 2>/dev/null || true
fi
echo 'ProxySlack external registration removed. Browser profile data was preserved.'
