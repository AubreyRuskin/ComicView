import time
from threading import RLock


class TTLCache:
    def __init__(self, ttl_seconds=300):
        self.ttl = ttl_seconds
        self._data = None
        self._expires_at = 0
        self._lock = RLock()

    def get_or_compute(self, computer_fn):
        with self._lock:
            now = time.time()
            if self._data is not None and now < self._expires_at:
                return self._data
            self._data = computer_fn()
            self._expires_at = now + self.ttl
            return self._data

    def invalidate(self):
        with self._lock:
            self._data = None
            self._expires_at = 0
