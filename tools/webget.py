#!/usr/bin/env python3
"""Fetch a URL as plain text.

Tries a plain HTTP request with browser headers first. Falls back to headless
Chrome when a site rejects the request or serves an empty shell that only a
JavaScript engine can fill in.
"""

import argparse
import gzip
import html.parser
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import zlib

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
}

SKIP_TAGS = {"script", "style", "noscript", "svg", "template", "head"}
BLOCK_TAGS = {
    "p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6",
    "section", "article", "header", "footer", "table", "ul", "ol", "dl",
}


class TextExtractor(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self.skip_depth += 1
        elif tag in BLOCK_TAGS:
            self.parts.append("\n")
        elif tag in ("td", "th"):
            self.parts.append(" | ")

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS and self.skip_depth:
            self.skip_depth -= 1
        elif tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip_depth:
            self.parts.append(data)

    def text(self):
        raw = "".join(self.parts)
        raw = re.sub(r"[ \t\r\f\v]+", " ", raw)
        raw = re.sub(r" *\n *", "\n", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        return raw.strip()


def decode(resp):
    body = resp.read()
    encoding = (resp.headers.get("Content-Encoding") or "").lower()
    if "gzip" in encoding:
        body = gzip.decompress(body)
    elif "deflate" in encoding:
        body = zlib.decompress(body, -zlib.MAX_WBITS)
    charset = resp.headers.get_content_charset() or "utf-8"
    return body.decode(charset, errors="replace")


def fetch_plain(url, timeout):
    """curl clears bot filters that reject urllib's TLS and header fingerprint."""
    cmd = ["curl", "-sS", "-L", "--compressed", "--max-time", str(timeout)]
    for key, value in HEADERS.items():
        if key == "User-Agent":
            cmd += ["-A", value]
        else:
            cmd += ["-H", f"{key}: {value}"]
    proc = subprocess.run(cmd + [url], capture_output=True, text=True, timeout=timeout + 10)
    if proc.returncode != 0:
        raise RuntimeError(f"curl exit {proc.returncode}: {proc.stderr[-300:]}")
    return proc.stdout


def find_chrome():
    for path in CHROME_CANDIDATES:
        if os.path.exists(path):
            return path
    return None


def fetch_rendered(url, timeout, wait_ms):
    chrome = find_chrome()
    if chrome is None:
        raise RuntimeError("no Chrome-family browser found")
    profile = tempfile.mkdtemp(prefix="webget-profile-")
    try:
        proc = subprocess.run(
            [
                chrome,
                "--headless=new",
                "--disable-gpu",
                "--no-first-run",
                "--no-default-browser-check",
                "--hide-scrollbars",
                "--window-size=1440,3000",
                f"--user-data-dir={profile}",
                f"--virtual-time-budget={wait_ms}",
                "--dump-dom",
                url,
            ],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if not proc.stdout.strip():
            raise RuntimeError(f"chrome returned no DOM: {proc.stderr[-400:]}")
        return proc.stdout
    finally:
        shutil.rmtree(profile, ignore_errors=True)


def to_text(raw):
    parser = TextExtractor()
    parser.feed(raw)
    return parser.text()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--render", action="store_true", help="go straight to Chrome")
    ap.add_argument("--raw", action="store_true", help="print HTML, not text")
    ap.add_argument("--timeout", type=int, default=60)
    ap.add_argument("--wait-ms", type=int, default=8000)
    ap.add_argument("--limit", type=int, default=0, help="truncate output to N chars")
    ap.add_argument("--grep", default="", help="print only lines matching this regex")
    args = ap.parse_args()

    raw = None
    if not args.render:
        try:
            raw = fetch_plain(args.url, args.timeout)
        except Exception as exc:  # fall through to the browser
            print(f"[webget] plain fetch failed ({exc}); rendering", file=sys.stderr)

    if raw is None or len(raw) < 2000:
        raw = fetch_rendered(args.url, args.timeout, args.wait_ms)

    out = raw if args.raw else to_text(raw)
    if args.grep:
        pattern = re.compile(args.grep, re.IGNORECASE)
        out = "\n".join(line for line in out.splitlines() if pattern.search(line))
    if args.limit:
        out = out[: args.limit]
    print(out)


if __name__ == "__main__":
    main()
