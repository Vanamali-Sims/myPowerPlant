"""Input validation - Security Plan S3.

/api/profile is gone; profile validation now lives in the frontend.
Neither remaining route takes a body/query/path parameter, so these tests
pin that "no input surface" invariant and confirm garbage input is safe.
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
        # 503 is a controlled response, not a crash; only 500 would mean one.
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
