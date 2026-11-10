#!/usr/bin/env bash
# Explicit operator entry point. Does not run until invoked on the target host.
set -Eeuo pipefail
umask 077
cd "$(dirname "${BASH_SOURCE[0]}")/.."
snapshot=${1:-}
[[ "$snapshot" == /* ]] || { echo 'Usage: bash deploy/content-cutover.sh /absolute/new-backup-directory' >&2; exit 2; }
compose=(docker compose --env-file .env -f compose.yaml -f compose.production.yaml)
# Reuse the existing paired snapshot and saved application image rollback.
bash deploy/organization-cutover.sh backup "$snapshot"
completed=false
on_exit() {
  status=$?
  trap - EXIT
  if [[ "$completed" != true ]]; then
    echo 'Cutover stopped; restoring saved application images/settings. Database additions remain.' >&2
    bash deploy/organization-cutover.sh rollback "$snapshot" || echo 'Application rollback needs operator attention.' >&2
  fi
  exit "$status"
}
trap on_exit EXIT
"${compose[@]}" build backend
"${compose[@]}" stop backend
"${compose[@]}" run --rm --no-deps --entrypoint npm backend run db:migrate
for importer in content:import organization:import site:import; do
  name=${importer/:/-}
  "${compose[@]}" run --rm --no-deps --entrypoint npm backend run "$importer" -- --dry-run > "$snapshot/$name-dry-run.json"
  "${compose[@]}" run --rm --no-deps --entrypoint npm backend run "$importer" > "$snapshot/$name.json"
done
# A rerun after editorial changes must stop on importer conflicts, never force overwrite.
awk '!/^VITE_(ACTIVITY|EESA|TEAM|SITE_CONTENT)_SOURCE=/ { print } END { print "VITE_ACTIVITY_SOURCE=api"; print "VITE_EESA_SOURCE=api"; print "VITE_TEAM_SOURCE=api"; print "VITE_SITE_CONTENT_SOURCE=api" }' .env > .env.content-next
mv .env.content-next .env
"${compose[@]}" build web
"${compose[@]}" up -d --wait --wait-timeout 180 --no-build backend web
completed=true
echo 'All public content sources switched to API. Complete the separate acceptance record before declaring production ready.'
