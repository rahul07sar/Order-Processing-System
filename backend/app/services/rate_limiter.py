"""Small in-memory rate limiter used to protect auth endpoints."""

from __future__ import annotations

import math
import threading
import time
from collections import deque


class InMemoryRateLimiter:
    """Small process-local rate limiter with a Redis-friendly interface for later extraction."""

    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        """Return whether a request is allowed and how long to wait if not."""

        now = time.monotonic()
        threshold = now - window_seconds

        with self._lock:
            bucket = self._buckets.setdefault(key, deque())
            while bucket and bucket[0] <= threshold:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = max(1, math.ceil(window_seconds - (now - bucket[0])))
                return False, retry_after

            bucket.append(now)
            return True, 0


rate_limiter = InMemoryRateLimiter()
