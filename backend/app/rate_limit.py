"""
In-process request throttle for local uvicorn and a warm Lambda.

API Gateway HTTP API applies the wallet-facing cap in AWS (see
terraform/apigateway.tf). This middleware still returns 429 in local
development and adds a second layer inside a reused Lambda container.
It is not a distributed limiter — each process has its own window.
"""
from collections import defaultdict, deque
from time import monotonic

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

WINDOW_SECONDS = 60.0
MAX_HITS_PER_WINDOW = 60
MAX_TRACKED_CLIENTS = 2000


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip() or "unknown"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window counter keyed by client IP."""

    def __init__(
        self,
        app: ASGIApp,
        max_hits: int = MAX_HITS_PER_WINDOW,
        window_seconds: float = WINDOW_SECONDS,
    ) -> None:
        super().__init__(app)
        self.max_hits = max_hits
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)
        key = _client_key(request)
        now = monotonic()
        bucket = self._hits[key]
        cutoff = now - self.window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= self.max_hits:
            return JSONResponse(
                {"detail": "Too many requests"},
                status_code=429,
                headers={"Retry-After": str(int(self.window_seconds))},
            )
        bucket.append(now)
        if len(self._hits) > MAX_TRACKED_CLIENTS:
            stale = [ip for ip, hits in self._hits.items() if not hits or hits[-1] < cutoff]
            for ip in stale:
                del self._hits[ip]
        return await call_next(request)
