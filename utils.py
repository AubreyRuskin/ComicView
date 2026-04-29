import os
import re

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"}

MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".avif": "image/avif",
}


def is_image_file(filename):
    _, ext = os.path.splitext(filename)
    return ext.lower() in IMAGE_EXTS


def nat_sort_key(name):
    m = re.search(r"(\d+)", name)
    if m:
        return (0, int(m.group(1)), name)
    return (1, 0, name)


def safe_join(base, *parts):
    full = os.path.normpath(os.path.join(base, *parts))
    base_norm = os.path.normpath(base)
    if not full.startswith(base_norm + os.sep) and full != base_norm:
        raise ValueError("Path traversal detected")
    return full
