from pathlib import Path
import shutil

ROOT = Path("content/vi/y-tuong-xam")

if not ROOT.exists():
    raise SystemExit(f"Không thấy folder: {ROOT}")

changed = 0
skipped = 0

for index_file in ROOT.rglob("index.md"):
    folder = index_file.parent

    # Bỏ qua index.md nằm ngay root
    if folder == ROOT:
        continue

    # Nếu folder có _index.md thì đây là section, không đụng
    if (folder / "_index.md").exists():
        continue

    target = folder.with_suffix(".md")

    if target.exists():
        print(f"SKIP vì file đã tồn tại: {target}")
        skipped += 1
        continue

    print(f"MOVE: {index_file} -> {target}")
    shutil.move(str(index_file), str(target))
    changed += 1

    try:
        folder.rmdir()
        print(f"REMOVE EMPTY FOLDER: {folder}")
    except OSError:
        print(f"KEEP FOLDER vì còn file khác: {folder}")

print(f"\nXong. Đã chuyển {changed} bài. Bỏ qua {skipped} bài.")
