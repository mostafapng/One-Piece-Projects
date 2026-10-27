"""Optional real-browser regression tests. Requires Playwright and Chromium."""
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'
environment = os.environ.copy()
for key in ['ONE_PIECE_API_KEY', 'OPENAI_API_KEY']:
    environment.pop(key, None)
environment['PORT'] = str(port)
environment['HTTPS_PROXY'] = 'http://127.0.0.1:1'
environment['https_proxy'] = 'http://127.0.0.1:1'
server = subprocess.Popen([os.environ.get('NODE_BINARY', 'node'), str(ROOT / 'scripts/dev-server.js')], cwd=ROOT, env=environment, stdout=subprocess.DEVNULL)
try:
    for _ in range(100):
        if server.poll() is not None:
            raise RuntimeError('Server exited before becoming ready')
        try:
            urllib.request.urlopen(base + '/api/status', timeout=1).close()
            break
        except OSError:
            time.sleep(.05)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=shutil.which('chromium') or p.chromium.executable_path, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1050})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' and 'Content Security Policy' in msg.text else None)
        page.goto(base)
        expect(page.locator('#chat-mode')).to_contain_text('Local fact helper')
        expect(page.locator('#ai-settings')).to_be_hidden()
        page.evaluate('document.fonts.ready')
        assert page.evaluate('document.fonts.check(\'24px "Pirata"\')'), 'Pirate font not loaded'
        page.get_by_role('button', name='Read recap').click()
        expect(page.locator('#episode-result')).to_contain_text('beyond your watched limit')
        page.locator('#watched').fill('1')
        page.get_by_role('button', name='Set my limit').click()
        page.get_by_role('button', name='Read recap').click()
        expect(page.locator('#episode-result')).to_contain_text('Alvida')
        expect(page.locator('#next')).to_be_disabled()
        page.locator('#question').fill("What is Luffy's dream?")
        page.get_by_role('button', name='Send question', exact=True).click()
        expect(page.locator('#messages')).to_contain_text('King of the Pirates')
        page.locator('#question').fill('What is the weather?')
        page.get_by_role('button', name='Send question', exact=True).click()
        expect(page.locator('#messages')).to_contain_text("I'm built to help with One Piece")
        page.locator('#watched').fill('1156')
        page.get_by_role('button', name='Set my limit').click()
        expect(page.locator('#messages')).not_to_contain_text('King of the Pirates')
        page.locator('#episode').fill('1156')
        page.get_by_role('button', name='Read recap').click()
        expect(page.locator('#episode-result')).to_contain_text('Egghead')
        expect(page.locator('#next')).to_be_disabled()
        page.locator('#episode').fill('1015')
        page.get_by_role('button', name='Read recap').click()
        expect(page.locator('#episode-result')).to_contain_text('Yamato')
        expect(page.locator('#episode-result')).to_contain_text('Kaido')
        page.get_by_role('button', name='The Movie Den').click()
        expect(page.locator('#movie-panel')).to_be_visible()
        expect(page.locator('#episode-panel')).to_be_hidden()
        expect(page.locator('#movie option')).to_have_count(16)
        page.locator('#movie').select_option('10')
        page.get_by_role('button', name='Open the movie log').click()
        expect(page.locator('#movie-result')).to_contain_text('Confirm you have finished')
        page.locator('#movie-watched').check()
        page.get_by_role('button', name='Open the movie log').click()
        expect(page.locator('#movie-result')).to_contain_text('Shiki')
        page.locator('#movie-question').fill('Give me a detailed summary')
        page.get_by_role('button', name='Send movie question').click()
        expect(page.locator('#movie-messages')).to_contain_text('Shiki')
        expect(page.locator('#messages')).not_to_contain_text('Shiki')
        page.locator('#movie').select_option('15')
        expect(page.locator('#movie-messages')).not_to_contain_text('Shiki')
        expect(page.locator('#movie-watched')).not_to_be_checked()
        expect(page.locator('#movie-result')).not_to_contain_text('Shiki')
        page.locator('#movie-watched').check()
        page.get_by_role('button', name='Open the movie log').click()
        expect(page.locator('#movie-result')).to_contain_text('Uta')
        page.locator('#watched').fill('0')
        page.get_by_role('button', name='Set my limit').click()
        expect(page.locator('#movie-result')).not_to_contain_text('Uta')
        expect(page.locator('#movie-watched')).not_to_be_checked()
        page.locator('#movie-watched').check()
        page.get_by_role('button', name='Open the movie log').click()
        expect(page.locator('#movie-result')).to_contain_text('locked at your anime limit')
        # A late reply must never restore content after the limit is lowered.
        page.get_by_role('button', name='The Episode Log').click()
        page.locator('#watched').fill('100')
        page.get_by_role('button', name='Set my limit').click()
        def delayed(route):
            page.locator('#watched').fill('0')
            page.get_by_role('button', name='Set my limit').click()
            route.fulfill(status=200, content_type='application/json', body=json.dumps({'number': 100, 'summary': 'STALE_SECRET', 'images': []}))
        page.route('**/api/episode', delayed)
        page.locator('#episode').fill('100')
        page.get_by_role('button', name='Read recap').click()
        expect(page.locator('#limit-status')).to_contain_text('No episodes unlocked')
        expect(page.locator('#episode-result')).not_to_contain_text('STALE_SECRET')
        page.unroute('**/api/episode', delayed)
        screenshots = os.environ.get('ONE_PIECE_SCREENSHOTS')
        if screenshots:
            Path(screenshots).mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(Path(screenshots) / 'desktop.png'), full_page=True)
        for width in [390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 950})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Overflow at {width}px'
        page.set_viewport_size({'width': 390, 'height': 844})
        if screenshots:
            page.screenshot(path=str(Path(screenshots) / 'mobile.png'), full_page=True)
        # The owner access code is sent in a request header, never stored in browser storage.
        page.route('**/api/status', lambda route: route.fulfill(status=200, content_type='application/json', body=json.dumps({'ai_configured': True})))
        page.reload()
        expect(page.locator('#ai-settings')).to_be_visible()
        page.locator('#ai-settings summary').click()
        page.locator('#ai-access-code').fill('test-private-code-123456')
        page.locator('#watched').fill('1')
        page.get_by_role('button', name='Set my limit').click()
        page.locator('#episode').fill('1')
        page.get_by_role('button', name='Read recap').click()
        expect(page.locator('#episode-result')).to_contain_text('Alvida')
        sent_headers = []
        def capture_chat(route):
            sent_headers.append(route.request.headers)
            route.fulfill(status=200, content_type='application/json', body=json.dumps({'answer': 'Selected episode notes', 'sources': [], 'mode': 'local'}))
        page.route('**/api/chat', capture_chat)
        page.locator('#question').fill('Luffy')
        page.get_by_role('button', name='Send question', exact=True).click()
        expect(page.locator('#messages')).to_contain_text('Selected episode notes')
        assert sent_headers[0]['x-companion-access-code'] == 'test-private-code-123456'
        assert page.evaluate('localStorage.length') == 0
        assert page.evaluate('sessionStorage.length') == 0
        assert not errors, errors
        browser.close()
    print('Browser checks passed: fonts, offline episodes 1015/1156, spoiler gates, independent movie chat, relocking, stale replies, 3 viewport widths, no JS errors.')
finally:
    server.terminate()
    server.wait(timeout=5)
