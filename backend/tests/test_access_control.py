"""Access control without authentication - Security Plan S6.

Iteration 1's write-capable /api/profile endpoint, and the household_id
identifiers it issued, have been removed: the household profile now lives
only in the browser (Iteration 2 Security Plan S1, "Key privacy decisions").
There is no per-user record on the server, so IDOR against a household_id
is no longer a meaningful category here.

These tests instead guard the invariant behind that decision: no
write-capable or record-addressed surface exists on this API, so one
cannot silently reappear in a future change without this suite catching
it (the scenario R24 warns about - a false "we don't store your data"
claim if persistence is ever reintroduced without updating the plan).
"""

import uuid

import pytest


class TestNoServerSideProfileStore:
    async def test_profile_write_endpoint_does_not_exist(self, client, profile):
        r = await client.post("/api/profile", json=profile)
        assert r.status_code == 404

    async def test_no_household_identifier_endpoint_exists(self, client):
        """Guards against household_id-addressed records reappearing."""
        r = await client.get(f"/api/profile/{uuid.uuid4()}")
        assert r.status_code == 404

    @pytest.mark.parametrize("method", ["PUT", "PATCH", "DELETE"])
    async def test_no_write_method_is_accepted_under_profile(self, client, method):
        r = await client.request(method, f"/api/profile/{uuid.uuid4()}", json={})
        assert r.status_code == 404


class TestReadOnlyApiSurface:
    """Standing posture (Security Plan S2): GET only, write methods rejected."""

    @pytest.mark.parametrize("path", ["/api/health", "/api/methodology"])
    @pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
    async def test_write_methods_are_rejected(self, client, path, method):
        r = await client.request(method, path, json={})
        assert r.status_code == 405

    async def test_only_get_is_documented_on_any_route(self, client):
        """A drifted deploy should not silently add a write-capable route."""
        r = await client.get("/openapi.json")
        assert r.status_code == 200
        for path, operations in r.json()["paths"].items():
            allowed = {m.upper() for m in operations}
            assert allowed <= {"GET", "HEAD", "OPTIONS"}, f"{path} exposes {allowed}"
