#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
version=$(<"$root/VERSION")
id=$(<"$root/EXTENSION_ID")
crx="$root/dist/ProxySlack-$version.crx"
zip="$root/dist/ProxySlack-$version.zip"
[[ -f $crx && -f $zip ]] || { echo 'Run scripts/sign.sh first.' >&2; exit 1; }
actual=$(python3 "$root/scripts/crx3.py" verify --crx "$crx")
[[ $actual == "$id" ]] || { echo 'CRX extension ID differs from EXTENSION_ID.' >&2; exit 1; }
python3 - "$root/update.xml" "$root/dist/update.xml" "$version" "$id" <<'PY'
import pathlib,sys,xml.etree.ElementTree as ET
source,target,version,id=sys.argv[1:]
url=f'https://github.com/sgueko/ProxySlack/releases/download/v{version}/ProxySlack-{version}.crx'
ns='http://www.google.com/update2/response'
root=ET.Element('gupdate', {'xmlns':ns,'protocol':'2.0'})
app=ET.SubElement(root,'app',{'appid':id})
ET.SubElement(app,'updatecheck',{'codebase':url,'version':version})
xml='<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(root,encoding='unicode')+'\n'
for path in (source,target): pathlib.Path(path).write_text(xml,encoding='utf-8')
PY
(cd "$root/dist" && sha256sum "ProxySlack-$version.crx" "ProxySlack-$version.zip" update.xml > SHA256SUMS)
printf 'Release artifacts for v%s, extension ID %s\n' "$version" "$id"
