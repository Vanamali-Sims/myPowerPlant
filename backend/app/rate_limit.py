"""Per-IP rate limiting (Security Plan R13, S6.1).

Scope and honest limitation: this is an in-process limiter. Under Lambda each
concurrent execution environment holds its own counters, so the effective limit
is per-instance, not global. It raises the cost of scripted abuse and protects
a single-instance or local deployment, but the authoritative control for
denial-of-wallet is the AWS WAF rate rule at CloudFront plus an API Gateway
usage plan - see infra/README.md. Both are required; neither alone is enough.

Client IP is taken from X-Forwarded-For when present, because behind CloudFront
and API Gateway the socket address is the proxy, not the caller.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def client_identifier(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Left-most entry is the originating client. Trustworthy only because
        # CloudFront/API Gateway rewrite this header; do not rely on it if the
        # app is ever exposed without a proxy in front.
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=client_identifier, default_limits=["240/hour"])
