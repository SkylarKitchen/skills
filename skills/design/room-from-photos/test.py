"""Run the engine's geometry audit headlessly: each piece's 3D parts must sit where the plan and the fit checks think they are.

    python3 test.py [project-dir ...]     (default: every fixture in tests/, and the starter's sample room)

A project dir holds a config.js, as for build.py; it is built into a temp folder, so nothing is written beside it.
Needs Google Chrome (or CHROME=<path>) and the network, since three.js loads from a CDN. Exits 1 on any finding."""
import glob, html, json, os, re, shutil, subprocess, sys, tempfile, time
here = os.path.dirname(os.path.abspath(__file__))
chrome = os.environ.get('CHROME') or next((p for p in ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          shutil.which('google-chrome') or '', shutil.which('chromium') or ''] if p and os.path.exists(p)), None)
if not chrome: sys.exit('No Chrome found: set CHROME=<path to a Chrome or Chromium binary>')
dirs = sys.argv[1:]
if not dirs:   # the fixtures in tests/, plus the starter's own sample room
    dirs = sorted(glob.glob(os.path.join(here, 'tests', '*', '')))
    eng = open(os.path.join(here, 'starter.html')).read(); a = eng.index('var CONFIG = {')
    sample = os.path.join(tempfile.mkdtemp(prefix='room-test-'), 'starter-sample'); os.makedirs(sample)
    open(os.path.join(sample, 'config.js'), 'w').write(eng[a:eng.index('\n};\n', a) + 3])
    dirs.append(sample)
bad = 0
for d in dirs:
    tmp = tempfile.mkdtemp(prefix='room-test-')
    shutil.copy(os.path.join(d, 'config.js'), tmp)
    subprocess.run([sys.executable, os.path.join(here, 'build.py'), tmp], check=True, stdout=subprocess.DEVNULL)
    prof = os.path.join(tmp, 'chrome')
    out = os.path.join(tmp, 'dom.html')   # a file, not a pipe: Chrome's helper processes can hold a pipe open long after the dump
    with open(out, 'w') as f:
        pr = subprocess.Popen([chrome, '--headless=new', '--user-data-dir=' + prof, '--disable-gpu', '--use-angle=swiftshader',
                               '--enable-unsafe-swiftshader', '--disable-extensions', '--window-size=1200,800', '--virtual-time-budget=8000',
                               '--dump-dom', 'file://' + os.path.join(tmp, 'index.html') + '#debug&test'], stdout=f, stderr=subprocess.DEVNULL)
        for _ in range(180):   # headless Chrome can linger after the dump, so stop it once the page is written (90 s at most)
            if pr.poll() is not None or '</html>' in open(out).read(): break
            time.sleep(0.5)
        pr.kill()
    subprocess.run(['pkill', '-f', 'user-data-dir=' + prof], capture_output=True)
    dom = open(out).read()
    m = re.search(r'<pre id="audit">(\[.*?\])</pre>', dom, re.S)
    name = os.path.basename(os.path.normpath(d))
    if not m:
        print('FAIL', name, '- no audit in the page (a script error, or the CDN was unreachable)'); bad += 1; continue
    found = json.loads(html.unescape(m.group(1)))
    print('ok  ' if not found else 'FAIL', name, '' if not found else '')
    for f in found: print('     option %d: %s' % (f['layout'], f['text']))
    bad += bool(found)
    shutil.rmtree(tmp, ignore_errors=True)
sys.exit(1 if bad else 0)
