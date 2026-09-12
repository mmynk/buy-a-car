#!/usr/bin/env python3
"""Search the web and print dated title / source / URL triples.

Backends, in order of preference:

  news  - Google News RSS. Honours the full query, returns publication dates,
          and is the only backend here that reliably surfaces recent articles.
  bing  - Bing RSS. Reachable, but it matches on the leading query term only,
          so treat it as a domain-discovery fallback, not a real search.

Every request goes through curl. Bot filters on these hosts reject urllib's TLS
and header fingerprint while accepting curl's.
"""

import argparse
import html
import re
import subprocess
import sys
import urllib.parse

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
)
TAG = re.compile(r"<[^>]+>")


def curl(url, timeout=30):
    proc = subprocess.run(
        ["curl", "-sS", "-L", "--compressed", "--max-time", str(timeout),
         "-A", UA, "-H", "Accept-Language: en-US,en;q=0.9", url],
        capture_output=True, text=True, timeout=timeout + 10,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"curl exit {proc.returncode}: {proc.stderr[-300:]}")
    return proc.stdout


def clean(fragment):
    return html.unescape(TAG.sub(" ", fragment or "")).replace("\xa0", " ").strip()


def field(item, name):
    m = re.search(rf"<{name}>(.*?)</{name}>", item, re.S)
    return clean(m.group(1)) if m else ""


def items(body):
    return re.findall(r"<item>(.*?)</item>", body, re.S)


def search_news(query, count, when):
    q = query if not when else f"{query} when:{when}"
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": q, "hl": "en-US", "gl": "US", "ceid": "US:en"}
    )
    out = []
    for item in items(curl(url))[:count]:
        title = field(item, "title")
        source = field(item, "source")
        # Google News appends " - Source" to titles; drop the duplicate.
        if source and title.endswith(f" - {source}"):
            title = title[: -len(source) - 3]
        out.append((title, source, field(item, "pubDate")[:16], field(item, "link")))
    return out


def search_bing(query, count):
    url = "https://www.bing.com/search?" + urllib.parse.urlencode(
        {"q": query, "format": "rss"}
    )
    out = []
    for item in items(curl(url))[:count]:
        out.append((field(item, "title"), "", "", field(item, "link")))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("query")
    ap.add_argument("-n", "--count", type=int, default=10)
    ap.add_argument("--engine", choices=["news", "bing"], default="news")
    ap.add_argument("--when", default="", help="Google News recency, e.g. 30d, 6m, 1y")
    args = ap.parse_args()

    if args.engine == "news":
        results = search_news(args.query, args.count, args.when)
    else:
        results = search_bing(args.query, args.count)

    if not results:
        print("no results")
        return 1
    for i, (title, source, date, url) in enumerate(results, 1):
        meta = " | ".join(x for x in (source, date) if x)
        print(f"{i}. {title}")
        if meta:
            print(f"   {meta}")
        print(f"   {url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
