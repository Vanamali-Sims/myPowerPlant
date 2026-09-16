"""
R8 / §3.3 security headers on every API response.

The SPA's Content-Security-Policy is set on CloudFront (HTML). This
middleware still stamps the five required headers on JSON so health and
methodology responses are not a header-free path.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

API_CSP = (
    "default-src 'none'; frame-ancestors 'none'; "
    "base-uri 'none'; form-action 'none'"
)

HSTS = "max-age=31536000; includeSubDomains"


def _is_https(request: Request) -> bool:
    forwarded = request.headers.get("x-forwarded-proto", "")
    if forwarded.split(",")[0].strip().lower() == "https":
        return True
    return request.url.scheme == "https"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach nosniff, frame deny, referrer, CSP, and HSTS (HTTPS only)."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = API_CSP
        if _is_https(request):
            response.headers["Strict-Transport-Security"] = HSTS
        return response
