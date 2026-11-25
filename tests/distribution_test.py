import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class DistributionTests(unittest.TestCase):
    def test_manifest_and_feed(self):
        manifest = json.loads((ROOT / 'extension/manifest.json').read_text())
        version = (ROOT / 'VERSION').read_text().strip()
        extension_id = (ROOT / 'EXTENSION_ID').read_text().strip()
        self.assertEqual(manifest['version'], version)
        self.assertEqual(manifest['manifest_version'], 3)
        self.assertEqual(manifest['update_url'], 'https://github.com/sgueko/ProxySlack/releases/latest/download/update.xml')
        root = ET.parse(ROOT / 'update.xml').getroot()
        ns = {'g': 'http://www.google.com/update2/response'}
        app = root.find('g:app', ns)
        self.assertEqual(app.attrib['appid'], extension_id)
        check = app.find('g:updatecheck', ns)
        self.assertEqual(check.attrib['version'], version)
        self.assertEqual(check.attrib['codebase'], f'https://github.com/sgueko/ProxySlack/releases/download/v{version}/ProxySlack-{version}.crx')

    def test_installer_dry_run(self):
        p = subprocess.run([str(ROOT / 'install.sh'), '--browser', 'chromium', '--local', '--dry-run'], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn('Would install', p.stdout)

    def test_local_install_and_uninstall_in_isolated_root(self):
        crx = ROOT / 'dist' / f"ProxySlack-{(ROOT / 'VERSION').read_text().strip()}.crx"
        if not crx.exists():
            self.skipTest('CRX is not available in source-only checkout')
        with tempfile.TemporaryDirectory(prefix='proxyslack-test-', dir='/tmp') as temp:
            p = subprocess.run([str(ROOT / 'install.sh'), '--browser', 'chromium', '--local', '--test-root', temp], capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            meta = Path(temp) / 'usr/share/chromium/extensions' / f"{(ROOT / 'EXTENSION_ID').read_text().strip()}.json"
            self.assertTrue(meta.exists())
            target = Path(json.loads(meta.read_text())['external_crx'])
            self.assertTrue(target.exists())
            p = subprocess.run([str(ROOT / 'uninstall.sh'), '--browser', 'chromium', '--test-root', temp], capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertFalse(meta.exists())
            self.assertFalse(target.exists())

    def test_signed_artifact_when_present(self):
        crx = ROOT / 'dist' / f"ProxySlack-{(ROOT / 'VERSION').read_text().strip()}.crx"
        if not crx.exists():
            self.skipTest('CRX is not available in source-only checkout')
        p = subprocess.run(['python3', str(ROOT / 'scripts/crx3.py'), 'verify', '--crx', str(crx)], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertEqual(p.stdout.strip(), (ROOT / 'EXTENSION_ID').read_text().strip())


if __name__ == '__main__':
    unittest.main()
