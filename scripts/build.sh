#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
version=$(<"$root/VERSION")
python3 - "$root/extension/manifest.json" "$version" <<'PY'
import json, sys
manifest=json.load(open(sys.argv[1], encoding='utf-8'))
if manifest['manifest_version'] != 3 or manifest['version'] != sys.argv[2]:
    raise SystemExit('Manifest version and VERSION must match')
PY
mkdir -p "$root/dist"
rm -rf -- "$root/dist/unpacked"
cp -a -- "$root/extension" "$root/dist/unpacked"
if [[ -n ${PROXYSLACK_UPDATE_URL:-} ]]; then
  python3 - "$root/dist/unpacked/manifest.json" "$PROXYSLACK_UPDATE_URL" <<'PY'
import json, sys
from urllib.parse import urlparse
path, update_url=sys.argv[1:]
url=urlparse(update_url)
if url.scheme != 'https' or not url.hostname or not url.path.endswith('.xml'):
    raise SystemExit('PROXYSLACK_UPDATE_URL must be an HTTPS .xml URL')
with open(path, encoding='utf-8') as f: data=json.load(f)
data['update_url']=update_url
with open(path, 'w', encoding='utf-8') as f: json.dump(data, f, ensure_ascii=False, indent=2); f.write('\n')
PY
fi
printf 'Built extension %s in %s\n' "$version" "$root/dist/unpacked"
