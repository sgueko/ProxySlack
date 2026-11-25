#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
node "$root/scripts/screenshots.js"
python3 "$root/scripts/montage.py"
