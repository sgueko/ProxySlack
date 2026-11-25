#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
"$root/scripts/build.sh"
version=$(<"$root/VERSION")
python3 - "$root/dist/unpacked" "$root/dist/ProxySlack-$version.zip" <<'PY'
import pathlib, sys, zipfile
source=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2])
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for file in sorted(source.rglob('*')):
        if file.is_file(): z.write(file, file.relative_to(source))
with zipfile.ZipFile(out) as z:
    if z.testzip(): raise SystemExit('ZIP failed integrity check')
print(out)
PY
