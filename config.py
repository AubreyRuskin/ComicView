import json
import os

CONFIG_PATH = os.environ.get(
    "CONFIG_PATH", os.path.join(os.path.dirname(__file__), "config.json")
)

with open(CONFIG_PATH) as f:
    _cfg = json.load(f)

COMIC_DIRS = [os.path.expanduser(d) for d in _cfg["comic_dirs"]]
# Resolve relative paths relative to config file location
_config_dir = os.path.dirname(os.path.abspath(CONFIG_PATH))
COMIC_DIRS = [
    d if os.path.isabs(d) else os.path.normpath(os.path.join(_config_dir, d))
    for d in COMIC_DIRS
]

HOST = os.environ.get("HOST", _cfg.get("host", "0.0.0.0"))
PORT = int(os.environ.get("PORT", str(_cfg.get("port", 5000))))
CATALOG_CACHE_TTL = int(
    os.environ.get("CACHE_TTL", str(_cfg.get("cache_ttl", 300)))
)
DEBUG = os.environ.get("DEBUG", "").lower() in ("1", "true", "yes")
