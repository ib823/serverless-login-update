#!/usr/bin/env bash
set -euo pipefail

DESC="${1:-Passkeys IdP MVP sync}"

# --- prerequisites ---
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Not a git repo"; exit 1; }
git remote get-url origin >/dev/null 2>&1 || { echo "No 'origin' remote configured"; exit 1; }

# --- figure out default branch (origin/HEAD -> main or master) ---
DEFAULT_BRANCH="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || true)"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-$(git remote show origin 2>/dev/null | sed -n '/HEAD branch/s/.*: //p')}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

# --- ensure .gitignore safely excludes secrets/artifacts ---
ensure_ignore() {
  local pat="$1"
  grep -qxF "$pat" .gitignore 2>/dev/null || echo "$pat" >> .gitignore
}
touch .gitignore
ensure_ignore "node_modules/"
ensure_ignore ".next/"
ensure_ignore "out/"
ensure_ignore ".vercel/"
ensure_ignore ".DS_Store"
ensure_ignore ".env"
ensure_ignore ".env.*"
ensure_ignore ".env.local"

# --- name the working branch ---
AUTO_BRANCH="feat/mvp-sync-$(date -u +%Y%m%d-%H%M%S)"
echo "Default branch: $DEFAULT_BRANCH"
echo "Working branch: $AUTO_BRANCH"

git fetch origin --prune

# --- create/switch to feature branch ---
git switch "$AUTO_BRANCH" 2>/dev/null || git switch -c "$AUTO_BRANCH"

# --- optional build (non-blocking) ---
if [ -f package.json ] && grep -q '"build"\s*:' package.json; then
  echo "Build script detected -> running build (non-blocking)"
  set +e
  PM=""
  if command -v pnpm >/dev/null 2>&1; then PM=pnpm
  elif command -v yarn >/dev/null 2>&1; then PM=yarn
  elif command -v bun  >/dev/null 2>&1; then PM=bun
  else PM=npm; fi
  [ -f package-lock.json ] && PM=npm
  $PM run build
  echo "Build exit code: $? (continuing regardless)"
  set -e
fi

# --- stage changes, but never secrets or large artifacts ---
git add -A
# belt-and-suspenders: unstage if they slipped past
git restore -q --staged -- .env .env.* .env.local || true
git restore -q --staged -- .next out node_modules || true

# --- commit if there are staged changes ---
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "chore(sync): ${DESC} @ $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
fi

# --- rebase this branch onto latest default (best chance for clean merge) ---
git fetch origin
if ! git rebase "origin/$DEFAULT_BRANCH"; then
  echo "Rebase conflict -> aborting rebase and proceeding without it."
  git rebase --abort || true
fi

# --- push feature branch ---
git push -u origin HEAD
SHORT_SHA="$(git rev-parse --short HEAD)"
echo "Pushed feature branch commit: $SHORT_SHA"

# --- attempt merge into default branch ---
git switch "$DEFAULT_BRANCH"
# update local default
git pull --ff-only || git pull --rebase
set +e
git merge --ff-only "$AUTO_BRANCH"
FF=$?
set -e

if [ $FF -ne 0 ]; then
  echo "Fast-forward not possible. Trying auto-merge preferring feature branch (-X theirs)."
  set +e
  git merge -X theirs --no-edit "$AUTO_BRANCH"
  MERGED=$?
  set -e
  if [ $MERGED -ne 0 ]; then
    echo "Auto-merge failed. Leaving feature branch pushed."
    REPO_SLUG="$(git remote get-url origin | sed -E 's#(git@|https://)github.com[:/](.+?)(\.git)?$#\2#')"
    echo "Open a PR to merge: https://github.com/$REPO_SLUG/compare/$DEFAULT_BRANCH...$AUTO_BRANCH"
    exit 0
  fi
fi

# --- push merged default branch ---
git push origin "$DEFAULT_BRANCH"

# --- report URLs ---
REPO_SLUG="$(git remote get-url origin | sed -E 's#(git@|https://)github.com[:/](.+?)(\.git)?$#\2#')"
FULL_SHA="$(git rev-parse HEAD)"
echo "Merged to $DEFAULT_BRANCH."
echo "Branch URL : https://github.com/$REPO_SLUG/tree/$AUTO_BRANCH"
echo "Commit URL : https://github.com/$REPO_SLUG/commit/$FULL_SHA"
echo "Default URL: https://github.com/$REPO_SLUG/tree/$DEFAULT_BRANCH"
