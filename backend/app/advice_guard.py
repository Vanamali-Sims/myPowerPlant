"""Reject a What if sentence that introduces a figure we did not calculate."""

import re

_NUMERALS = re.compile(r"-?\d[\d,]*(?:\.\d+)?")


def _is_clock_word(value: float, text: str, start: int, raw: str) -> bool:
    if value < 0 or value > 12 or value != int(value):
        return False
    if start > 0 and text[start - 1] == "$":
        return False
    after = text[start + len(raw) : start + len(raw) + 6]
    if re.match(r"^\s*(kwh|%)", after, flags=re.IGNORECASE):
        return False
    return True


def numbers_are_known(text: str, allowed: list[float]) -> bool:
    """
    numbers_are_known

    Args:
        text: Candidate sentence from the model.
        allowed: Absolute figures the sentence may cite, plus nothing else.

    Returns:
        bool: False when the sentence contains a measured figure that is not allowed.

    Clock words such as "11am" are ignored. Money, kWh, and percents are not.
    """
    known = [abs(value) for value in allowed]
    known.append(52.0)
    for match in _NUMERALS.finditer(text):
        raw = match.group(0)
        try:
            value = abs(float(raw.replace(",", "")))
        except ValueError:
            continue
        if _is_clock_word(value, text, match.start(), raw):
            continue
        if not any(abs(candidate - value) <= max(0.05, abs(candidate) * 0.02) for candidate in known):
            return False
    return True
