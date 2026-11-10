"""Exercise the real monitor against a local HTTPS health/webhook server.

Run: python3 -m unittest discover -s deploy/tests -v
Only temporary files, loopback sockets and synthetic alert data are used.
"""
import datetime
import json
import os
from pathlib import Path
import ssl
import shutil
import subprocess
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


MONITOR = Path(__file__).resolve().parents[1] / 'monitor.py'


class MonitorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix='nycuee-monitor-')
        cls.root = Path(cls.temporary.name)
        cls.cert = cls.root / 'cert.pem'
        key = cls.root / 'key.pem'
        subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
                        '-keyout', str(key), '-out', str(cls.cert), '-subj', '/CN=localhost',
                        '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'],
                       check=True, capture_output=True)
        cls.events = []
        cls.health = {'status': 'ok'}
        cls.reject_delivery = False

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_args):
                pass

            def do_GET(self):
                self.send_response(200)
                self.end_headers()
                self.wfile.write(json.dumps(cls.health).encode())

            def do_POST(self):
                event = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                if cls.reject_delivery:
                    self.send_response(503)
                else:
                    cls.events.append(event)
                    self.send_response(204)
                self.end_headers()

        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cls.cert, key)
        cls.server.socket = context.wrap_socket(cls.server.socket, server_side=True)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.temporary.cleanup()

    def setUp(self):
        self.state = Path(tempfile.mkdtemp(dir=self.root))
        type(self).events.clear()
        type(self).health = {'status': 'ok'}
        type(self).reject_delivery = False
        self.write_backup_time(datetime.datetime.now(datetime.timezone.utc))
        origin = f'https://localhost:{self.server.server_port}'
        # Use a real filesystem with space; the developer checkout may be nearly full.
        filesystem = max([str(self.root), '/dev/shm'], key=lambda path: shutil.disk_usage(path).free / shutil.disk_usage(path).total)
        self.env = dict(os.environ, CMS_BACKUP_STATE_DIR=str(self.state), CMS_HEALTH_ORIGIN=origin,
                        CMS_ALERT_WEBHOOK=origin + '/alert', CMS_MEDIA_FILESYSTEM=filesystem,
                        CMS_DATABASE_FILESYSTEM=filesystem, CMS_MIN_FREE_BYTES='1',
                        SSL_CERT_FILE=str(self.cert))

    def write_backup_time(self, value):
        (self.state / 'backup.success').write_text(value.isoformat())

    def run_monitor(self, success=True):
        result = subprocess.run(['python3', str(MONITOR)], env=self.env, capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode == 0, success, result.stderr)
        return result

    def test_state_changes_notify_once_and_recovery_notifies(self):
        self.run_monitor()
        self.run_monitor()
        self.assertEqual(len(self.events), 1)
        type(self).health = {'status': 'unavailable'}
        self.run_monitor()
        self.run_monitor()
        self.assertEqual(len(self.events), 2)
        self.assertEqual(self.events[-1]['issues'], ['service-unavailable'])
        type(self).health = {'status': 'ok'}
        self.run_monitor()
        self.assertEqual(self.events[-1]['state'], 'recovered')
        self.assertEqual(self.events[-1]['issues'], [])

    def test_overdue_failed_backup_and_disk_reserve_are_reported(self):
        self.write_backup_time(datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=2))
        (self.state / 'backup.failed').write_text('synthetic failure')
        self.env['CMS_MIN_FREE_BYTES'] = str(2 ** 63)
        self.run_monitor()
        self.assertEqual(self.events[-1]['issues'],
                         ['backup-failed', 'backup-overdue', 'database-disk-low', 'media-disk-low'])

    def test_missing_backup_and_unreadable_mount_are_reported(self):
        (self.state / 'backup.success').unlink()
        self.env['CMS_MEDIA_FILESYSTEM'] = str(self.root / 'missing-mount')
        self.run_monitor()
        self.assertEqual(self.events[-1]['issues'], ['backup-missing', 'media-disk-unreadable'])

    def test_failed_delivery_preserves_state_for_retry(self):
        self.run_monitor()
        previous = (self.state / 'monitor-state.json').read_bytes()
        type(self).health = {'status': 'unavailable'}
        type(self).reject_delivery = True
        result = self.run_monitor(success=False)
        self.assertIn('state retained for retry', result.stderr)
        self.assertEqual((self.state / 'monitor-state.json').read_bytes(), previous)
        type(self).reject_delivery = False
        self.run_monitor()
        self.assertEqual(self.events[-1]['issues'], ['service-unavailable'])

    def test_http_destinations_are_rejected(self):
        self.env['CMS_HEALTH_ORIGIN'] = 'http://localhost'
        self.run_monitor(success=False)
        self.assertEqual(self.events, [])


if __name__ == '__main__':
    unittest.main()
