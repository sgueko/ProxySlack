#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
version=''
id=$(<"$root/EXTENSION_ID")
browser=''
local_mode=false
dry_run=false
test_root=''
usage() { cat <<'HELP'
Usage: ./install.sh [--browser chromium|chrome|brave|vivaldi|edge] [--version X.Y.Z] [--local] [--dry-run] [--test-root /tmp/dir]
Installs ProxySlack through Linux external extension metadata. --local uses the signed dist/ CRX.
No browser security flags or managed policies are changed.
HELP
}
while (($#)); do
  case $1 in
    --browser) [[ $# -ge 2 ]] || { usage; exit 2; }; browser=$2; shift 2;;
    --version) [[ $# -ge 2 ]] || { usage; exit 2; }; version=$2; shift 2;;
    --local) local_mode=true; shift;;
    --dry-run) dry_run=true; shift;;
    --test-root) [[ $# -ge 2 ]] || exit 2; test_root=$2; shift 2;;
    --help|-h) usage; exit 0;;
    *) echo "Unknown option: $1" >&2; usage; exit 2;;
  esac
done
if [[ -z $version ]]; then
  if $local_mode; then version=$(<"$root/VERSION")
  elif $dry_run; then version=latest
  else
    command -v curl >/dev/null || { echo 'curl is required.' >&2; exit 1; }
    feed=$(curl --fail --location --show-error --silent --retry 2 https://github.com/sgueko/ProxySlack/releases/latest/download/update.xml)
    version=$(python3 -c 'import sys,xml.etree.ElementTree as E; r=E.fromstring(sys.stdin.read()); n=r.find(".//{http://www.google.com/update2/response}updatecheck"); print(n.attrib["version"])' <<<"$feed")
  fi
fi
if [[ $version != latest || $dry_run != true ]]; then
  [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+(\.[0-9]+)?$ ]] || { echo 'Invalid version.' >&2; exit 2; }
fi
[[ -f /etc/os-release ]] && . /etc/os-release
printf 'Distribution: %s\n' "${PRETTY_NAME:-Linux}"
if [[ -z $browser ]]; then
  available=()
  for entry in 'chromium:chromium' 'chromium-browser:chromium' 'google-chrome:chrome' 'google-chrome-stable:chrome' 'brave-browser:brave' 'vivaldi:vivaldi' 'microsoft-edge:edge' 'microsoft-edge-stable:edge'; do
    if command -v "${entry%%:*}" >/dev/null && [[ ! " ${available[*]} " == *" ${entry#*:} "* ]]; then available+=("${entry#*:}"); fi
  done
  if ((${#available[@]} == 0)); then echo 'No supported Chromium browser found.' >&2; exit 1; fi
  if ((${#available[@]} == 1)); then browser=${available[0]};
  elif [[ -t 0 ]]; then
    printf 'Detected browsers: %s\n' "${available[*]}"
    read -r -p 'Choose browser: ' browser
  else echo 'Multiple browsers found; use --browser.' >&2; exit 2; fi
fi
case $browser in
  chromium) binary=chromium; metadata=/usr/share/chromium/extensions;;
  chrome) binary=google-chrome; metadata=/usr/share/google-chrome/extensions;;
  edge) binary=microsoft-edge; metadata=/usr/share/microsoft-edge/extensions;;
  brave|vivaldi)
    echo "$browser detected. Its Linux external-extension directory is not verified here; no installation was changed." >&2
    echo 'Use the documented unpacked method or contribute a verified external directory.' >&2; exit 3;;
  *) echo "Unknown browser: $browser" >&2; exit 2;;
esac
case $browser in
  chromium) candidates=(chromium chromium-browser);;
  chrome) candidates=(google-chrome google-chrome-stable);;
  edge) candidates=(microsoft-edge microsoft-edge-stable);;
esac
found=false
for candidate in "${candidates[@]}"; do if command -v "$candidate" >/dev/null; then binary=$candidate; found=true; break; fi; done
$found || { echo "$browser is not installed." >&2; exit 1; }
if [[ -n $test_root ]]; then
  [[ $test_root == /tmp/* && $test_root != *..* ]] || { echo '--test-root must be a path below /tmp.' >&2; exit 2; }
  metadata="$test_root$metadata"
fi
crx_name="ProxySlack-$version.crx"
if $dry_run; then
  printf 'Would install %s for %s at %s/%s.json\n' "$crx_name" "$browser" "$metadata" "$id"
  printf 'Source: %s\n' "$(if $local_mode; then echo "$root/dist/$crx_name"; else echo "GitHub Releases v$version"; fi)"
  exit 0
fi
command -v openssl >/dev/null && command -v python3 >/dev/null || { echo 'OpenSSL and Python 3 are required for CRX verification.' >&2; exit 1; }
if $local_mode; then
  crx="$root/dist/$crx_name"
  [[ -f $crx ]] || { echo "Missing $crx; run scripts/sign.sh." >&2; exit 1; }
else
  command -v curl >/dev/null && command -v sha256sum >/dev/null || { echo 'curl and sha256sum are required.' >&2; exit 1; }
  temp=$(mktemp -d)
  trap 'rm -rf -- "$temp"' EXIT
  base="https://github.com/sgueko/ProxySlack/releases/download/v$version"
  curl --fail --location --show-error --silent --retry 2 "$base/$crx_name" --output "$temp/$crx_name"
  curl --fail --location --show-error --silent --retry 2 "$base/SHA256SUMS" --output "$temp/SHA256SUMS"
  expected=$(awk -v name="$crx_name" '$2 == name {print $1}' "$temp/SHA256SUMS")
  [[ $expected =~ ^[0-9a-fA-F]{64}$ ]] || { echo 'Missing or invalid CRX checksum.' >&2; exit 1; }
  printf '%s  %s\n' "$expected" "$temp/$crx_name" | sha256sum -c --status || { echo 'CRX checksum mismatch.' >&2; exit 1; }
  crx="$temp/$crx_name"
fi
actual=$(python3 "$root/scripts/crx3.py" verify --crx "$crx")
[[ $actual == "$id" ]] || { echo "Unexpected signer: $actual" >&2; exit 1; }
python3 - "$crx" "$version" <<'PY'
import io,json,sys,struct,zipfile
p,v=sys.argv[1:]
b=open(p,'rb').read(); size=struct.unpack('<I',b[8:12])[0]
with zipfile.ZipFile(io.BytesIO(b[12+size:])) as z: manifest=json.loads(z.read('manifest.json'))
if manifest.get('version')!=v or manifest.get('manifest_version')!=3: raise SystemExit('CRX manifest version mismatch')
PY
storage=/usr/local/share/proxyslack
if [[ -n $test_root ]]; then storage="$test_root$storage"; fi
crx_target="$storage/$crx_name"
meta_target="$metadata/$id.json"
meta=$(printf '{"external_crx":"%s","external_version":"%s"}\n' "$crx_target" "$version")
if [[ $EUID -eq 0 || -n $test_root ]]; then admin=(); else command -v sudo >/dev/null || { echo 'sudo is required for the system extension directory.' >&2; exit 1; }; admin=(sudo); fi
"${admin[@]}" install -d -m 755 -- "$storage" "$metadata"
"${admin[@]}" install -m 644 -- "$crx" "$crx_target"
printf '%s' "$meta" | "${admin[@]}" tee "$meta_target" >/dev/null
"${admin[@]}" chmod 644 "$meta_target"
printf 'Installed ProxySlack %s for %s. Restart the browser and accept its external-extension prompt if shown.\n' "$version" "$browser"
printf 'Browser policies or browser-specific restrictions can still block this method.\n'
