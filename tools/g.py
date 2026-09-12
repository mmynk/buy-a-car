#!/usr/bin/env python3
"""Grep a file with Python regex. Usage: g.py FILE PATTERN [CONTEXT_CHARS]"""
import re
import sys

path, pattern = sys.argv[1], sys.argv[2]
ctx = int(sys.argv[3]) if len(sys.argv) > 3 else 0
data = open(path, encoding="utf-8", errors="replace").read()
if ctx:
    for m in re.finditer(pattern, data, re.I):
        print(repr(data[max(0, m.start() - ctx):m.end() + ctx]))
        print("---")
else:
    for i, line in enumerate(data.splitlines(), 1):
        if re.search(pattern, line, re.I):
            print(i, line[:400])
