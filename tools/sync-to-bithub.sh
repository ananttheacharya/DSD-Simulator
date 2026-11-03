#!/usr/bin/env bash
# Copy the standalone simulator into the BitHub Jaipur front-end as a static
# sub-site: Front-End New/public/dsd  ->  served at <site>/dsd/index.html
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
dest="${1:-$here/../BitHub-Jaipur/Front-End New/public/dsd}"
mkdir -p "$dest"
rsync -a --delete --exclude '.git' --exclude 'tests' --exclude 'tools' --exclude 'README.md' "$here/" "$dest/"
echo "Synced DSD simulator -> $dest"
