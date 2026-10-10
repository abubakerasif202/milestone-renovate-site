"""Simple local preview with clean URLs like Vercel."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os

root=Path(__file__).parent
os.chdir(root)
class CleanURLHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path=self.path.split('?',1)[0]
        if path != '/' and not Path('.'+path).suffix and not Path('.'+path).is_dir() and (root/(path.lstrip('/')+'.html')).is_file():
            self.path=path+'.html'
        super().do_GET()
if __name__=='__main__':
    print('Milestone Renovate preview: http://localhost:8765')
    ThreadingHTTPServer(('127.0.0.1',8765), CleanURLHandler).serve_forever()
