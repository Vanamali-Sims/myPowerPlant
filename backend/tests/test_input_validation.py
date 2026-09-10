"""Server-side validation - Security Plan S3.3, R7, R9.

Client-side validation is a usability feature. These tests assert the server
enforces the same rules independently, because the browser is not a control.
"""

import pytest


async def post(client, profile, **overrides):
    profile.update(overrides)
    return await client.post("/api/profile", json=profile)


class TestPostcode:
    @pytest.mark.parametrize(
        "postcode",
        ["9999", "2000", "abcd", "00000", "", "310", "31011",
         "'; DROP TABLE household_profiles;--", "3101 OR 1=1", "<script>x"],
    )
    async def test_rejects_non_victorian_postcode(self, client, profile, postcode):
        assert (await post(client, profile, postcode=postcode)).status_code == 422

    @pytest.mark.parametrize("postcode", ["3000", "3101", "8000", "3999"])
    async def test_accepts_victorian_postcode(self, client, profile, postcode):
        assert (await post(client, profile, postcode=postcode)).status_code == 201


class TestReferenceDataAllowlists:
    async def test_rejects_unknown_battery_model(self, client, profile):
        r = await post(client, profile, battery_model="<script>alert(1)</script>")
        assert r.status_code == 422

    async def test_rejects_unknown_provider(self, client, profile):
        assert (await post(client, profile, provider="Totally Real Energy")).status_code == 422

    async def test_accepts_not_sure(self, client, profile):
        r = await post(client, profile, battery_model="Not sure", provider="Not sure")
        assert r.status_code == 201


class TestNumericBounds:
    @pytest.mark.parametrize("units", [-1, -999, 9, 10**9])
    async def test_rejects_out_of_range_battery_units(self, client, profile, units):
        assert (await post(client, profile, battery_units=units)).status_code == 422

    @pytest.mark.parametrize(
        "field,value",
        [("monthly_bill", "0"), ("monthly_bill", "99999"), ("monthly_bill", "abc"),
         ("monthly_kwh", "0"), ("panel_count", "81"), ("panel_watts", "49"),
         ("reserve_percent", "81"), ("battery_age", "41")],
    )
    async def test_rejects_out_of_range_numerics(self, client, profile, field, value):
        assert (await post(client, profile, **{field: value})).status_code == 422


class TestHostileInput:
    @pytest.mark.parametrize("value", ["3101\x00", "31\x0101", "3101\r\n"])
    async def test_rejects_control_characters(self, client, profile, value):
        assert (await post(client, profile, postcode=value)).status_code == 422

    async def test_rejects_oversized_values(self, client, profile):
        assert (await post(client, profile, postcode="3" * 5000)).status_code == 422

    async def test_rejects_unknown_fields(self, client, profile):
        assert (await post(client, profile, is_admin=True)).status_code == 422

    async def test_bounds_field_sources_json(self, client, profile):
        """field_sources is client-supplied JSON written to a JSON column.
        Unconstrained it is an unbounded storage write."""
        r = await post(client, profile, field_sources={"x" * 500: "y" * 10000})
        assert r.status_code == 422

    async def test_rejects_invalid_field_sources_values(self, client, profile):
        assert (await post(client, profile, field_sources={"postcode": "spoofed"})).status_code == 422


class TestConditionalRequirements:
    async def test_dryer_requires_cycle_counts(self, client, profile):
        r = await post(client, profile, dryer="yes", dryer_week="", dryer_weekend="")
        assert r.status_code == 422

    async def test_solar_requires_panel_details(self, client, profile):
        r = await post(client, profile, has_solar="yes", panel_count="", panel_watts="")
        assert r.status_code == 422

    async def test_no_solar_needs_no_panel_details(self, client, profile):
        r = await post(client, profile, has_solar="no", solar_direction="",
                       panel_count="", panel_watts="")
        assert r.status_code == 201
