#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rm -rf "${repo_root}/plugins/web-skills/skills"
mkdir -p "${repo_root}/plugins/web-skills/skills"
cp -R "${repo_root}/skills/web-flow-testing" "${repo_root}/plugins/web-skills/skills/"
