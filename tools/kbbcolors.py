#!/usr/bin/env python3
"""Pull the Exterior Colors option block out of a KBB options-page HTML dump."""
import json
import re
import sys

data = open(sys.argv[1], encoding="utf-8", errors="replace").read()
for m in re.finditer(r'\{"optionSectionName":"Exterior Colors".*?"options":\[', data):
    start = m.end() - 1
    depth = 0
    for i in range(start, len(data)):
        if data[i] == "[":
            depth += 1
        elif data[i] == "]":
            depth -= 1
            if depth == 0:
                blob = data[start:i + 1]
                break
    try:
        opts = json.loads(blob)
    except Exception as exc:
        print("PARSE FAIL", exc)
        continue
    for o in opts:
        print("  %-6s msrp=%-6s invoice=%-6s %s | %s | %s" % (
            o.get("oemCode"), o.get("msrp"), o.get("invoice"),
            o.get("optionName"), o.get("secondaryName") or o.get("detailName") or "",
            o.get("availability")))
    print("  ---- %d colors" % len(opts))
