"""Response headers and rate limiting - Security Plan R8, R13."""

import pytest

REQUIRED_HEADERS = [
    "content-security-policy",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
]


class TestSecurityHeaders:
    @pytest.mark.parametrize("header", REQUIRED_HEADERS)
    async def test_header_present(self, client, header):
        r = await client.get("/api/health")
        assert header in {k.lower() for k in r.headers}

    async def test_csp_forbids_inline_and_eval(self, client):
        csp = (await client.get("/api/health")).headers["content-security-policy"]
        assert "unsafe-inline" not in csp
        assert "unsafe-eval" not in csp

    async def test_hsts_present_when_request_is_https(self, client):
        """HSTS is conditional on X-Forwarded-Proto (set by CloudFront)."""
        r = await client.get("/api/health", headers={"X-Forwarded-Proto": "https"})
        assert "strict-transport-security" in {k.lower() for k in r.headers}

    async def test_hsts_absent_over_plain_http(self, client):
        r = await client.get("/api/health")
        assert "strict-transport-security" not in {k.lower() for k in r.headers}

    async def test_headers_present_on_error_responses(self, client):
        """An error path must not drop the headers."""
        r = await client.get("/api/nope")
        assert r.status_code == 404
        assert "x-content-type-options" in {k.lower() for k in r.headers}


class TestCors:
    async def test_hostile_origin_not_reflected(self, client):
        r = await client.get("/api/health", headers={"Origin": "https://evil.example.com"})
        assert r.headers.get("access-control-allow-origin") != "https://evil.example.com"

    async def test_credentials_not_allowed(self, client):
        r = await client.get("/api/health", headers={"Origin": "http://localhost:5173"})
        assert r.headers.get("access-control-allow-credentials") != "true"


class TestRateLimiting:
    async def test_reads_are_throttled(self, client):
        """R13. In-process limiter only - see app/rate_limit.py."""
        codes = [(await client.get("/api/health")).status_code for _ in range(80)]
        assert 429 in codes, "no throttling engaged"

    async def test_throttled_response_includes_retry_after(self, client):
        for _ in range(80):
            r = await client.get("/api/health")
            if r.status_code == 429:
                assert "retry-after" in {k.lower() for k in r.headers}
                return
        pytest.fail("no throttling engaged")
