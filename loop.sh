#!/usr/bin/env bash
# Runs OpenCode in a loop, one fresh-context iteration per run, until the agent
# writes COMPLETE or BLOCKED_ON_HUMAN to .loop/STATUS (or a limit is hit).
#
# Usage:   ./loop.sh [max_iterations]
# Env:     LOOP_BRANCH   branch to work on        (default: autonomous/couples-v2)
#          ITER_TIMEOUT  per-iteration time limit (default: 50m)
#          OPENCODE_CMD  command to launch        (default: "opencode run --auto")
#
# Needs: git, opencode, and `timeout` (macOS: `brew install coreutils`, then
# run with TIMEOUT_CMD=gtimeout). Linux, macOS or WSL.
set -u

MAX="${1:-300}"
BRANCH="${LOOP_BRANCH:-autonomous/couples-v2}"
ITER_TIMEOUT="${ITER_TIMEOUT:-50m}"
OPENCODE_CMD="${OPENCODE_CMD:-opencode run --auto}"
TIMEOUT_CMD="${TIMEOUT_CMD:-timeout}"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Run this inside the git repo root."; exit 1; }
[ -f PROMPT.md ] && [ -f MASTER_SPEC.md ] || { echo "PROMPT.md and MASTER_SPEC.md must be in the repo root."; exit 1; }

mkdir -p .loop/logs
# Keep loop bookkeeping out of git status without touching the tracked .gitignore.
for p in ".loop/logs/" ".loop/STATUS"; do
  grep -qxF "$p" .git/info/exclude 2>/dev/null || echo "$p" >> .git/info/exclude
done

current="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current" != "$BRANCH" ]; then
  git checkout -B "$BRANCH" || { echo "Could not switch to $BRANCH"; exit 1; }
fi

fails=0
for i in $(seq 1 "$MAX"); do
  echo "RUNNING" > .loop/STATUS
  log=".loop/logs/iter-$(printf '%04d' "$i")-$(date +%Y%m%d-%H%M%S).log"
  echo "=== iteration $i/$MAX  ($(date '+%F %T'))  log: $log ==="

  # shellcheck disable=SC2086
  "$TIMEOUT_CMD" "$ITER_TIMEOUT" $OPENCODE_CMD \
    "Read PROMPT.md in the repo root and carry out exactly one iteration exactly as it instructs." \
    2>&1 | tee "$log"

  status="$(tr -d '[:space:]' < .loop/STATUS 2>/dev/null || echo RUNNING)"
  case "$status" in
    CONTINUE)
      fails=0 ;;
    COMPLETE)
      echo "Loop finished: all work complete. See docs/VERIFICATION.md."; exit 0 ;;
    BLOCKED_ON_HUMAN)
      echo "Loop paused: your input is needed. See .loop/HUMAN_TASKS.md, answer there, then re-run ./loop.sh"; exit 2 ;;
    *)
      fails=$((fails + 1))
      echo "Iteration ended without a valid status ($fails/3 in a row)."
      if [ "$fails" -ge 3 ]; then
        echo "Stopping after 3 failed iterations in a row. Read the last logs in .loop/logs/."
        exit 3
      fi ;;
  esac
  sleep 5
done

echo "Reached max iterations ($MAX). Re-run ./loop.sh to continue; state is in .loop/."
exit 4
