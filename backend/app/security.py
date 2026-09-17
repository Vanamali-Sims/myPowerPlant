"""Application security controls.

Implements the Iteration 1 items from the Security Plan that live in the
application layer rather than in AWS configuration:

* S3.3 / R8  - security response headers and Content-Security-Policy
* S3.4 / R12 - never-log field list and redaction helper

The plan names Helmet.js for headers, which is an Express library and cannot
apply to this FastAPI backend; SecurityHeadersMiddleware is the equivalent.
"""

from collections.abc import Iterable
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Security Plan S3.4 / R12. Values of these fields must never reach application
# logs. They are household profile values, treated as personal information.
NEVER_LOG_FIELDS = frozenset(
    {
        "postcode",
        "people",
        "rooms",
        "gas",
        "refrigerators",
        "dryer",
        "dryer_week",
        "dryer_weekend",
        "heating",
        "cooling",
        "hot_water",
        "monthly_bill",
        "monthly_kwh",
        "peak_period",
        "usage_level",
        "wfh",
        "has_solar",
        "solar_direction",
        "panel_count",
        "panel_watts",
        "battery_units",
        "reserve_percent",
        "battery_age",
        "battery_model",
        "provider",
        "household_id",
    }
)

REDACTED = "[redacted]"


def redact(payload: dict[str, Any], never_log: Iterable[str] = NEVER_LOG_FIELDS) -> dict[str, Any]:
    """Return a copy of payload safe to write to CloudWatch.

    Use this on anything derived from a request body before logging it. It is
    deliberately allowlist-free: any field named in NEVER_LOG_FIELDS is
    replaced, and nested dicts are walked, so adding a field to the model
    without adding it here fails safe only if the name matches.
    """
    safe: dict[str, Any] = {}
    for key, value in payload.items():
        if key in never_log:
            safe[key] = REDACTED
        elif isinstance(value, dict):
            safe[key] = redact(value, never_log)
        else:
            safe[key] = value
    return safe


# This API serves JSON only and renders no HTML, so the policy is maximally
# restrictive. The CSP that matters for the dashboard is the one applied to the
# static frontend at CloudFront/Amplify - see infra/security-headers.md.
_API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"

_HEADERS = {
    "Content-Security-Policy": _API_CSP,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-site",
    "Permissions-Policy": "geolocation=(), camera=(), microphone=(), payment=(), usb=()",
    # Belt and braces: CloudFront also sets HSTS. Harmless over plain HTTP
    # locally because browsers ignore it on non-secure origins.
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach security headers to every response, including error responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        for header, value in _HEADERS.items():
            response.headers.setdefault(header, value)
        return response
