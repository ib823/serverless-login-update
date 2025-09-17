#!/usr/bin/env bash
set -euo pipefail
DESC="${1:-Passkeys IdP MVP sync}"

git rev-parse --is-inside-work-tree >/dev/null || { echo "Not a git repo"; exit 1; }
git remote get-url origin >/dev/null || { echo "No 'origin' remote"; exit 1; }

DEFAULT_BRANCH="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || true)"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-$(git remote show origin 2>/dev/null | sed -n '/HEAD branch/s/.*: //p')}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

# Ensure ignores
touch .gitignore
for p in "node_modules/" ".next/" "out/" ".vercel/" ".env" ".env.*" ".env.local"; do
  grep -qxF "$p" .gitignore 2>/dev/null || echo "$p" >> .gitignore
done
git rm -r --cached node_modules .next out .vercel 2>/dev/null || true

# Optional: add uuid types if missing
if ! node -e "require.resolve('@types/uuid')" >/dev/null 2>&1; then
  npm i -D @types/uuid
fi

# Commit on a fresh feature branch
BR="feat/mvp-sync-$(date -u +%Y%m%d-%H%M%S)"
git switch -c "$BR"
git add -A
git commit -m "chore(sync): ${DESC} @ $(date -u +'%Y-%m-%d %H:%M:%S UTC')" || true

# Rebase on latest default for the neatest diff
git fetch origin
git rebase "origin/$DEFAULT_BRANCH" || { git rebase --abort || true; }

# Push the feature branch only (no main)
git push -u origin HEAD

# Print a PR URL
REPO_SLUG="$(git remote get-url origin | sed -E 's#(git@|https://)github.com[:/](.+?)(\.git)?$#\2#')"
echo "Open PR: https://github.com/$REPO_SLUG/compare/$DEFAULT_BRANCH...$BR"
