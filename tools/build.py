#!/usr/bin/env python3
"""tools/pages/*.html の断片を tools/layout.html に流し込み、リポジトリ直下に各ページを生成する。

断片ファイルの1行目にメタ情報を書く:
  <!-- title: お知らせ | desc: 説明文 | id: news -->
"""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAYOUT = (ROOT / "tools" / "layout.html").read_text(encoding="utf-8")
PAGES = sorted((ROOT / "tools" / "pages").glob("*.html"))

if not PAGES:
    sys.exit("tools/pages/ に断片がありません")

for src in PAGES:
    text = src.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--\s*(.*?)\s*-->\s*\n", text, re.S)
    if not m:
        sys.exit(f"{src.name}: 1行目のメタコメントがありません")
    meta = {}
    for part in m.group(1).split("|"):
        k, _, v = part.partition(":")
        meta[k.strip()] = v.strip()
    body = text[m.end():]
    html = (LAYOUT
            .replace("{{TITLE}}", meta.get("title", src.stem))
            .replace("{{DESC}}", meta.get("desc", ""))
            .replace("{{PAGE_ID}}", meta.get("id", src.stem))
            .replace("{{BODY}}", body.rstrip() + "\n"))
    out = ROOT / src.name
    out.write_text(html, encoding="utf-8")
    print(f"built {out.name}  ({len(html):,} bytes)")
