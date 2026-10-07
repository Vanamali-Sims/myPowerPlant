"""What if phrasing accepts a calculated comparison and stores nothing."""

from app.advice_guard import numbers_are_known

_BODY = {
    "changes": ["Panels: 12 → 18"],
    "decision": "change",
    "surplusNow": "12pm to 3pm",
    "surplusDraft": "11am to 4pm",
    "lowControl": False,
    "staleTerms": False,
    "facts": [
        {"id": "save.annual", "label": "Change over a year", "display": "$120", "numeric": 120},
    ],
}


class TestAdviceRoute:
    async def test_missing_key_does_not_call_a_model(self, client, monkeypatch):
        monkeypatch.delenv("LLM_API_KEY", raising=False)
        monkeypatch.setenv("ENVIRONMENT", "local")
        response = await client.post("/api/advice", json=_BODY)
        assert response.status_code == 200
        assert response.json() == {"available": False, "text": ""}

    async def test_profile_fields_are_rejected(self, client):
        response = await client.post("/api/advice", json={**_BODY, "postcode": "3101"})
        assert response.status_code == 422

    async def test_health_stays_read_only(self, client):
        response = await client.post("/api/health", json={})
        assert response.status_code == 405


class TestAdviceGuard:
    def test_clock_words_and_known_dollars_pass(self):
        assert numbers_are_known("Spare solar runs 11am to 3pm. About $120 over a year.", [120])

    def test_invented_dollars_fail(self):
        assert not numbers_are_known("This saves $999 over a year.", [120])
