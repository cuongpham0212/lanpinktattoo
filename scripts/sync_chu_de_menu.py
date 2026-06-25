from pathlib import Path
import re

CONFIG = Path("hugo.toml")
TOPIC_ROOT = Path("content/vi/y-tuong-xam")

LABELS = {
    "hinh-xam-mini": "Hình xăm mini",
    "hinh-xam-fine-line": "Fine Line",
    "hinh-xam-ran": "Hình xăm rắn",
    "hinh-xam-thu-cung": "Thú cưng",
    "hinh-xam-cho-nu": "Cho nữ",
    "hinh-xam-cho-nam": "Cho nam",
    "hinh-xam-phuong-hoang": "Phượng hoàng",
}

def title_from_slug(slug: str) -> str:
    return LABELS.get(slug, slug.replace("-", " ").title())

text = CONFIG.read_text(encoding="utf-8")

# Xóa toàn bộ menu con cũ của Chủ đề
text = re.sub(
    r'\n\s*\[\[languages\.vi\.menu\.main\]\]\n\s*name = "[^"]+"\n\s*parent = "chu-de-hinh-xam"\n\s*pageRef = "[^"]+"\n\s*weight = \d+\n',
    "\n",
    text,
)

folders = []
if TOPIC_ROOT.exists():
    for p in sorted(TOPIC_ROOT.iterdir()):
        if p.is_dir() and (p / "_index.md").exists():
            folders.append(p.name)

menu_blocks = []
for i, slug in enumerate(folders, start=1):
    name = title_from_slug(slug)
    menu_blocks.append(f'''
    [[languages.vi.menu.main]]
      name = "{name}"
      parent = "chu-de-hinh-xam"
      pageRef = "/y-tuong-xam/{slug}"
      weight = {i}
'''.rstrip())

insert_after = '''    [[languages.vi.menu.main]]
      name = "Chủ đề"
      identifier = "chu-de-hinh-xam"
      pageRef = "/y-tuong-xam"
      weight = 3'''

if insert_after not in text:
    raise SystemExit("Không tìm thấy block menu Chủ đề trong hugo.toml")

text = text.replace(insert_after, insert_after + "\n" + "\n".join(menu_blocks))

CONFIG.write_text(text, encoding="utf-8")
print(f"Đã sync {len(menu_blocks)} menu con cho Chủ đề.")
