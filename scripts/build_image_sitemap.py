from __future__ import annotations

from pathlib import Path
from datetime import date
import json
import html
import re

SITE_ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://lanpinktattoo.com"

CONTENT_DIR = SITE_ROOT / "content" / "vi" / "mau-hinh-xam-dep"
DATA_DIR = SITE_ROOT / "data" / "lanpink_images"
OUT_PATH = SITE_ROOT / "static" / "image-sitemap.xml"

MAX_IMAGES_PER_PAGE = 1000


def esc(v) -> str:
    return html.escape(str(v or "").strip(), quote=True)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def parse_fm(text: str) -> dict:
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}

    fm = {}
    for line in parts[1].splitlines():
        line = line.strip()
        if not line or ":" not in line or line.startswith("#"):
            continue
        k, v = line.split(":", 1)
        fm[k.strip()] = v.strip().strip('"').strip("'")
    return fm


def page_url(md: Path, fm: dict) -> str:
    slug = fm.get("slug", "").strip()
    if slug:
        return f"{BASE_URL}/mau-hinh-xam-dep/{slug}/"

    name = md.stem
    return f"{BASE_URL}/mau-hinh-xam-dep/{name}/"


def collect_images(data: dict) -> list[dict]:
    items = []
    seen = set()

    if isinstance(data.get("cover"), dict):
        items.append(data["cover"])

    if isinstance(data.get("images"), list):
        items.extend([x for x in data["images"] if isinstance(x, dict)])

    clean = []
    for img in items:
        src = str(img.get("src", "")).strip()
        if not src or src in seen:
            continue
        seen.add(src)
        clean.append(img)

    return clean[:MAX_IMAGES_PER_PAGE]


def build():
    blocks = []
    logs = []

    for md in sorted(CONTENT_DIR.rglob("*.md")):
        if md.name == "_index.md":
            continue

        fm = parse_fm(read(md))
        if fm.get("seo_content_type") != "image_gallery" and not fm.get("gallery_slug"):
            continue

        gallery_slug = fm.get("gallery_slug", "").strip()
        json_path = DATA_DIR / f"{gallery_slug}.json"

        if not gallery_slug:
            logs.append(f"⚠️ Thiếu gallery_slug: {md}")
            continue

        if not json_path.exists():
            logs.append(f"⚠️ Thiếu JSON: {json_path}")
            continue

        try:
            data = json.loads(read(json_path))
        except Exception as e:
            logs.append(f"⚠️ JSON lỗi: {json_path} — {e}")
            continue

        images = collect_images(data)
        if not images:
            logs.append(f"⚠️ Không có ảnh hợp lệ: {json_path}")
            continue

        keyword = (
            data.get("keyword")
            or fm.get("gallery_keyword")
            or fm.get("seo_target_keyword")
            or fm.get("title")
            or gallery_slug
        )

        lines = [
            "  <url>",
            f"    <loc>{esc(page_url(md, fm))}</loc>",
            f"    <lastmod>{date.today().isoformat()}</lastmod>",
        ]

        for img in images:
            src = img.get("src", "")
            title = img.get("alt") or keyword
            caption = img.get("caption") or title

            lines += [
                "    <image:image>",
                f"      <image:loc>{esc(src)}</image:loc>",
                f"      <image:title>{esc(title)}</image:title>",
                f"      <image:caption>{esc(caption)}</image:caption>",
                "    </image:image>",
            ]

        lines.append("  </url>")
        blocks.append("\n".join(lines))
        logs.append(f"✅ {gallery_slug}: {len(images)} ảnh")


    # LANPINK_OWNED_IMAGE_EXTENSION_V1
    # Portfolio and artist/studio pages. Gallery logic above is unchanged.
    from urllib.parse import urlsplit
    from xml.etree import ElementTree as ET

    sources = [
        ("vi", "tac-pham"),
        ("en", "portfolio"),
        ("vi", "lan-pink-tattoo-artist"),
        ("en", "lan-pink-tattoo-artist"),
        ("vi", "ve-lan-pink-ink-studio"),
        ("en", "about-lan-pink-ink-studio"),
    ]

    owned_prefix = "https://cdn.jsdelivr.net/gh/cuongpham0212/lanpinktattoo-image@main/images/"
    extra_pages = 0
    extra_images = 0

    for lang, section in sources:
        folder = SITE_ROOT / "content" / lang / section
        if not folder.exists():
            logs.append(f"SKIP missing directory: {folder}")
            continue

        for md in sorted(folder.rglob("*.md")):
            if md.name == "_index.md":
                continue

            raw = read(md)
            fm = parse_fm(raw)
            if fm.get("draft", "").lower() == "true":
                continue

            parts = raw.split("---", 2)
            body = parts[2] if len(parts) == 3 else raw
            found = []

            # Main artwork or artist image.
            for key in ("image", "featured_image"):
                src = fm.get(key, "").strip()
                if src.startswith(owned_prefix):
                    found.append(src)

            # Markdown images and HTML img elements.
            found.extend(re.findall(
                r'!\[[^\]]*\]\(\s*(https?://[^\s)]+)',
                body
            ))
            found.extend(re.findall(
                r'<img\b[^>]*?\bsrc\s*=\s*["\'](https?://[^"\']+)["\']',
                body, flags=re.I | re.S
            ))

            unique = []
            seen = set()
            for src in found:
                src = html.unescape(src.strip())
                if not src.startswith(owned_prefix):
                    continue
                if src in seen:
                    continue
                seen.add(src)
                unique.append(src)

            if not unique:
                logs.append(f"SKIP no owned images: {md}")
                continue

            slug = fm.get("slug", "").strip()
            if not slug:
                slug = md.parent.name if md.name == "index.md" else md.stem

            prefix = "/en" if lang == "en" else ""
            if md.name == "index.md" and folder == md.parent:
                url = f"{BASE_URL}{prefix}/{section}/"
            else:
                url = f"{BASE_URL}{prefix}/{section}/{slug}/"

            lines = [
                "  <url>",
                f"    <loc>{esc(url)}</loc>",
            ]

            for src in unique[:MAX_IMAGES_PER_PAGE]:
                lines.extend([
                    "    <image:image>",
                    f"      <image:loc>{esc(src)}</image:loc>",
                    "    </image:image>",
                ])

            lines.append("  </url>")
            blocks.append("\n".join(lines))
            extra_pages += 1
            extra_images += len(unique[:MAX_IMAGES_PER_PAGE])

    logs.append(
        f"Owned image pages: {extra_pages}; image references: {extra_images}"
    )

    xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        *blocks,
        '</urlset>',
        '',
    ]

    OUT_PATH.write_text("\n".join(xml), encoding="utf-8")

    for log in logs:
        print(log)

    print("")
    print(f"✅ Đã tạo: {OUT_PATH}")
    print(f"✅ Số gallery: {len(blocks)}")
    print(f"✅ Submit GSC: {BASE_URL}/image-sitemap.xml")


if __name__ == "__main__":
    build()
