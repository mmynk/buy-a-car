#!/usr/bin/env python3
"""Extract Toyota color-selector swatches from a raw toyota.com HTML dump."""
import html
import re
import sys
from collections import OrderedDict

data = open(sys.argv[1], encoding="utf-8", errors="replace").read()
rows = []
for m in re.finditer(r'<button class="color-selector__swatch"(.*?)>', data, re.S):
    attrs = m.group(1)

    def get(name):
        mm = re.search(name + r'="([^"]*)"', attrs)
        return html.unescape(mm.group(1)) if mm else ""

    rows.append((get("data-model-grade"), get("data-color-code"), get("data-color-name"),
                 get("data-model-year"), get("data-model-code")))

by_grade = OrderedDict()
for grade, code, name, year, model in rows:
    by_grade.setdefault((model, year, grade), OrderedDict())[(code, name)] = True

for key, colors in by_grade.items():
    print("=== %s %s %s  (%d colors)" % (key[0], key[1], key[2], len(colors)))
    for code, name in colors:
        print("    %-5s %s" % (code, name))
