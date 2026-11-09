#!/usr/bin/env bash
# Run on the target host from its existing checkout. No tests or browser checks.
set -Eeuo pipefail
umask 077
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"
mode=${1:-}
snapshot=${2:-}
if [[ "$mode" != backup && "$mode" != switch && "$mode" != rollback ]] || [[ "$snapshot" != /* ]]; then
  echo 'Usage: bash deploy/organization-cutover.sh backup|switch|rollback /absolute/backup-directory' >&2
  exit 2
fi
compose_file=compose.yaml
if [[ ! -f "$compose_file" ]]; then compose_file=docker-compose.yml; fi
compose=(docker compose -f "$compose_file")
# Preserve the production overlay across backup, switch and automatic rollback.
existing_backend=$("${compose[@]}" ps -aq backend)
if [[ -n "$existing_backend" ]]; then
  config_files=$(docker inspect --format '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' "$existing_backend")
  if [[ "$config_files" == *compose.production.yaml* ]]; then
    compose+=(-f compose.production.yaml)
  fi
fi
rollback() {
  [[ -s "$snapshot/compose.rollback.yaml" && -s "$snapshot/environment" ]] || { echo 'Missing rollback metadata.' >&2; return 1; }
  cp "$snapshot/environment" .env
  "${compose[@]}" -f "$snapshot/compose.rollback.yaml" up -d --no-build backend web
}
if [[ "$mode" == rollback ]]; then rollback; exit; fi
[[ -f .env ]] || { echo 'Existing .env is required.' >&2; exit 1; }
mkdir -p "$snapshot"
[[ -z "$(find "$snapshot" -mindepth 1 -maxdepth 1 -print -quit)" ]] || { echo 'Use a new empty backup directory.' >&2; exit 1; }
cp .env "$snapshot/environment"
stamp=$(date -u +%Y%m%d%H%M%S)
backend_container=$("${compose[@]}" ps -q backend)
web_container=$("${compose[@]}" ps -q web)
[[ -n "$backend_container" && -n "$web_container" ]] || { echo 'The existing backend and web containers must be present.' >&2; exit 1; }
old_backend=$(docker inspect --format '{{.Image}}' "$backend_container")
old_web=$(docker inspect --format '{{.Image}}' "$web_container")
docker image tag "$old_backend" "nycuee-org-rollback-backend:$stamp"
docker image tag "$old_web" "nycuee-org-rollback-web:$stamp"
cat > "$snapshot/compose.rollback.yaml" <<YAML
services:
  backend:
    image: nycuee-org-rollback-backend:$stamp
  web:
    image: nycuee-org-rollback-web:$stamp
YAML
stopped=false
finished=false
on_exit() {
  status=$?
  if [[ "$stopped" == true && "$finished" == false ]]; then
    echo 'Cutover interrupted; restoring the saved application images and settings.' >&2
    rollback || echo 'Automatic application rollback failed; use the saved rollback command.' >&2
  fi
  exit "$status"
}
trap on_exit EXIT
if [[ "$mode" == switch ]]; then
  "${compose[@]}" build backend
  "${compose[@]}" run --rm --no-deps --entrypoint npm backend run organization:import -- --inventory > "$snapshot/inventory.json"
fi
"${compose[@]}" stop backend
stopped=true
"${compose[@]}" exec -T db pg_dump -U nycuee -d nycuee -Fc > "$snapshot/database.dump"
"${compose[@]}" run --rm --no-deps --user root --entrypoint sh backend -c 'tar -czf - -C /var/lib/nycuee/media .' > "$snapshot/media.tgz"
[[ -s "$snapshot/database.dump" && -s "$snapshot/media.tgz" ]] || { echo 'Backup files are empty.' >&2; exit 1; }
sha256sum "$snapshot/database.dump" "$snapshot/media.tgz" > "$snapshot/SHA256SUMS"
if [[ "$mode" == backup ]]; then
  "${compose[@]}" -f "$snapshot/compose.rollback.yaml" up -d --no-build backend web
  finished=true
  echo "Backup saved: $snapshot"
  exit
fi
"${compose[@]}" run --rm --no-deps --entrypoint npm backend run db:migrate
"${compose[@]}" run --rm --no-deps --entrypoint npm backend run organization:import -- --dry-run > "$snapshot/import-dry-run.json"
"${compose[@]}" run --rm --no-deps --entrypoint npm backend run organization:import > "$snapshot/import.json"
"${compose[@]}" run --rm --no-deps --entrypoint npm backend run organization:import -- --compare > "$snapshot/database-comparison.json"
# Update only the two source flags; keep the other environment values intact.
awk '!/^VITE_EESA_SOURCE=/ && !/^VITE_TEAM_SOURCE=/ { print } END { print "VITE_EESA_SOURCE=api"; print "VITE_TEAM_SOURCE=api" }' .env > .env.organization-next
mv .env.organization-next .env
"${compose[@]}" build web
"${compose[@]}" up -d --wait --wait-timeout 180 --no-build backend web
"${compose[@]}" run --rm --no-deps -e ORGANIZATION_PUBLIC_ORIGIN="${ORGANIZATION_PUBLIC_ORIGIN:-}" --entrypoint npm backend run organization:import -- --compare-public > "$snapshot/public-comparison.json"
finished=true
echo "Organization CMS sources switched to API. Backup and comparison reports: $snapshot"
