"""Response headers and rate limiting - Security Plan R8, R13."""

import pytest

REQUIRED_HEADERS = [
    "content-security-policy",
    "strict-transport-security",
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

    async def test_headers_present_on_error_responses(self, client):
        """An error path must not drop the headers."""
        r = await client.get("/api/profile/nope")
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
    async def test_reads_are_throttled(self, client, profile):
        """R13 denial-of-wallet. In-process limiter only - WAF is the
        authoritative control (see app/rate_limit.py)."""
        household_id = (await client.post("/api/profile", json=profile)).json()["household_id"]
        codes = [(await client.get(f"/api/profile/{household_id}")).status_code
                 for _ in range(80)]
        assert 429 in codes, "no throttling engaged"

    async def test_creation_is_throttled_harder_than_reads(self, client, profile):
        codes = [(await client.post("/api/profile", json=profile)).status_code
                 for _ in range(15)]
        assert 429 in codes


class TestErrorDisclosure:
    async def test_malformed_json_does_not_leak_internals(self, client):
        r = await client.post(
            "/api/profile",
            content=b"{not json",
            headers={"Content-Type": "application/json"},
        )
        body = r.text.lower()
        assert "traceback" not in body
        assert "sqlalchemy" not in body
        assert "/users/" not in body
