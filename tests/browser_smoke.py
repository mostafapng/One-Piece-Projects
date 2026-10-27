"""Optional browser checks: requires Playwright and Chromium, separate from make test."""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect
root=str(Path(__file__).resolve().parents[1])
with socket.socket() as sock:
 sock.bind(('127.0.0.1', 0))
 port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}'
environment=os.environ.copy()
environment.pop('ONE_PIECE_API_KEY',None)
environment.pop('OPENAI_API_KEY',None)
environment['PORT']=str(port)
server=subprocess.Popen([root+'/build/one-piece'],cwd=root,env=environment,stdout=subprocess.DEVNULL)
try:
 for _ in range(80):
  try:
   urllib.request.urlopen(base+'/api/status',timeout=1).close()
   break
  except OSError: time.sleep(.05)
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True, executable_path=shutil.which('chromium') or p.chromium.executable_path, args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1280,'height':1000})
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(base)
  expect(page.locator('#chat-mode')).to_contain_text('Local fact helper')
  page.get_by_role('button',name='Read recap').click()
  expect(page.locator('#episode-result')).to_contain_text('beyond your watched limit')
  page.locator('#watched').fill('1')
  page.get_by_role('button',name='Set my limit').click()
  page.get_by_role('button',name='Read recap').click()
  expect(page.locator('#episode-result')).to_contain_text('Alvida')
  page.locator('#question').fill("What is Luffy's dream?")
  page.get_by_role('button',name='Send question').click()
  expect(page.locator('#messages')).to_contain_text('King of the Pirates')
  page.locator('#question').fill('What is the weather?')
  page.get_by_role('button',name='Send question').click()
  expect(page.locator('#messages')).to_contain_text("I'm built to help with One Piece")
  page.locator('#watched').fill('0')
  page.get_by_role('button',name='Set my limit').click()
  expect(page.locator('#messages')).not_to_contain_text('King of the Pirates')
  expect(page.locator('#episode-result')).not_to_contain_text('Alvida')
  page.set_viewport_size({'width':390,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile overflow'
  assert not errors, errors
  browser.close()
 print('Browser checks passed: recap guard, chat, off-topic refusal, relock, mobile layout, no JS errors.')
finally:
 server.terminate()
 server.wait(timeout=5)
