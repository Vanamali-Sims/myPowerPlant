"""Access control without authentication - Security Plan S6.

S6.1 mandates this test specifically: "generate two profiles, confirm the
identifiers are non-sequential and non-guessable, and confirm that a modified
identifier returns 404."
"""

import uuid

import pytest


async def create(client, profile):
    r = await client.post("/api/profile", json=profile)
    assert r.status_code == 201, r.text
    return r.json()["household_id"]


class TestIdentifierIssuance:
    async def test_identifiers_are_uuidv4_and_non_sequential(self, client, profile):
        """S6.1 mandated test: two profiles, non-sequential, non-guessable."""
        first = await create(client, profile)
        second = await create(client, profile)

        assert first != second
        for value in (first, second):
            parsed = uuid.UUID(value)
            assert parsed.version == 4, "identifier must be a UUIDv4"

        # Non-sequential: as 128-bit integers they must not be adjacent, and
        # must differ across most of their bits rather than in a counter.
        gap = abs(int(uuid.UUID(first)) - int(uuid.UUID(second)))
        assert gap > 2**64, "identifiers look sequential"

    async def test_client_cannot_choose_its_own_identifier(self, client, profile):
        """S6.1: generated server-side, never derived from user input."""
        profile["household_id"] = "attacker-chosen-id"
        r = await client.post("/api/profile", json=profile)
        assert r.status_code == 422

    async def test_sequential_primary_key_is_never_returned(self, client, profile):
        household_id = await create(client, profile)
        body = (await client.get(f"/api/profile/{household_id}")).json()
        assert "id" not in body


class TestRetrieval:
    async def test_altered_identifier_returns_404(self, client, profile):
        """S6.1 mandated test: a modified identifier retrieves nothing."""
        household_id = await create(client, profile)
        assert (await client.get(f"/api/profile/{household_id}")).status_code == 200

        altered = list(household_id)
        altered[0] = "0" if altered[0] != "0" else "1"
        r = await client.get(f"/api/profile/{''.join(altered)}")
        assert r.status_code == 404

    async def test_unknown_identifier_returns_404_not_403(self, client):
        """The endpoint must not confirm whether a record exists."""
        r = await client.get(f"/api/profile/{uuid.uuid4()}")
        assert r.status_code == 404

    @pytest.mark.parametrize(
        "bad_id",
        ["admin", "1", "0", "../../etc/passwd", "a" * 64, "%2e%2e%2f",
         "00000000-0000-1000-8000-000000000000"],  # valid UUID, wrong version
    )
    async def test_non_uuidv4_identifiers_are_indistinguishable_from_a_miss(
        self, client, bad_id
    ):
        assert (await client.get(f"/api/profile/{bad_id}")).status_code == 404

    async def test_sequential_walk_finds_nothing(self, client, profile):
        await create(client, profile)
        for n in range(1, 20):
            assert (await client.get(f"/api/profile/{n}")).status_code == 404


class TestWrites:
    async def test_put_does_not_create(self, client, profile):
        """PUT to an unknown identifier must not let a caller plant a record
        at an address of its choosing."""
        r = await client.put(f"/api/profile/{uuid.uuid4()}", json=profile)
        assert r.status_code == 404

    async def test_partial_body_does_not_blank_stored_values(self, client, profile):
        household_id = await create(client, profile)
        r = await client.put(f"/api/profile/{household_id}", json={"postcode": "3000"})
        assert r.status_code == 422

        after = (await client.get(f"/api/profile/{household_id}")).json()
        assert after["postcode"] == "3101"
        assert after["battery_model"] == "Tesla Powerwall 2"

    async def test_full_replacement_succeeds(self, client, profile):
        household_id = await create(client, profile)
        profile["postcode"] = "3121"
        r = await client.put(f"/api/profile/{household_id}", json=profile)
        assert r.status_code == 200
        assert r.json()["postcode"] == "3121"
