"""Splice a room's config.js into this skill's engine (starter.html) and write index.html next to it.

    python3 build.py <project-dir> [--artifact]

<project-dir>/config.js holds one `var CONFIG = {...};` block, copied from starter.html and edited.
Run it again after editing config.js or after the engine changes, so engine fixes carry over.
--artifact also writes artifact.html without doctype, html, head and body, for hosts whose publish
step supplies that skeleton itself (claude.ai Artifacts do)."""
import os, re, sys
if len(sys.argv) < 2: sys.exit(__doc__)
proj = os.path.abspath(sys.argv[1])
eng = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'starter.html')).read()
cfg = open(os.path.join(proj, 'config.js')).read().strip()
a = eng.index('var CONFIG = {')
b = eng.index('\n};\n', a) + 3
out = eng[:a] + cfg + eng[b:]
m = re.search(r"""\btitle:\s*(['"])((?:\\.|(?!\1).)*)\1""", cfg)   # either quote style, escapes allowed
if m:
    t = re.sub(r'\\(.)', r'\1', m.group(2)).replace('&', '&amp;').replace('<', '&lt;')
    out = re.sub(r'<title>.*?</title>', lambda _: '<title>' + t + '</title>', out, count=1)
open(os.path.join(proj, 'index.html'), 'w').write(out)
print('wrote', os.path.join(proj, 'index.html'), len(out))
if '--artifact' in sys.argv:
    art = re.sub(r'^.*?(?=<title>)', '', out, count=1, flags=re.S).replace('<body>\n', '', 1).replace('</body>', '').replace('</html>', '')
    open(os.path.join(proj, 'artifact.html'), 'w').write(art)
    print('wrote', os.path.join(proj, 'artifact.html'), len(art))
