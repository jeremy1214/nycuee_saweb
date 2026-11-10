#!/usr/bin/env bash
# Requires an initialized, encrypted remote restic repository. Never prints credentials.
set -Eeuo pipefail
umask 077
cd "$(dirname "${BASH_SOURCE[0]}")/.."
: "${RESTIC_REPOSITORY:?Set an off-host restic repository}"
: "${RESTIC_PASSWORD_FILE:?Set the separate restic password file}"
: "${CMS_BACKUP_STATE_DIR:?Set a persistent private state directory}"
case "$RESTIC_REPOSITORY" in sftp:*|s3:*|b2:*|azure:*|gs:*|rclone:*|rest:https://*) ;; *) echo 'An off-host encrypted repository is required.' >&2; exit 2;; esac
command -v restic >/dev/null
mkdir -p "$CMS_BACKUP_STATE_DIR"
exec 9>"$CMS_BACKUP_STATE_DIR/backup.lock"
flock -n 9 || exit 0
compose=(docker compose --env-file "${CMS_ENV_FILE:-.env}" -f compose.yaml -f compose.production.yaml)
if [[ -n "${CMS_BACKUP_PROJECT:-}" ]]; then compose+=(--project-name "$CMS_BACKUP_PROJECT"); fi
if [[ -n "${CMS_COMPOSE_OVERRIDE:-}" ]]; then
  [[ "$CMS_COMPOSE_OVERRIDE" == /* && -f "$CMS_COMPOSE_OVERRIDE" ]] || { echo 'CMS_COMPOSE_OVERRIDE must be an existing absolute file.' >&2; exit 2; }
  compose+=(-f "$CMS_COMPOSE_OVERRIDE")
fi
stage=$(mktemp -d "${CMS_BACKUP_STAGING_DIR:-/tmp}/nycuee-backup.XXXXXXXX")
stopped=false
finish() {
  result=$?
  trap - EXIT
  if [[ "$stopped" == true ]]; then
    if ! "${compose[@]}" start backend >/dev/null; then result=1; fi
  fi
  rm -rf -- "$stage"
  if [[ "$result" != 0 ]]; then
    date -u +%FT%TZ > "$CMS_BACKUP_STATE_DIR/backup.failed"
    echo 'CMS backup failed; inspect private service logs.' >&2
  fi
  exit "$result"
}
trap finish EXIT
[[ -n "$("${compose[@]}" ps -q backend)" ]] || { echo 'Backend must be running before snapshot.' >&2; exit 1; }
# Freeze all application writes while capturing the matching database and media pair.
stopped=true
"${compose[@]}" stop backend >/dev/null
"${compose[@]}" exec -T db pg_dump -U nycuee -d nycuee -Fc > "$stage/database.dump"
"${compose[@]}" run --rm --no-deps --user root --entrypoint sh backend -c 'tar -czf - -C /var/lib/nycuee/media .' > "$stage/media.tgz"
cp "${CMS_ENV_FILE:-.env}" "$stage/environment"
cp compose.yaml compose.production.yaml "$stage/"
git rev-parse HEAD > "$stage/source-revision"
"${compose[@]}" images -q > "$stage/image-ids"
date -u +%FT%TZ > "$stage/captured-at"
"${compose[@]}" start backend >/dev/null
stopped=false
[[ -s "$stage/database.dump" && -s "$stage/media.tgz" ]]
(cd "$stage" && sha256sum database.dump media.tgz > SHA256SUMS)
# Use a stable path within restic snapshots, with a dedicated host/tag retention domain.
restic backup --host "${CMS_BACKUP_HOST:-nycuee-production}" --tag nycuee-cms "$stage" >/dev/null
restic forget --host "${CMS_BACKUP_HOST:-nycuee-production}" --tag nycuee-cms --group-by host,tags --keep-within 30d --prune >/dev/null
date -u +%FT%TZ > "$CMS_BACKUP_STATE_DIR/backup.success.next"
mv "$CMS_BACKUP_STATE_DIR/backup.success.next" "$CMS_BACKUP_STATE_DIR/backup.success"
rm -f "$CMS_BACKUP_STATE_DIR/backup.failed"
echo 'Encrypted remote CMS backup completed.'
