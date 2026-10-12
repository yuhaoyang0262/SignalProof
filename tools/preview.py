"""Serve the complete browser application with the Python standard library."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser


def main():
    parser = argparse.ArgumentParser(description="Preview SignalProof locally")
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    required = ["workbench.css", "studio.css", "katex/katex.min.js", "worker.js", "runtime/pyodide.js", "question-bank.js", "question-bank.css", "data/question-bank.json"]
    missing = [name for name in required if not (root / name).is_file()]
    if missing:
        parser.error("Incomplete project. Missing: " + ", ".join(missing))
    handler = partial(SimpleHTTPRequestHandler, directory=str(root))
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        url = "http://127.0.0.1:%s/" % server.server_port
        print("SignalProof: " + url, flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        if not args.no_open:
            timer = threading.Timer(0.3, webbrowser.open, args=(url,))
            timer.daemon = True
            timer.start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
