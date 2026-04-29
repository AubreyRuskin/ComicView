import os
import zipfile
from utils import is_image_file, nat_sort_key


def scan_catalog(comic_dirs):
    catalog = {}
    for comic_dir in comic_dirs:
        if not os.path.isdir(comic_dir):
            continue
        _scan_dir(comic_dir, catalog)
    return catalog


def _scan_dir(comic_dir, catalog):
    for comic_name in sorted(os.listdir(comic_dir)):
        comic_path = os.path.join(comic_dir, comic_name)
        if not os.path.isdir(comic_path):
            continue

        if comic_name in catalog:
            _merge_comic(catalog[comic_name], comic_path)
        else:
            catalog[comic_name] = _build_comic(comic_path)


def _build_comic(comic_path):
    has_cover = os.path.isfile(os.path.join(comic_path, "head.jpg"))
    versions = {}
    for ver_name in sorted(os.listdir(comic_path)):
        ver_path = os.path.join(comic_path, ver_name)
        if not os.path.isdir(ver_path):
            continue
        versions[ver_name] = _build_version(ver_path)
    return {"name": os.path.basename(comic_path), "path": comic_path,
            "has_cover": has_cover, "versions": versions}


def _merge_comic(comic, comic_path):
    if not comic["has_cover"]:
        comic["has_cover"] = os.path.isfile(os.path.join(comic_path, "head.jpg"))
    for ver_name in sorted(os.listdir(comic_path)):
        ver_path = os.path.join(comic_path, ver_name)
        if not os.path.isdir(ver_path):
            continue
        if ver_name not in comic["versions"]:
            comic["versions"][ver_name] = _build_version(ver_path)


def _build_version(ver_path):
    chapters = []
    for ch_entry in os.listdir(ver_path):
        ch_path = os.path.join(ver_path, ch_entry)
        if ch_entry.endswith(".zip"):
            ch_name = ch_entry[:-4]
            try:
                with zipfile.ZipFile(ch_path, "r") as zf:
                    images = sorted(
                        (n for n in zf.namelist()
                         if is_image_file(n) and not _is_junk_entry(n)),
                        key=nat_sort_key,
                    )
                chapters.append({
                    "name": ch_name, "filename": ch_entry,
                    "type": "zip", "image_count": len(images),
                })
            except Exception:
                continue
        elif os.path.isdir(ch_path):
            try:
                images = sorted(
                    (f for f in os.listdir(ch_path) if is_image_file(f)),
                    key=nat_sort_key,
                )
            except Exception:
                images = []
            chapters.append({
                "name": ch_entry, "filename": ch_entry,
                "type": "folder", "image_count": len(images),
            })
    chapters.sort(key=lambda c: nat_sort_key(c["name"]))
    return {"name": os.path.basename(ver_path), "path": ver_path, "chapters": chapters}


def _is_junk_entry(name):
    base = os.path.basename(name)
    return base.startswith(".") or base.startswith("__")
