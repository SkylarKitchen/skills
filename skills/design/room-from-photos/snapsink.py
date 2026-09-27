# Local sink for GPU captures: the page's #debug ROOM.snap() and ROOM.snapPhoto() POST /<name>.png here.
# Run it in its own terminal: python3 snapsink.py <out-dir>   (listens on 127.0.0.1:8794, writes <out-dir>/<name>.png)
import http.server, os, sys
D = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'snaps'); os.makedirs(D, exist_ok=True)
class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS'); self.send_header('Access-Control-Allow-Headers', '*')
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        n = os.path.basename(self.path.strip('/')) or 'snap.png'; body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        open(os.path.join(D, n), 'wb').write(body); self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', 8794), H).serve_forever()
