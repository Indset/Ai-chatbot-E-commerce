#!/usr/bin/env python3
"""Simple HTTP server to serve frontend files."""
import http.server
import socketserver
from pathlib import Path

PORT = 8000
FRONTEND_DIR = Path(__file__).resolve().parent

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND_DIR), **kwargs)

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🚀 Frontend server running on http://localhost:{PORT}")
        print(f"📂 Serving files from: {FRONTEND_DIR}")
        print("Press CTRL+C to quit")
        httpd.serve_forever()
