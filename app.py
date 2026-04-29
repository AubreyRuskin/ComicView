from flask import Flask, render_template, jsonify, abort
import config
from cache import TTLCache
from scanner import scan_catalog
from image_server import serve_cover, serve_image, list_images

app = Flask(__name__)

catalog_cache = TTLCache(config.CATALOG_CACHE_TTL)


def get_catalog():
    return catalog_cache.get_or_compute(lambda: scan_catalog(config.COMIC_DIRS))


def _find_chapter(chapters, chapter_name):
    for i, ch in enumerate(chapters):
        if ch["name"] == chapter_name:
            return i, ch
    return None, None


def _get_comic(catalog, comic_name):
    comic = catalog.get(comic_name)
    if not comic:
        abort(404, description="Comic not found")
    return comic


def _get_version(comic, version_name):
    version = comic["versions"].get(version_name)
    if not version:
        abort(404, description="Version not found")
    return version


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/comics")
def api_comics():
    catalog = get_catalog()
    comics = []
    for name, info in catalog.items():
        comics.append({
            "name": name,
            "has_cover": info["has_cover"],
            "version_count": len(info["versions"]),
        })
    return jsonify(comics)


@app.route("/api/comics/<path:comic_name>/versions")
def api_versions(comic_name):
    comic = _get_comic(get_catalog(), comic_name)
    versions = []
    for vname, vinfo in comic["versions"].items():
        versions.append({
            "name": vname,
            "chapter_count": len(vinfo["chapters"]),
        })
    return jsonify(versions)


@app.route("/api/comics/<path:comic_name>/versions/<path:version_name>/chapters")
def api_chapters(comic_name, version_name):
    comic = _get_comic(get_catalog(), comic_name)
    version = _get_version(comic, version_name)
    chapters = []
    for i, ch in enumerate(version["chapters"]):
        chapters.append({
            "name": ch["name"],
            "type": ch["type"],
            "image_count": ch["image_count"],
            "prev": version["chapters"][i - 1]["name"] if i > 0 else None,
            "next": version["chapters"][i + 1]["name"]
            if i + 1 < len(version["chapters"]) else None,
        })
    return jsonify(chapters)


@app.route(
    "/api/comics/<path:comic_name>/versions/<path:version_name>/chapters/<path:chapter_name>/images"
)
def api_images(comic_name, version_name, chapter_name):
    comic = _get_comic(get_catalog(), comic_name)
    version = _get_version(comic, version_name)

    idx, chapter = _find_chapter(version["chapters"], chapter_name)
    if chapter is None:
        abort(404, description="Chapter not found")

    prev_name = version["chapters"][idx - 1]["name"] if idx > 0 else None
    next_name = (
        version["chapters"][idx + 1]["name"]
        if idx + 1 < len(version["chapters"]) else None
    )

    images = list_images(version["path"], chapter_name)
    return jsonify({
        "images": images,
        "chapter_name": chapter_name,
        "prev_chapter": prev_name,
        "next_chapter": next_name,
    })


@app.route("/api/cover/<path:comic_name>")
def api_cover(comic_name):
    comic = _get_comic(get_catalog(), comic_name)
    return serve_cover(comic["path"])


@app.route(
    "/api/image/<path:comic_name>/<path:version_name>/<path:chapter_name>/<path:filename>"
)
def api_image(comic_name, version_name, chapter_name, filename):
    version = _get_version(_get_comic(get_catalog(), comic_name), version_name)
    return serve_image(version["path"], chapter_name, filename)


@app.route("/api/refresh", methods=["POST"])
def api_refresh():
    catalog_cache.invalidate()
    return jsonify({"status": "ok"})


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": e.description or "Not found"}), 404


@app.errorhandler(403)
def forbidden(e):
    return jsonify({"error": e.description or "Forbidden"}), 403


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
