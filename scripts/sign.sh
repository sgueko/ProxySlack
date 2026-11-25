#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
key=${PROXYSLACK_KEY_PATH:-${XDG_DATA_HOME:-$HOME/.local/share}/proxyslack/signing.pem}
init=false
if [[ ${1:-} == --init-key ]]; then init=true; elif [[ $# -gt 0 ]]; then echo 'Usage: scripts/sign.sh [--init-key]' >&2; exit 2; fi
if [[ -e $key && $init == true ]]; then echo "Key already exists: $key" >&2; exit 1; fi
if [[ ! -e $key && $init == false ]]; then echo "Missing signing key: $key (run --init-key once)" >&2; exit 1; fi
umask 077
if [[ $init == true ]]; then
  mkdir -p -- "$(dirname -- "$key")"
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$key" >/dev/null 2>&1
  chmod 600 "$key"
fi
"$root/scripts/package.sh"
version=$(<"$root/VERSION")
crx="$root/dist/ProxySlack-$version.crx"
id=$(python3 "$root/scripts/crx3.py" sign --key "$key" --zip "$root/dist/ProxySlack-$version.zip" --out "$crx")
if [[ -f $root/dist/extension-id.txt && $(<"$root/dist/extension-id.txt") != "$id" ]]; then
  rm -f -- "$crx"
  echo 'Extension ID changed: signing key mismatch' >&2; exit 1
fi
printf '%s\n' "$id" > "$root/dist/extension-id.txt"
printf 'CRX3: %s\nExtension ID: %s\n' "$crx" "$id"
