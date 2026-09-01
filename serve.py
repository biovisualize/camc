#!/usr/bin/env python3
"""Static dev server for the viewer, with caching turned off.

``python -m http.server`` sends no ``Cache-Control``, so browsers fall back to *heuristic*
freshness and will happily reuse a cached ES module without revalidating. During development that
shows up as edits to ``src/*.js`` having no effect — or worse, a half-updated app where one module
is new and another is stale (e.g. "viewer.captureImage is not a function").

Usage:
    python serve.py [port]        # default 8777, then open http://localhost:<port>
"""

from __future__ import annotations

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:  # quieter: one line per request, no noise
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
    root = Path(__file__).parent
    handler = partial(NoCacheHandler, directory=str(root))
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Serving {root} at http://localhost:{port}  (no-store; Ctrl-C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
