#!/usr/bin/env bash
set -euo pipefail

DESC="${1:-Passkeys IdP MVP sync}"

# --- sanity ---
git rev-parse --is-inside-work-tree >/dev/null || { echo "Not a git repo"; exit 1; }
git remote get-url origin >/dev/null || { echo "No 'origin' remote"; exit 1; }

# --- default branch ---
DEFAULT_BRANCH="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || true)"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-$(git remote show origin 2>/dev/null | sed -n '/HEAD branch/s/.*: //p')}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

# --- .gitignore: keep secrets/artifacts out going forward ---
ensure_ignore(){ grep -qxF "$1" .gitignore 2>/dev/null || echo "$1" >> .gitignore; }
touch .gitignore
ensure_ignore "node_modules/"
ensure_ignore ".next/"
ensure_ignore "out/"
ensure_ignore ".vercel/"
ensure_ignore ".DS_Store"
ensure_ignore ".env"
ensure_ignore ".env.*"
ensure_ignore ".env.local"

# --- small TS build fix (type arg on untyped call) ---
if [ -f app/api/budget/summary/route.ts ]; then
  sed -i 's/redis\.mget<[^>]*>(\.\.\.keys as any)/redis.mget(...(keys as any))/g' app/api/budget/summary/route.ts || true
fi

# --- feature branch name ---
AUTO_BRANCH="feat/mvp-sync-$(date -u +%Y%m%d-%H%M%S)"
echo "Default branch: $DEFAULT_BRANCH"
echo "Working branch: $AUTO_BRANCH"

git fetch origin --prune
git switch "$AUTO_BRANCH" 2>/dev/null || git switch -c "$AUTO_BRANCH"

# --- optional build (non-blocking) ---
if [ -f package.json ] && grep -q '"build"\s*:' package.json; then
  echo "Build script detected -> running build (non-blocking)"
  set +e
  PM="npm"; [ -f package-lock.json ] && PM=npm
  command -v pnpm >/dev/null && PM=pnpm
  command -v yarn >/dev/null && PM=yarn
  command -v bun  >/dev/null && PM=bun
  $PM run build
  echo "Build exit code: $?"
  set -e
fi

# --- stage everything except secrets/artifacts ---
git add -A
git restore -q --staged -- .env .env.* .env.local || true
git restore -q --staged -- node_modules .next out .vercel || true

# --- commit if needed ---
git diff --cached --quiet || git commit -m "chore(sync): ${DESC} @ $(date -u +'%Y-%m-%d %H:%M:%S UTC')"

# --- if artifacts ever got committed in this branch, purge them from history ---
if git rev-list -n 1 HEAD -- node_modules .next out .vercel >/dev/null 2>&1; then
  echo "Purging tracked artifacts from branch history (node_modules/.next/out/.vercel)…"
  if ! command -v git-filter-repo >/dev/null 2>&1; then
    python3 -m pip install --user git-filter-repo >/dev/null 2>&1 || true
    export PATH="$PATH:$HOME/.local/bin"
  fi
  git filter-repo --force --invert-paths \
    --path node_modules --path .next --path out --path .vercel \
    --refs HEAD
  echo "History rewritten."
fi

# --- rebase on latest default for clean merge window ---
git fetch origin
if ! git rebase "origin/$DEFAULT_BRANCH"; then
  echo "Rebase conflict -> aborting rebase; will merge without rebase."
  git rebase --abort || true
fi

# --- push feature branch (force only if history was rewritten) ---
PUSH_ARGS="-u origin HEAD"
git show -s --format=%B HEAD | grep -q "filter-repo" && PUSH_ARGS="$PUSH_ARGS --force-with-lease" || true
git push $PUSH_ARGS

# --- attempt merge into default branch ---
git switch "$DEFAULT_BRANCH"
git pull --ff-only || git pull --rebase
set +e
git merge --ff-only "$AUTO_BRANCH"; FF=$?
set -e
if [ $FF -ne 0 ]; then
  echo "Fast-forward not possible. Trying auto-merge (-X theirs)."
  set +e; git merge -X theirs --no-edit "$AUTO_BRANCH"; MERGED=$?; set -e
  if [ $MERGED -ne 0 ]; then
    REPO_SLUG="$(git remote get-url origin | sed -E 's#(git@|https://)github.com[:/](.+?)(\.git)?$#\2#')"
    echo "Auto-merge failed. Open PR: https://github.com/$REPO_SLUG/compare/$DEFAULT_BRANCH...$AUTO_BRANCH"
    exit 0
  fi
fi
git push origin "$DEFAULT_BRANCH"

REPO_SLUG="$(git remote get-url origin | sed -E 's#(git@|https://)github.com[:/](.+?)(\.git)?$#\2#')"
FULL_SHA="$(git rev-parse HEAD)"
echo "Merged to $DEFAULT_BRANCH."
echo "Branch URL : https://github.com/$REPO_SLUG/tree/$AUTO_BRANCH"
echo "Commit URL : https://github.com/$REPO_SLUG/commit/$FULL_SHA"
echo "Default URL: https://github.com/$REPO_SLUG/tree/$DEFAULT_BRANCH"
