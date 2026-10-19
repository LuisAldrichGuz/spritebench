#!/usr/bin/env python3
"""Tiny static server for local development (no cache). Usage: python serve.py [port]"""
import http.server, sys

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print("Spritebench on http://localhost:%d" % port)
http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
