# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is a hackathon project (theme: disaster recovery) at the concept stage. The repository contains no application code yet, so there are no build, lint or test commands. Add them here when a stack is chosen.

`Flood Rescue Map Malaysia.md` is the concept document and the source of truth for scope. Read it before proposing features or writing code.

## What the product is

Flood Rescue Map is a proposed coordination tool for flood rescue in Malaysia. Its focus is the handover from a family's report to one individual's confirmed pickup:

1. A resident or relative reports a person needing help, possibly with only a last known location.
2. A district rescue coordinator verifies the pickup location, then assigns a crew and boat.
3. The family follows the case through distinct states: report received, crew assigned, boat departed, boat arrived, pickup confirmed.

Two distinctions from the concept doc must hold in any implementation:

- A boat being assigned or arriving is not the same as a person being picked up. A case stays open until the crew confirms that the individual has boarded.
- The reporter's callback details are kept separate from the affected person's location, and exact household locations and callback numbers are visible only to authorised responders.

## Constraints that shape the design

- **Judging criteria:** continuity planning, rapid response, data protection and community support. The concept doc maps each one to a demo step; keep that mapping working.
- **Offline behaviour:** a crew must still be able to read its saved assignment without a connection, and unsent updates must be visibly queued ("Waiting to send"), never silently dropped.
- **Timestamps and sources:** every status or position shown to a family carries the time it was last confirmed.
- **First prototype scope:** one district, two evacuation centres (PPS), three simulated boats and manually updated crew statuses.
- **Existing services:** SaveME 999, Public InfoBanjir and MyIBJKM already cover emergency reporting, river conditions and evacuation centre registration. Do not rebuild them.
- **Terms:** OKU (*Orang Kurang Upaya*) means a person with a disability; PPS is a temporary evacuation centre.

## Git workflow

`main` is protected by a repository ruleset: only the repository admin can push or merge to it, and force pushes and deletion are blocked. Do all work on a branch and open a pull request.
