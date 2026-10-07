"""
What if explanation. The body is a comparison already calculated in the browser.

Nothing is written to the database. A missing model key returns available=false
and the page shows its own fixed sentence.
"""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.advice_llm import write_advice

router = APIRouter()


class FactIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(max_length=40)
    label: str = Field(max_length=80)
    display: str = Field(max_length=48)
    numeric: float | None = None


class AdviceIn(BaseModel):
    """Comparison the browser already calculated. Extra fields are rejected."""

    model_config = ConfigDict(extra="forbid")

    changes: list[str] = Field(min_length=1, max_length=8)
    decision: Literal["change", "keep", "unclear"]
    surplusNow: str = Field(max_length=40)
    surplusDraft: str = Field(max_length=40)
    lowControl: bool = False
    staleTerms: bool = False
    quiet: bool = False
    facts: list[FactIn] = Field(max_length=24)

    def change_lines(self) -> list[str]:
        lines = []
        for line in self.changes:
            text = " ".join(line.split())
            if not text or len(text) > 120:
                continue
            lines.append(text)
        return lines


class AdviceOut(BaseModel):
    available: bool
    text: str = ""


@router.post("/advice", response_model=AdviceOut)
async def advice(body: AdviceIn) -> AdviceOut:
    """
    advice

    Args:
        body: Figures, the decision, and what the user changed. Not stored.

    Returns:
        AdviceOut: The model's sentence, or available false when it should not be shown.

    The page treats available false as "use the fixed sentence".
    """
    changes = body.change_lines()
    if not changes:
        return AdviceOut(available=False)
    text = await write_advice({**body.model_dump(), "changes": changes})
    if not text:
        return AdviceOut(available=False)
    return AdviceOut(available=True, text=text)
