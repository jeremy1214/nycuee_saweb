#!/usr/bin/env bash
# Restore an already decrypted, privately staged database/media pair. Leaves API stopped.
set -Eeuo pipefail
umask 077
cd "$(dirname "${BASH_SOURCE[0]}")/.."
snapshot=${1:-}
[[ "$snapshot" == /* && -d "$snapshot" ]] || { echo 'Usage: bash deploy/restore.sh /absolute/decrypted-snapshot' >&2; exit 2; }
: "${CMS_RESTORE_PROJECT:?Use a separate Compose project for rehearsal}"
[[ "${CMS_RESTORE_CONFIRM:-}" == "replace:$CMS_RESTORE_PROJECT" ]] || { echo 'Set CMS_RESTORE_CONFIRM to replace:<target-project> after taking a target backup.' >&2; exit 2; }
[[ -f "$snapshot/database.dump" && -f "$snapshot/media.tgz" && -f "$snapshot/SHA256SUMS" ]]
(cd "$snapshot" && sha256sum -c SHA256SUMS >/dev/null)
compose=(docker compose --project-name "$CMS_RESTORE_PROJECT" --env-file "${CMS_ENV_FILE:-.env}" -f compose.yaml -f compose.production.yaml)
"${compose[@]}" stop backend web
# The target database must already exist. Do not start backend: startup would migrate/import.
"${compose[@]}" exec -T db pg_restore -U nycuee -d nycuee --clean --if-exists --no-owner --no-privileges --single-transaction < "$snapshot/database.dump"
"${compose[@]}" run --rm --no-deps --user root --entrypoint sh backend -c '
  set -eu
  cd /var/lib/nycuee/media
  find . -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
  tar -xzf -
  chown -R node:node .
' < "$snapshot/media.tgz"
echo 'Database and media restored; backend/web remain stopped. Follow the restore runbook before resuming.'
