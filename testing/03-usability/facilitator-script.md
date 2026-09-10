# Facilitator Script and Support Protocol

The purpose of this script is consistency: every participant should get the same
support, so differences we observe come from the design rather than from how well a
particular facilitator explained things.

Read the **bold** parts close to verbatim.

## 1. Welcome and framing (2 min)

> **Thanks for helping us out today. This should take about 30 minutes.**
>
> **We are testing a website, not testing you. There are no wrong answers, and you
> cannot break anything. If something is confusing, that is a problem with our
> design, and it is exactly what we need to hear about.**
>
> **I did not design this myself, so please be completely honest — you will not hurt
> my feelings, and blunt feedback is far more useful to us than polite feedback.**

## 2. Consent (2 min)

> **Before we start: is it okay if I take notes and record the screen? The recording
> is only used by our team for this project, your name is not attached to it, and it
> is deleted after the project is marked. You can stop at any point, for any reason,
> and you do not have to give a reason.**

- [ ] Verbal consent obtained
- [ ] Written consent form signed (if your unit requires one)
- [ ] Participant told the data they enter is test data and may be deleted afterwards

**If consent for recording is declined, that is fine — take written notes only.**

## 3. Think-aloud instruction (1 min)

> **As you use it, please say what you are thinking — what you are looking for, what
> you expect to happen, anything that surprises you. If you go quiet I will nudge
> you, but I am not rushing you.**

## 4. Running the scenarios (20 min)

Hand over one scenario card at a time from [scenarios.md](scenarios.md). Then be quiet.

### The support protocol — the hard part

Silence feels rude and the instinct to help is strong. Resist it: the moment you
explain a field, you have destroyed that observation. Instead, redirect.

| Participant says | Do **not** say | Say instead |
| --- | --- | --- |
| "What does 'reserve percentage' mean?" | "It's the minimum charge you keep in the battery." | **"What would you take it to mean?"** |
| "Am I supposed to click this?" | "Yes." | **"What do you think would happen if you did?"** |
| "Did I do that right?" | "Yes, that's right." | **"What would you expect to see if it had worked?"** |
| "I don't know my panel wattage." | "Just put 300." | **"What would you do if you were at home on your own?"** |
| *(goes silent)* | — | **"What are you thinking right now?"** |
| "This is broken." | "Oh, that's a known bug." | **"Tell me what you expected to happen."** |

**Genuinely intervene only when:** the participant is distressed, a real defect has
blocked all further progress, or the session has run over time. Every intervention
gets written down with a reason — an unrecorded rescue turns a Severe finding into
a clean pass in the notes.

### Prompts that are always safe

- "What are you thinking?"
- "What did you expect to happen there?"
- "Is that what you expected?"
- "Talk me through what you are looking at."
- "Take your time."

## 5. Post-session (5 min)

Work through the questions at the end of [scenarios.md](scenarios.md). Then:

> **That is everything. Is there anything else you want to tell us — anything I did
> not ask about?**
>
> **Thank you, this was genuinely useful.**

## 6. Immediately after the participant leaves

- [ ] Complete the session notes **now**, while it is fresh — not tonight
- [ ] Flag anything that looks Major or Severe to the team the same day
- [ ] Reset the environment: clear browser storage and test data before the next participant
- [ ] Add findings to [findings-and-actions.md](findings-and-actions.md)

## Roles during a session

Two people minimum. One facilitator, one note-taker.

- **Facilitator:** talks, holds the script, manages time. Does not take notes — you
  cannot listen properly and write at the same time.
- **Note-taker:** silent throughout. Records observations, direct quotes, timestamps,
  and every point of hesitation. Does not answer participant questions, even when
  addressed directly — the facilitator handles all of it.
