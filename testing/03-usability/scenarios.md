# Usability Test Scenarios

## How these scenarios are written, and why

Each scenario gives the participant a **situation and a goal**, never instructions.
We say *"find out whether adding a battery is worth it for your home"*, not
*"click Get started, then fill in the battery step"*. The moment a scenario names a
button, it tests reading comprehension instead of the design, and the participant
can no longer get lost — which is precisely the information we need.

Rules the facilitator holds to:

- Hand the scenario over **in writing** (one card each) as well as reading it aloud,
  so the participant can re-read without asking.
- Use the participant's own vocabulary, not the product's. No "profile", "KPI",
  "setup wizard", "household ID".
- Give a plausible reason for the task. People behave differently when they
  understand why they would be doing something.
- Provide any data the participant needs but would not carry in their head — a
  sample electricity bill, a postcode, a battery model. Not knowing their own kWh
  figure is a finding about our product, but it must not block the session.
- Order scenarios so each builds on the state left by the last, mirroring real use.

## Pre-session setup (facilitator)

- [ ] Backend and frontend running; database reset so the participant starts fresh
- [ ] Browser storage cleared — otherwise US-1 silently becomes US-4
- [ ] Scenario cards printed or on a second screen
- [ ] Sample bill / prompt data to hand
- [ ] Consent obtained and recording (if any) started — see [facilitator-script.md](facilitator-script.md)
- [ ] Note-taker ready with a copy of [session-notes/TEMPLATE.md](session-notes/TEMPLATE.md)

---

## US-1 — First impression and getting started

> You have been meaning to do something about your electricity bill. A friend
> mentions a website that tells you how your home's energy use stacks up and whether
> solar or a battery would help. You have just opened it for the first time.
>
> Have a look and tell me what you think this does and what you would do next.

**What we are looking for:** whether the value of the product is legible before any
commitment, and whether the primary action is findable without being pointed at.

**Success:** participant articulates roughly what the product does and moves to start
setup unaided.

**Watch for:** hesitation before the first click; scrolling to look for more
explanation; asking "do I need an account?"

---

## US-2 — Entering your household's details

> You have decided to try it. Here is a recent electricity bill for your home.
> Set it up with your household's details so it can work something out for you.
>
> Please think aloud as you go — especially if anything is unclear or you are unsure
> what an answer should be.

**What we are looking for:** the highest-risk journey in the product. Where do people
stall, guess, or give up in a five-step form?

**Success:** setup completed without facilitator help.

**Watch for:** questions the participant cannot answer about their own home (panel
wattage, battery model, reserve percentage); use of "Not sure" — is it noticed and
does it feel legitimate rather than like failure; any point where they consider
abandoning; whether they trust that entering this data is safe.

**Note:** if they ask you what a field means, do not answer — redirect (see the
script). What they do when stuck *is* the result.

---

## US-3 — Making sense of the result

> The site has worked something out for you. Take a look and tell me what it is
> telling you about your home, and whether it would change anything you do.

**What we are looking for:** whether the dashboard communicates or merely displays.
A KPI the user cannot interpret is a KPI that does not work, however correct.

**Success:** participant explains at least two figures in their own words and says
what, if anything, they would act on.

**Watch for:** figures read aloud without meaning attached; "what does that number
mean?"; ignored chart; whether they trust the numbers, and what would make them
trust them more.

---

## US-4 — Coming back later

> A week later you want to look at this again on the same computer.
> Show me what you would do.

**What we are looking for:** whether a product with no login makes its own return
path obvious, and whether the absence of an account is reassuring or alarming.

**Success:** participant reaches their dashboard without redoing setup.

**Watch for:** looking for a login; expecting an email or a link; asking how the site
remembers them; concern about who else can see the data.

---

## US-5 — Correcting a mistake

> You realise the electricity usage you entered was wrong — it was the quarterly
> figure, not the monthly one. Fix it.

**What we are looking for:** whether the profile is editable in a discoverable way,
and whether the user understands that the result recalculates.

**Success:** value corrected and the participant notices the dashboard has updated.

**Watch for:** re-running the whole setup instead of editing; uncertainty about
whether the change saved; not realising the figures changed.

---

## Post-session questions

Ask after all scenarios, never during:

1. What was the most frustrating part of that?
2. Was there anything you expected to be able to do that you could not?
3. Was there a point where you would have given up if you were at home alone?
4. Would you trust the figures enough to act on them? What would change that?
5. Anything you would want changed before you would recommend this to someone?

## Recording results

One file per participant in [session-notes/](session-notes/), copied from the
template. Findings are then consolidated into
[findings-and-actions.md](findings-and-actions.md), which is the file that feeds
back into the backlog.
