"""Input validation - Security Plan S3.

The write-capable /api/profile endpoint this suite originally validated
(postcode format, battery/provider allow-lists, numeric bounds, an
explicit field allow-list, control characters, oversized payloads) has
been removed: the household profile now lives only in the browser and is
validated there (frontend/src/lib/validateProfile.ts,
frontend/src/lib/profileStorage.ts). Neither remaining route
(GET /api/health, GET /api/methodology) takes a body, query parameter, or
path parameter, so there is no longer any user-controlled input reaching
this API.

These tests pin that "no input surface" invariant, so it is caught if a
future endpoint reintroduces a parameter without validation, and confirm
that garbage sent at the now-absent surface is handled safely rather than
crashing or leaking internals.
"""

import pytest


class TestNoInputSurfaceRemains:
    async def test_neither_route_declares_a_body_or_parameters(self, client):
        r = await client.get("/openapi.json")
        schema = r.json()
        for path, operations in schema["paths"].items():
            get_op = operations.get("get", {})
            assert "requestBody" not in get_op, f"{path} unexpectedly accepts a body"
            assert not get_op.get("parameters"), f"{path} unexpectedly declares parameters"


class TestGarbageInputIsHandledSafely:
    @pytest.mark.parametrize(
        "path",
        [
            pytest.param("/api/health?" + "x" * 5000, id="oversized-query-string"),
            pytest.param("/api/health?<script>alert(1)</script>=1", id="script-tag-in-query"),
            pytest.param("/api/health/../../etc/passwd", id="path-traversal"),
            pytest.param(
                "/api/methodology/'; DROP TABLE appliances;--", id="sql-injection-in-path"
            ),
        ],
    )
    async def test_does_not_crash_or_leak_internals(self, client, path):
        r = await client.get(path)
        # 503 (Database unavailable) is a controlled, intended response from
        # the route's own exception handler - not a crash. A bare 500 would
        # mean an unhandled exception reached the client.
        assert r.status_code != 500
        assert "traceback" not in r.text.lower()

    async def test_malformed_json_body_on_a_get_route_does_not_leak_internals(self, client):
        r = await client.request(
            "GET",
            "/api/methodology",
            content=b"{not json",
            headers={"Content-Type": "application/json"},
        )
        body = r.text.lower()
        assert "traceback" not in body
        assert "sqlalchemy" not in body
        assert "/users/" not in body
