import io
import os
import zipfile
from flask import send_file, abort
from utils import MIME_TYPES, is_image_file, nat_sort_key


def serve_cover(comic_path):
    cover_path = os.path.join(comic_path, "head.jpg")
    if not os.path.isfile(cover_path):
        abort(404, description="No cover image")
    return send_file(cover_path, mimetype="image/jpeg", max_age=86400)


def serve_image(version_path, chapter_name, filename):
    zip_path = os.path.join(version_path, chapter_name + ".zip")
    if os.path.isfile(zip_path):
        try:
            with zipfile.ZipFile(zip_path, "r") as zf:
                data = zf.read(filename)
        except KeyError:
            abort(404, description=f"Image '{filename}' not found in zip")
        except Exception:
            abort(500, description="Cannot read chapter archive")
        ext = os.path.splitext(filename)[1].lower()
        return send_file(
            io.BytesIO(data),
            mimetype=MIME_TYPES.get(ext, "application/octet-stream"),
            max_age=86400,
        )

    folder_path = os.path.join(version_path, chapter_name)
    img_path = os.path.join(folder_path, filename)
    if os.path.isfile(img_path):
        return send_file(img_path, max_age=86400)

    abort(404, description="Image not found")


def list_images(version_path, chapter_name):
    zip_path = os.path.join(version_path, chapter_name + ".zip")
    if os.path.isfile(zip_path):
        try:
            with zipfile.ZipFile(zip_path, "r") as zf:
                images = sorted(
                    (n for n in zf.namelist()
                     if is_image_file(n)
                     and not os.path.basename(n).startswith(".")
                     and not os.path.basename(n).startswith("__")),
                    key=nat_sort_key,
                )
        except Exception:
            abort(500, description="Cannot read chapter archive")
        return images

    folder_path = os.path.join(version_path, chapter_name)
    if os.path.isdir(folder_path):
        try:
            images = sorted(
                (f for f in os.listdir(folder_path) if is_image_file(f)),
                key=nat_sort_key,
            )
        except Exception:
            images = []
        return images

    abort(404, description="Chapter not found")
