# ── Shared by the test batches (scripts/test-*) ───────────────────────────────
#
# A batch is a list of `unit "<title>" <npm script>` lines, cheapest first, so a
# typo is reported in seconds rather than after the browser suite. Each unit is
# an npm script that also runs on its own. The batch stops at the first failure
# and ends with how long each unit took.
#
# A unit that cannot run fails the batch like any other failure: exit 4 is the
# device runners' "a prerequisite is missing" (Xcode, Maestro, the simulator, a
# prebuilt ios/), and the runner has just printed which one and how to fix it.
# A skipped suite would leave its platform untested behind a green result.

set -euo pipefail
cd "$(dirname "$0")/.."

BATCH_TIMES=()

_summary() {
  printf '\n'
  local line
  for line in "${BATCH_TIMES[@]}"; do
    printf '%s\n' "$line"
  done
}

unit() {
  local title="$1" script="$2"
  printf '\n\033[1m── %s ───────────────────────────────────────\033[0m\n' "$title"
  local start=$SECONDS status=0
  # --silent reaches every npm call beneath it through npm_config_loglevel.
  # expo-doctor reads `npm explain` errors, so test:doctor resets the level.
  npm run --silent "$script" || status=$?
  local took=$(( SECONDS - start ))
  if [ "$status" -eq 0 ]; then
    BATCH_TIMES+=("$(printf '  ✓ %-26s %4ss' "$title" "$took")")
    return
  fi

  BATCH_TIMES+=("$(printf '  ✗ %-26s %4ss' "$title" "$took")")
  _summary
  if [ "$status" -eq 4 ]; then
    printf '\n\033[31m✗ %s could not run: a prerequisite is missing.\033[0m\n' "$title"
    printf '  The reason and the fix are printed above (SKIPPED — …). Fix it and re-run;\n'
    printf '  a unit that cannot run does not count as a pass.\n'
  else
    printf '\n\033[31m✗ %s failed\033[0m (npm run %s)\n' "$title" "$script"
  fi
  exit 1
}

# Ends a batch that got through every unit.
passed() {
  _summary
  printf '\n\033[32m✓ %s\033[0m\n' "$1"
}
