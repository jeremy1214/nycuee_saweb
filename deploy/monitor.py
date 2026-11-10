#!/usr/bin/env python3
"""One monitor iteration; scheduled externally. State changes alone send an alert."""
import datetime
import json
import os
from pathlib import Path
import shutil
import urllib.request

state_dir = Path(os.environ['CMS_BACKUP_STATE_DIR'])
state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
os.chmod(state_dir, 0o700)
now = datetime.datetime.now(datetime.timezone.utc)
issues = []
origin = os.environ['CMS_HEALTH_ORIGIN']
if not origin.startswith('https://'):
    raise SystemExit('CMS_HEALTH_ORIGIN must use HTTPS.')
try:
    with urllib.request.urlopen(origin.rstrip('/') + '/api/v1/health', timeout=10) as response:
        if response.status != 200 or json.load(response) != {'status': 'ok'}:
            issues.append('service-unavailable')
except Exception:
    issues.append('service-unavailable')
try:
    latest = datetime.datetime.fromisoformat((state_dir / 'backup.success').read_text().strip().replace('Z', '+00:00'))
    age = (now - latest).total_seconds()
    if age < 0 or age > int(os.environ.get('CMS_BACKUP_MAX_AGE_SECONDS', '93600')):
        issues.append('backup-overdue')
except Exception:
    issues.append('backup-missing')
if (state_dir / 'backup.failed').exists():
    issues.append('backup-failed')
for label, path in [('media', os.environ['CMS_MEDIA_FILESYSTEM']), ('database', os.environ['CMS_DATABASE_FILESYSTEM'])]:
    try:
        disk = shutil.disk_usage(path)
        if disk.free < int(os.environ.get('CMS_MIN_FREE_BYTES', '2147483648')) or disk.free / disk.total < 0.1:
            issues.append(label + '-disk-low')
    except Exception:
        issues.append(label + '-disk-unreadable')
current = {'issues': sorted(issues)}
previous_path = state_dir / 'monitor-state.json'
try:
    previous = json.loads(previous_path.read_text())
except Exception:
    previous = None
if previous != current:
    event = {'service': 'nycuee-cms', 'at': now.isoformat(), 'state': 'failure' if issues else 'recovered', **current}
    # URL is kept in the service environment; exceptions and response bodies never enter logs.
    webhook = os.environ['CMS_ALERT_WEBHOOK']
    if not webhook.startswith('https://'):
        raise SystemExit('Alert webhook must use HTTPS.')
    request = urllib.request.Request(webhook, data=json.dumps(event).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if response.status >= 300:
                raise RuntimeError()
    except Exception:
        raise SystemExit('Alert delivery failed; state retained for retry.')
    temporary = state_dir / 'monitor-state.next'
    temporary.write_text(json.dumps(current))
    os.chmod(temporary, 0o600)
    temporary.replace(previous_path)
print('CMS monitor: ' + ('attention required' if issues else 'healthy'))
