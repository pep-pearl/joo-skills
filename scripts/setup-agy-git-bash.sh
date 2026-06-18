#!/usr/bin/env bash
set -euo pipefail

if ! command -v cygpath >/dev/null 2>&1; then
  echo "ERROR: This helper is for Git Bash/MSYS on Windows (cygpath was not found)." >&2
  if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then return 1; else exit 1; fi
fi

if [[ -z "${LOCALAPPDATA:-}" ]]; then
  echo "ERROR: LOCALAPPDATA is not set. Open a normal Git Bash session from Windows and retry." >&2
  if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then return 1; else exit 1; fi
fi

agy_dir="$(cygpath -u "$LOCALAPPDATA")/agy/bin"
agy_exe="$agy_dir/agy.exe"

if [[ ! -f "$agy_exe" ]]; then
  cat >&2 <<MSG
ERROR: Antigravity CLI was not found at:
  $agy_exe

Install it from PowerShell first:
  irm https://antigravity.google/cli/install.ps1 | iex
MSG
  if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then return 1; else exit 1; fi
fi

path_line='export PATH="$(cygpath -u "$LOCALAPPDATA")/agy/bin:$PATH"'
profile_line='[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc"'

touch "$HOME/.bashrc"
if ! grep -Fqx "$path_line" "$HOME/.bashrc"; then
  printf '\n%s\n' "$path_line" >> "$HOME/.bashrc"
  echo "Added Antigravity CLI to $HOME/.bashrc"
else
  echo "Antigravity CLI PATH entry already exists in $HOME/.bashrc"
fi

touch "$HOME/.bash_profile"
if ! grep -Fqx "$profile_line" "$HOME/.bash_profile"; then
  printf '\n%s\n' "$profile_line" >> "$HOME/.bash_profile"
  echo "Configured $HOME/.bash_profile to load .bashrc"
fi

export PATH="$agy_dir:$PATH"
hash -r

echo "Resolved agy: $(command -v agy)"
agy --version

echo
echo "Git Bash PATH is fixed. New terminals will pick it up automatically."
echo "For the current parent shell, run: source ~/.bashrc"
