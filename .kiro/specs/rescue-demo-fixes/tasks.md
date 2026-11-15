# Implementation Plan

## Overview

All code changes and commands in this plan apply to the git worktree `c:\Users\User\Desktop\projects\Flood Rescue Map Malaysia\.claude\worktrees\flood-rescue-map-malaysia-071029`, called "the worktree" below. It is not the workspace root. Run every `npm test`, `npm run lint`, `npm run build`, `npm install`, `npm ls` and `npx tsx` command with the worktree as the working directory. The workspace grep tool skips `.claude`, so search with PowerShell `Select-String` or read files by absolute path. Decision numbers (D1 to D10), "Fix Implementation" and "Testing Strategy" refer to `design.md` in this folder.

Tasks 1 and 2 write the exploration and preservation tests before any production change. Tasks 3 to 7 fix the five areas in order: rapid-response seed, pickup confirmation, drill measures, offline queue, project leftovers. Task 8 re-runs the tests from tasks 1 and 2, and task 9 is the final checkpoint. Read the Notes section before starting any task.

## Tasks

- [ ] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Rescue demo rules hold for every buggy input
  - **CRITICAL**: These tests MUST FAIL on unfixed code. The failures confirm the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: The tests encode the expected behavior from design `expectedBehavior`. They validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug in `isBugCondition` (isDemoBug, isPickupBug, isDrillBug, isOfflineBug, isLeftoverBug)
  - **Scoped PBT Approach**: The seed, drill and setup bugs are deterministic, so scope those properties to the concrete failing cases. Use generated inputs only for pickup validation, drill definitions and queue sending
  - Working directory for all commands: the worktree
  - Create `src/utils/testSupport.ts` (D9, no new dependency):
    - `mulberry32(seed)` seeded random generator and `pick(rng, items)`
    - `randomOnlineSequence(seed, steps)`: starts from deep copies of `INITIAL_CASES` and `INITIAL_BOATS` and applies random valid online actions (assign boat, advance boat status, verify pin, confirm priority, set owner and follow-up, family update, pickup through an arrived assigned boat)
    - `stripIds(value)`: removes generated message ids so results can be compared
    - `callConfirmPickup(...args)`: calls `confirmPersonPickedUp` through a loosely typed cast (`as unknown as (...a: unknown[]) => { cases: RescueCase[]; boats: BoatUnit[] }`) so the same call works with the unfixed 6-argument signature and the fixed 5-argument one, and passes lint both before and after the fix
    - Put the seed in every property assertion message so a failure can be replayed
  - Create `src/utils/bugCondition.test.ts` using `node:test` and `node:assert/strict`. Import rescue logic as a namespace (`import * as logic from './rescueLogic'`), so a missing export fails only its own test and not the whole file
  - `seed:` tests (isDemoBug, 1.1):
    - `INITIAL_BOATS` has exactly one boat with `status === 'available'`; it is `boat-15` with `assignedPickupPoint === null` and `assignedCaseIds` empty
    - `assignBoatToCase(INITIAL_CASES, INITIAL_BOATS, 'case-devi', 'boat-15', '2:38 PM').ok === true`
  - `pickup:` tests (isPickupBug, 1.4 to 1.7):
    - Build a test copy of the boats with Boat 15 added when the seed lacks it. Assign Boat 15 to `case-devi`, then confirm `case-devi` with `boat-15`. Assert `ok === false`, error "An assigned boat must be marked arrived first. Boat 15 is preparing.", case still `assigned`, boats unchanged
    - Mark Boat 12 arrived, then confirm `case-lim` with `boat-12`. Assert error "Boat 12 is not assigned to this case." and no `pickedUpBy` on `case-lim`
    - Property over 200 seeds: from `randomOnlineSequence`, pick (case, boat) pairs where `boatId NOT IN case.assignedBoatIds OR boat.status <> 'arrived'`. Assert `ok === false`, a non-empty error, and cases and boats deep-equal the inputs
    - Puan Aminah with only Boat 07 marked arrived: `logic.getPickupEligibility(cases, boats, 'case-aminah')` returns arrived boat ids `['boat-07']`; confirming with `boat-07` (5 arguments, no crew lead) records `pickedUpBy === 'Kpl. Suresh Nair (Demo Crew)'`
    - Eligibility blockers: a case whose assigned boats are not arrived returns "Waiting for an assigned boat to be marked arrived."; a case with no boats returns "No boat is assigned to this case yet."
  - `drill:` tests (isDrillBug, 1.9 to 1.11):
    - `computeDrillComparison(INITIAL_CASES, [], INITIAL_DRILL_BASELINE)` returns `digitalVerify`, `headline`, `digitalAssignments` and `digitalPickups` all `null`. Log the unfixed output (expected counterexample: 6 min, 79% faster, 0, 0)
    - Property over 200 seeds: random cases with and without `reportedAtMs`/`verifiedAtMs` and random `DrillEvent` logs. Assert each value matches its definition in design Fix Implementation item 7 (mean interval over measured cases, one decimal; counts from events; `null` when nothing qualifies), and `headline.direction === 'faster'` only when digital minutes are below the paper baseline
  - `offline:` tests (isOfflineBug, 1.8, 1.12 to 1.16):
    - `logic.isAppOnline` over all four (browserOnline, demoOffline) combinations equals `browserOnline && !demoOffline`
    - Offline continuity flow: queue Boat 04 arrived, Puan Aminah's pickup with Boat 04, a new rescue request and a road issue, all with `createdAt` '2:40 PM'. `logic.applyQueuedActions(state, queue, { at: '3:05 PM', atMs })` gives Puan Aminah `pickedUpAt === '2:40 PM'`, the new request and road appear in the result state, and `remaining` is empty
    - Rejected item kept: a queued pickup whose boat is made available before sending ends in `remaining` with error "Boat 04 is not assigned to this case."; items after it are still applied
    - Property over 200 seeds: random queues of 1 to 8 items of all five types with random `createdAt` minutes, including invalid pickups and missing ids. Assert sent ids and remaining ids partition the queue ids, `remaining` keeps queue order, every remaining item has a non-empty `error`, applied items use their `createdAt`, and cases not referenced by a sent item are unchanged
    - Translations: `TRANSLATIONS.en/bm/cn.waitingToSendLabel` equal "Waiting to send", "Menunggu untuk dihantar" and "等待发送"; no string value, and no function value called with `2`, matches `/draft|draf|草稿/i`
  - `flow:` test (design Integration Tests): seed, assign Boat 15 to `case-devi`, mark it on the way and arrived, confirm the pickup. Boat 15 is available again, `pickedUpBy` is its crew lead, and `computeDrillComparison` over the recorded events (`drillEventForAssignment`, `drillEventForPickup`) reports 1 pickup attempt and 0 blocked
  - Create `tests/projectSetup.test.ts` with `setup:` tests (isLeftoverBug, 1.18 to 1.21). Read files through `new URL('../<file>', import.meta.url)`:
    - `package.json` name is `flood-rescue-map-malaysia`; `@google/genai`, `express`, `dotenv` and `@types/express` are absent from dependencies and devDependencies
    - `package-lock.json` exists and `bun.lock` does not
    - `metadata.json` `majorCapabilities` is empty; `.env.example` contains neither `GEMINI_API_KEY` nor `APP_URL`
    - The `clean` script contains neither `server.js` nor `rm -rf`; `vite.config.ts` does not contain `__dirname`
  - Change the `package.json` `test` script to list every file explicitly (Node 20 has no glob in `--test`): `tsx --test src/utils/rescueLogic.test.ts src/utils/bugCondition.test.ts tests/projectSetup.test.ts`
  - Run `npx tsx --test src/utils/bugCondition.test.ts tests/projectSetup.test.ts` on the UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL. This is correct and proves the bugs exist
  - Document the counterexamples in the task report and in a short header comment in `bugCondition.test.ts` labelled "Observed on unfixed code" (for example: zero available boats; a `preparing` boat confirms a pickup; Boat 12 confirms Mr Lim; drill shows 6 min and 79% with no events; `applyQueuedActions` and `isAppOnline` not exported)
  - The App-level conditions have no test harness (1.2, 1.3, the UI part of 1.6 and 1.7, the listeners in 1.12, 1.15, 1.17). Confirm them by reading the lines cited in design "Hypothesized Root Cause" (`App.tsx` 102, 213, 577 to 646, 705, 1217, 1340, 1420; `CoordinatorConsole.tsx` 102, 568, 576; `ShahAlamLeafletMap.tsx` 2297, 2300) and record what each shows. If the code does not match the hypothesis, stop and report so the root cause can be re-examined
  - Mark complete when the tests are written, run, and the failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 1.18, 1.19, 1.20, 1.21_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Behavior outside the bug condition is unchanged
  - **IMPORTANT**: Follow observation-first methodology. Observe the UNFIXED code for inputs where `isBugCondition` is false, then write tests that assert what was observed
  - Working directory for all commands: the worktree
  - Capture a baseline from the unfixed code: write a temporary script, run it with `npx tsx`, then delete the script. It writes `src/utils/preservationBaseline.json` containing the `INITIAL_BOATS` entries for `boat-04`, `boat-07`, `boat-12` and `boat-09`; all of `INITIAL_CASES`; and, for each language, every `TRANSLATIONS` string value and every function value called with `2`, except `sendDraftsBtn`, `localDraftsBtn` and `offlineMapWarning`. Tests read it with `fs.readFileSync` and `JSON.parse` (the tsconfig has no `resolveJsonModule`)
  - Add frozen oracles to `src/utils/testSupport.ts`:
    - `originalConfirmPersonPickedUp`: a verbatim copy of the current `confirmPersonPickedUp` (`rescueLogic.ts` lines 498 to 544)
    - `originalFamilyLocationChange(cases, caseId, landmark, confirmedBy, coords, timestamp)`: a copy of the online branch of `handleReportLocationChange` (`App.tsx` from line 727), including its family update message
    - `originalMoveCasePin(cases, caseId, point, timestamp)`: a copy of `handleMoveSelectedCasePin` (`App.tsx` line 705) without the `syncState` write
  - Observe on unfixed code and record in the task report: Puan Aminah's tracker shows "3 boats assigned · 2 on the way · 1 preparing"; SK Taman Sri Muda shows 3 boats, 2 on the way, 1 preparing and 2 waiting households; the exact `assignBoatToCase` error strings (`rescueLogic.ts` lines 307 to 410); marking a boat arrived moves waiting cases to `boat_arrived`; a pickup through an arrived assigned boat leaves the other households open
  - Create `src/utils/preservation.test.ts` with `preserve:` tests:
    - Seed: boats 04, 07, 12 and 09 deep-equal the baseline; `INITIAL_CASES` deep-equal the baseline except `case-devi.followUpAction` (3.1, 3.2)
    - Assignment property over 200 seeds: for random states and (case, boat) pairs, `assignBoatToCase` is blocked exactly when the case is non-critical and unverified, already picked up, already has the boat, or the boat is busy at another pickup point, with the observed error text. Compare only `ok`, `error`, `cases` and `boats`, because the fix adds a `reason` field (3.3 to 3.6)
    - Boat status property: marking arrived never sets `picked_up` and moves waiting cases to `boat_arrived`; marking available detaches the boat and returns cases with no boats to `confirmed`; ETA is set only when one is passed (3.7, 3.9, 3.10)
    - Pickup oracle property: for random states and pairs where the boat is in `case.assignedBoatIds` and is `arrived`, `stripIds` of the cases and boats from `callConfirmPickup(cases, boats, caseId, boatId, t, boat.crewLead)` equal those from `originalConfirmPersonPickedUp` with the same arguments (3.8)
    - Visibility property: Guest sees no boats, cases, supply depots or standby shelters and only verified roads; Resident sees only owned cases and boats assigned to their pickup point, without crew names or supplies; Admin sees every boat (`state.boats.length`, never a hard-coded 4), case and depot; Guest alerts hold no private rescue alerts; redacted cases hide callback phone and exact address (3.11 to 3.15)
    - Online location changes: compare `originalFamilyLocationChange` with `logic.applyFamilyLocationChange` and `originalMoveCasePin` with `logic.moveCasePin`. Use `{ skip: typeof logic.applyFamilyLocationChange !== 'function' && 'enabled after task 6.1' }` so the test is skipped on unfixed code and runs after the extraction (3.19)
    - Translations: every key in the baseline still has the same value in EN, BM and CN (3.24)
    - Project: `package.json` still defines `test`, `lint`, `build` and `dev`, `dev` still uses `--port=3000`, and `motion`, `autoprefixer` and `esbuild` are still listed (3.26, 3.27)
  - Add `src/utils/preservation.test.ts` to the `package.json` `test` script
  - Run `npx tsx --test src/utils/preservation.test.ts src/utils/rescueLogic.test.ts` on the UNFIXED code. The existing `rescueLogic.test.ts` tests cover 3.16 to 3.18 and stay unchanged here
  - **EXPECTED OUTCOME**: Tests PASS, with the online location test reported as skipped. If a preservation test fails, correct the test to match the observed behavior; do not change production code
  - Mark complete when the tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18, 3.19, 3.24, 3.26, 3.27_

- [x] 3. Fix 1: Rapid-response demo has an assignable boat

  - [x] 3.1 Add Boat 15 to the seed data
    - In `src/data/seedData.ts`, add `boat-15` after `boat-09` (D1): `name: 'Boat 15'`, a fictional crew lead marked "(Demo Crew)", `crewCount: 3`, `status: 'available'`, `assignedPickupPoint: null`, `assignedCaseIds: []`, `position: { lat: 3.0362, lng: 101.5404 }`, `lastUpdatedAt: '2:36 PM'`, no `eta`, `capacityPax: 6`, supplies with life jackets and water, `savedAssignmentNote: 'Waiting at Dewan Seksyen 25 staging jetty. No assignment yet.'`
    - Change `case-devi.followUpAction` to "Assign Boat 15 from the Seksyen 25 staging jetty"
    - Give seed cases no `reportedAtMs` or `verifiedAtMs`
    - In `src/utils/rescueLogic.test.ts`, change the test "Admin sees all 4 boats..." to expect `INITIAL_BOATS.length` (5). Change nothing else in that test
    - Working directory for commands: the worktree
    - _Bug_Condition: isDemoBug(X) where X.kind = 'app_start', X.source IN {'fresh', 'reset'} and no seed boat is available_
    - _Expected_Behavior: expectedBehavior 'app_start' (fresh | reset): boatsWhere(status = 'available') = [boat-15] and assignBoatToCase(seedCases, seedBoats, 'case-devi', 'boat-15', t).ok_
    - _Preservation: boats 04, 07, 12 and 09 unchanged; SK Taman Sri Muda summary unchanged; Boat 15 visible only on the Admin map_
    - _Requirements: 2.1, 3.1, 3.2, 3.11, 3.12, 3.13, 3.26_

  - [x] 3.2 Ignore pre-fix saved state and select the verified request in the rapid-response scenario
    - In `src/App.tsx`, set `STORAGE_KEY` to `flood_rescue_shah_alam_demo_v7` (line 102). On load, remove every other `localStorage` key that starts with `flood_rescue_shah_alam_demo_`
    - In `handleTriggerDemoScenario('rapid_response')`, select `'case-devi'` instead of `'case-kampung'` (line 1420). Leave `case-kampung` in the cases list
    - In `src/components/CoordinatorConsole.tsx` line 102, default `dispatchBoatChoice` to the first boat with `status === 'available'` and no pickup point, falling back to the first boat
    - Leave the other three scenarios and Reset Demo unchanged
    - Run `npx tsx --test --test-name-pattern="^seed:" src/utils/bugCondition.test.ts` and `npx tsx --test src/utils/rescueLogic.test.ts src/utils/preservation.test.ts` in the worktree; all must pass. Run `npm run lint` in the worktree; no error may point at `seedData.ts`, `App.tsx`, `CoordinatorConsole.tsx` or `rescueLogic.test.ts`
    - _Bug_Condition: isDemoBug(X) where X.scenario = 'rapid_response' or X.source = 'stored_pre_fix'_
    - _Expected_Behavior: expectedBehavior 'scenario' (selectedCaseId = 'case-devi', 'case-kampung' IN cases) and 'app_start' stored_pre_fix (loadedState = seedState, v6 key removed)_
    - _Preservation: "Offline continuity", "Data protection" and "Community support" scenarios unchanged; Reset Demo unchanged_
    - _Requirements: 2.2, 2.3, 3.22, 3.23_

- [x] 4. Fix 2: Pickup confirmation requires an arrived assigned boat

  - [x] 4.1 Validate pickups in `confirmPersonPickedUp` and add `getPickupEligibility`
    - In `src/utils/rescueLogic.ts`, add `PickupRejectReason`, `PickupResult` and the exported `ActionOutcome = { ok: boolean; queued?: boolean; error?: string }`
    - Change `confirmPersonPickedUp` to `(cases, boats, caseId, boatId, timestamp): PickupResult`. Remove the `crewLead` parameter and read the crew lead from the boat
    - Run the checks in this order and return the input arrays unchanged on failure: "Rescue request not found."; "Person has already been picked up."; "{Boat} is not assigned to this case." (boat missing or not in `assignedBoatIds`); "An assigned boat must be marked arrived first. {Boat} is {status}."
    - On success, keep the existing update logic unchanged
    - Add `getPickupEligibility(cases, boats, caseId): { arrivedBoats, blocker }` with the blockers "No boat is assigned to this case yet." and "Waiting for an assigned boat to be marked arrived."
    - In `src/utils/rescueLogic.test.ts`, change the test "Boat arrived and Person picked up are separate actions..." to drop the `crewLead` argument and assert `ok`. Append unit tests for each rejection reason and message, for the crew lead read from the boat, and for `getPickupEligibility` with no boats, boats not arrived, one arrived and several arrived
    - Working directory for commands: the worktree
    - _Bug_Condition: isPickupBug(X) where X.kind = 'confirm_pickup' and (X.boatId NOT IN c.assignedBoatIds OR b.status <> 'arrived')_
    - _Expected_Behavior: expectedBehavior 'confirm_pickup': result.ok = false, cases and boats unchanged, error states the reason_
    - _Preservation: a pickup through an assigned arrived boat gives the same cases and boats as the original function (3.8)_
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 3.7, 3.8, 3.26_

  - [x] 4.2 Use the validated pickup in `App.tsx`
    - `handleConfirmPersonPickedUp` (line 905): the online path calls the new `confirmPersonPickedUp`, shows the error on rejection, and returns `ActionOutcome`. Keep the offline path as it is for now; task 6.5 changes it
    - `handleAdvanceBoatStatus` (line 852) returns `ActionOutcome`: `{ ok: true }` online and `{ ok: true, queued: true }` when it queues offline
    - Add `pickupEligibilityFor(caseId)` that calls `getPickupEligibility(cases, boats, caseId)`. Pass it as `getPickupEligibility` to `CoordinatorConsole` and `ShahAlamLeafletMap`. Task 6.6 adds the offline projection
    - Working directory for commands: the worktree
    - _Bug_Condition: isPickupBug(X) where X.kind = 'confirm_pickup' and X.via = 'online'_
    - _Expected_Behavior: expectedBehavior 'confirm_pickup' (rejected with reason, state unchanged)_
    - _Preservation: online actions still apply immediately with the current time (3.19)_
    - _Requirements: 2.4, 2.5, 3.19_

  - [x] 4.3 Add the pickup chooser to the coordinator console
    - In `src/components/CoordinatorConsole.tsx`, add the prop `getPickupEligibility(caseId)`. In the "Person picked up" block (lines 567 to 591): with no arrived boats, disable the button and show the blocker; with one, label the button with that boat; with several, show a select of the arrived boats (default first) and confirm with the selected id
    - Remove the `activeCase.assignedBoatIds[0] ?? boats[0].id` fallback (line 576)
    - Show `ActionOutcome.error` in `dispatchFeedback`
    - Working directory for commands: the worktree
    - _Bug_Condition: isPickupBug(X) where X.kind IN {'confirm_pickup_ui', 'show_pickup_action'} and X.surface = 'console'_
    - _Expected_Behavior: expectedBehavior 'confirm_pickup_ui' (recordedBoat = selected arrived boat, pickedUpBy = its crew lead) and 'show_pickup_action' (disabled with reason)_
    - _Preservation: other console actions unchanged_
    - _Requirements: 2.6, 2.7_

  - [x] 4.4 Add the pickup chooser to the map case card
    - In `src/components/ShahAlamLeafletMap.tsx`, change `onAdminConfirmPickedUp` and `onAdminAdvanceBoatStatus` to return `ActionOutcome`, and add the `getPickupEligibility` prop
    - In `CaseDetailCard` (from line 2162), replace `item.assignedBoatIds[0]` (line 2300) and the `assignedBoatIds.length > 0` check (line 2297) with the same chooser rules as the console. Show the blocker when no assigned boat has arrived, and show the outcome message
    - Run `npx tsx --test --test-name-pattern="^pickup:" src/utils/bugCondition.test.ts` and `npx tsx --test src/utils/rescueLogic.test.ts src/utils/preservation.test.ts` in the worktree; all must pass. Run `npm run lint` in the worktree; no error may point at `rescueLogic.ts`, `App.tsx`, `CoordinatorConsole.tsx`, `ShahAlamLeafletMap.tsx` or `rescueLogic.test.ts`
    - _Bug_Condition: isPickupBug(X) where X.kind IN {'confirm_pickup_ui', 'show_pickup_action'} and X.surface = 'map_popup'_
    - _Expected_Behavior: expectedBehavior 'confirm_pickup_ui' and 'show_pickup_action'_
    - _Preservation: map visibility per account unchanged (3.11 to 3.13)_
    - _Requirements: 2.6, 2.7, 3.11, 3.12, 3.13_

- [x] 5. Fix 3: Drill view shows measured values only

  - [x] 5.1 Add epoch times, drill events and the measured `computeDrillComparison`
    - In `src/types/rescue.ts`, add optional `reportedAtMs` and `verifiedAtMs` to `RescueCase`, and add `DrillEventKind` and `DrillEvent` as written in design Fix Implementation
    - In `src/utils/rescueLogic.ts`, add `reason` codes to `AssignmentResult` (`not_found`, `unverified`, `picked_up`, `duplicate`, `second_destination`). Keep every error string and every other output identical
    - Give `verifyAndMovePickupPin` an optional `atMs` in the payload, and set `verifiedAtMs: c.verifiedAtMs ?? payload.atMs`
    - Add `drillEventForAssignment(result, atMs, caseId, boatId)` and `drillEventForPickup(result, atMs, caseId, boatId)`
    - Replace `computeDrillComparison` with `(cases, events, baseline): DrillComparisonResult` per design item 7: `digitalVerify`, `headline` (`faster`, `slower` or `same`), `digitalAssignments` and `digitalPickups`, each `null` when nothing qualifies. Drop the unused `boats` parameter
    - In `src/utils/rescueLogic.test.ts`, replace "computeDrillComparison passes zero false rescues and zero duplicates" with a not-measured test and a measured-values test. Append unit tests for reason codes, `verifiedAtMs` set once and kept on re-verification, one measured request, the mean over several, slower and equal results, seeded cases without epoch fields excluded, and event counts
    - Working directory for commands: the worktree
    - _Bug_Condition: isDrillBug(X) where X.kind = 'drill_view'_
    - _Expected_Behavior: expectedBehavior 'drill_view': digitalVerify and headline null when no measured case; minutes = round1(mean interval); headline 'faster' only if digital < paper; counts from events or null_
    - _Preservation: assignBoatToCase outcomes and messages unchanged (3.3 to 3.6); baseline bounds unchanged (3.21)_
    - _Requirements: 2.9, 2.10, 2.11, 3.3, 3.4, 3.5, 3.6, 3.21, 3.26_

  - [x] 5.2 Record drill data in `App.tsx`
    - Add `getNow(): { at: string; atMs: number }`, which reads `new Date()` once
    - Add `drillEvents: DrillEvent[]` to `PersistedState`, defaulting to `[]`
    - `handleAssignBoat` appends `drillEventForAssignment(...)`; the online path of `handleConfirmPersonPickedUp` appends `drillEventForPickup(...)`; `handleVerifyPin` passes `atMs`; `handleSubmitRescueCase` sets `reportedAtMs` on the online path
    - `handleResetDemo` also clears `drillEvents`
    - Pass `drillEvents` to `DrillBenchmarkView` in place of `boats`
    - Working directory for commands: the worktree
    - _Bug_Condition: isDrillBug(X): no machine-readable times and no record of blocked attempts_
    - _Expected_Behavior: expectedBehavior 'drill_view' computed from in-session epoch times and recorded events_
    - _Preservation: online actions apply immediately with the current time (3.19); Reset Demo still restores seeds, clears the queue and returns to the Guest map (3.22)_
    - _Requirements: 2.9, 2.11, 3.19, 3.22_

  - [x] 5.3 Show measured values in the Drill view
    - In `src/components/DrillBenchmarkView.tsx`, take `drillEvents` and call `computeDrillComparison(cases, drillEvents, baseline)` (line 43)
    - Header (line 73): "{p}% faster pickup verification than the paper baseline", "{p}% slower than the paper baseline" or "Same verification time as the paper baseline"; when not measured, "Verification time not measured yet" with no percentage
    - Measure 1: "{m} min ({n} request(s) verified in this session)" or "Not measured yet. Submit a rescue request, then verify its pickup point in Boat Dispatch & Pickup Cases."
    - Measure 2, labelled "Duplicate or second-destination assignments blocked": "{blocked} blocked of {attempts} assignment attempts" or "Not measured yet"
    - Measure 3, labelled "Pickup confirmations blocked (no assigned boat marked arrived)": "{blocked} blocked of {attempts} pickup confirmations" or "Not measured yet"
    - Scenario cards: card 1 becomes "Offline Continuity & Waiting to Send" with "reports are kept as Waiting to send" (lines 194, 197); card 2 describes assigning Boat 15 to the verified Jalan Jasa request, checking Kampung Kebun Bunga's owner and follow-up, and the two-destination lock
    - Keep the baseline inputs and their bounds unchanged
    - Run `npx tsx --test --test-name-pattern="^(drill|flow):" src/utils/bugCondition.test.ts` and `npx tsx --test src/utils/rescueLogic.test.ts src/utils/preservation.test.ts` in the worktree; all must pass. Run `npm run lint` in the worktree; no error may point at `rescue.ts`, `rescueLogic.ts`, `App.tsx`, `DrillBenchmarkView.tsx` or `rescueLogic.test.ts`
    - _Bug_Condition: isDrillBug(X) where X.kind = 'drill_view'_
    - _Expected_Behavior: expectedBehavior 'drill_view' (measured or "Not measured yet", never a slower result called faster)_
    - _Preservation: paper baseline editing keeps its bounds and persists across reloads (3.21)_
    - _Requirements: 2.9, 2.10, 2.11, 2.16, 3.21_

- [x] 6. Fix 4: Offline mode detects connectivity and keeps every queued item

  - [x] 6.1 Add queue types, the connectivity rule and shared location functions
    - In `src/types/rescue.ts`, add `createdAtMs?: number` and `error?: string` to `LocalDraftAction`, and extract `QueuedActionType` (`'new_case' | 'update_location' | 'advance_boat' | 'confirm_pickup' | 'report_issue'`). Keep the `syncState` field for type compatibility (D7)
    - In `src/utils/rescueLogic.ts`, add `isAppOnline(browserOnline, demoOffline)` returning `browserOnline && !demoOffline`
    - Add the payload shapes from design item 6 as `type` aliases (an `interface` is not assignable to `Record<string, unknown>`). The `confirm_pickup` payload is `{ caseId; boatId }`, with no crew lead
    - Change `enqueueLocalDraft(drafts, draft, timestamp, atMs?)` to set `createdAtMs` and use ids `draft-${atMs ?? timestamp digits}-${drafts.length + 1}`. The existing test call without `atMs` must keep working
    - Move the online branch of `handleReportLocationChange` into `applyFamilyLocationChange(cases, caseId, landmark, confirmedBy, coords, timestamp)`, and the body of `handleMoveSelectedCasePin` (without the `syncState` write) into `moveCasePin(cases, caseId, point, timestamp)`. Make the online paths in `App.tsx` call them
    - Append unit tests for `isAppOnline` and for unique `enqueueLocalDraft` ids after an item is removed
    - Run `npx tsx --test src/utils/preservation.test.ts` in the worktree. The online location test must now run (not skipped) and pass
    - _Bug_Condition: isOfflineBug(X) where X.kind = 'browser_connectivity'_
    - _Expected_Behavior: expectedBehavior 'browser_connectivity': isOnline = (browserOnline AND NOT demoOffline)_
    - _Preservation: online location changes give the same cases as before (3.19)_
    - _Requirements: 2.12, 3.19_

  - [x] 6.2 Add `applyQueuedActions`, `projectQueuedState` and `getQueuedTargets`
    - In `src/utils/rescueLogic.ts`, add `QueueState`, `QueueSendResult` and `applyQueuedActions(state, drafts, sent)` following the design pseudocode. Process items in array order with `at = item.createdAt` and `atMs = item.createdAtMs ?? sent.atMs`, and handle all five types
    - Reject a `new_case` or `report_issue` whose id already exists with "This request was already sent.". A new case gets `reportedAt = at`, `reportedAtMs = atMs` and the family update "Request made offline at {at}; sent at {sent.at}. Coordinator will review..."
    - Reject a missing case with "Rescue request not found." and a missing boat with "Boat not found."; reject a pickup with the `confirmPersonPickedUp` error
    - Applied items go to `sentIds`. Rejected items go to `remaining` with `error`, in their original order, and are retried on the next send
    - Push a pickup drill event when the item is applied, or when it is rejected and `item.error` is still undefined, so a rejection is counted once
    - `projectQueuedState(state, drafts)` returns `applyQueuedActions(state, drafts, { at: '', atMs: 0 }).state`. `getQueuedTargets(drafts)` returns the case ids and boat ids referenced by the queue
    - Append unit tests for each of the five types, original timestamps, a duplicate `new_case` id, a rejected item kept while later items apply, a rejection event recorded once across two sends, a queued arrival followed by a pickup succeeding, and `projectQueuedState` matching `applyQueuedActions(...).state` without changing its inputs
    - Run `npx tsx --test --test-name-pattern="^offline:" src/utils/bugCondition.test.ts` in the worktree. All `offline:` tests except the translation test must pass; the translation test passes after tasks 6.3 and 6.7
    - _Bug_Condition: isOfflineBug(X) where X.kind = 'queue_send' and X.queue <> [], including isPickupBug with X.via = 'queue_send' (1.8)_
    - _Expected_Behavior: expectedBehavior 'queue_send': original times, queue order, all five types, sentIds and remaining partition the queue, every remaining item has an error, untouched cases unchanged_
    - _Preservation: no change to online behavior; the queue is used only while offline_
    - _Requirements: 2.8, 2.13, 2.14_

  - [x] 6.3 Add the "Waiting to send" translations
    - In `src/i18n/translations.ts`, add to `TranslationDict` and to EN, BM and CN: `waitingToSendLabel`, `waitingToSendCount(n)`, `sendQueuedBtn(n)`, `saveWaitingBtn`, `notSentLabel`, `needsConnectionMsg` and `browserOfflineNote`, with the exact strings in the design table (D4)
    - Reword `offlineMapWarning` in all three languages to the design text. Keep the map-tiles statement (3.20)
    - Keep `sendDraftsBtn` and `localDraftsBtn` until task 6.7 removes their last use. Change no other key (3.24)
    - Run `npx tsx --test src/utils/preservation.test.ts` in the worktree; the translation baseline test must pass
    - Working directory for commands: the worktree
    - _Bug_Condition: isOfflineBug(X) where X.kind = 'queued_label'_
    - _Expected_Behavior: expectedBehavior 'queued_label': {en: 'Waiting to send', bm: 'Menunggu untuk dihantar', cn: '等待发送'}_
    - _Preservation: all other translations unchanged; the offline warning still says map tiles need internet_
    - _Requirements: 2.16, 3.20, 3.24_

  - [x] 6.4 Detect real connectivity in `App.tsx`
    - Add a local `useBrowserOnline()` hook. It starts from `navigator.onLine` (true when `navigator` is undefined) and subscribes to the window `online` and `offline` events in a `useEffect` with cleanup
    - Rename the toggle state (line 213) to `demoOffline` and set `const isOnline = isAppOnline(browserOnline, demoOffline)`. Every existing `isOnline` prop receives this value
    - When the browser connection changes, show "No network connection. New actions wait to send." or "Connection restored · {n} waiting to send." While `browserOnline` is false, show `t.browserOfflineNote` in the menu, because the toggle cannot override it
    - `handleToggleConnectivity` (line 648) flips `demoOffline` and uses "Waiting to send" wording in its toasts instead of "drafts"
    - The `rapid_response` scenario sets `demoOffline` to false; `continuity` sets it to true as before; `handleResetDemo` sets it to false
    - Working directory for commands: the worktree
    - _Bug_Condition: isOfflineBug(X) where X.kind = 'browser_connectivity' (offline at start, offline event or online event)_
    - _Expected_Behavior: expectedBehavior 'browser_connectivity': isOnline = (browserOnline AND NOT demoOffline)_
    - _Preservation: "Offline continuity" still sets the demo toggle offline (3.23); saved data stays readable offline (3.20)_
    - _Requirements: 2.12, 3.20, 3.22, 3.23_

  - [x] 6.5 Apply the offline policy to every write handler in `App.tsx`
    - Crew-side handlers queue while offline using `getNow()` for `createdAt` and `createdAtMs`: `handleAdvanceBoatStatus` (`advance_boat`), `handleReportLocationChange` (`update_location`, `family_change`), `handleMoveSelectedCasePin` (`update_location`, `pin_move`), `handleSubmitRescueCase` (`new_case` holding the full case) and `handleSubmitLocalIssue` (`report_issue` holding the full road or outage object)
    - Offline rescue requests and issue reports are not inserted into `cases`, `roadClosures` or `outages` until sent (D6)
    - Offline `handleConfirmPersonPickedUp` validates with `confirmPersonPickedUp` against `projectQueuedState({ cases, boats, roadClosures, outages }, drafts)` (D5). If valid, it queues `confirm_pickup` `{ caseId, boatId }` and returns `{ ok: true, queued: true }`. If invalid, it queues nothing, returns the error and appends the rejection drill event
    - Remove the optimistic offline pickup-point update and every `syncState: 'local_draft'` write (D7)
    - Desk-only handlers start with an offline guard that shows `t.needsConnectionMsg` and returns early, or returns `{ ok: false, error: t.needsConnectionMsg }` where the handler already returns a result: `handleVerifyPin`, `handleAssignBoat`, `handleConfirmPriority`, `handleAssignOwnerAndFollowUp`, `handleSendFamilyUpdate`, `handleUpdateBoatLocation`, `handleUpdateBoatResources`, `handleUpdatePps`, `handleUpdateOutage`, `handleVerifyIncident`, `handleUpdateIncidentSteps`, `handleCreateTask`, `handleAdvanceTask`, `handleUpdateZoneSeverity`, `handlePublishInstruction`, `handleCloseRoadSegment`, `handleReopenRoadSegment`, `handleApproveOrWithdrawRoute` and `handleCommandPpsStatus`
    - Account, language, layer, search, selection, demo toggle, Reset Demo, baseline edits and scenario buttons stay allowed offline
    - Queued `summary` strings use the design wording, for example `Pickup point change to "{landmark}"`, `{Boat} marked {status}`, `Person picked up: {name}`, `Rescue request for {name}`, `Local issue ({kind}): {location}`
    - Online, every handler behaves as before (3.19)
    - Working directory for commands: the worktree
    - _Bug_Condition: isOfflineBug(X) where X.kind = 'create_report' and X.isOnline = false, or X.kind = 'coordinator_write' and X.isOnline = false_
    - _Expected_Behavior: expectedBehavior 'create_report' (offline report kept out of shared data, shown as Waiting to send) and 'coordinator_write' (crew-side queued, desk-only blocked with "needs a connection")_
    - _Preservation: online actions apply immediately with the current time and are not queued (3.19); role visibility functions untouched (3.11 to 3.15)_
    - _Requirements: 2.15, 2.17, 3.11, 3.12, 3.13, 3.14, 3.15, 3.19_

  - [x] 6.6 Send the queue with `applyQueuedActions` and derive queue views
    - Replace the body of `syncLocalDrafts` (lines 577 to 646): return unless `isOnline`; call `applyQueuedActions({ cases, boats, roadClosures, outages }, drafts, getNow())`; set the four data sets from `res.state`; `setDrafts(res.remaining)`; append `res.events` to `drillEvents`. When items remain, toast "Sent {sent}. {n} not sent, see reasons."
    - Add `discardQueuedItem(id)`, which removes an item only if it has an `error` and only on explicit user action
    - Add `queuedTargets = useMemo(() => getQueuedTargets(drafts))`. Make `pickupEligibilityFor` use `projectQueuedState` while offline and the real state while online. Never display the projected state as current status (D5)
    - `residentBottomBarText` (line 396) shows "{n} request(s) waiting to send" when the resident has no active case but has queued `new_case` items owned by `'resident'`
    - Reset Demo still clears the queue
    - Working directory for commands: the worktree
    - _Bug_Condition: isOfflineBug(X) where X.kind = 'queue_send' and X.queue <> []_
    - _Expected_Behavior: expectedBehavior 'queue_send' and 'confirm_pickup' with X.via = 'queue_send' (rejected item kept with item.error)_
    - _Preservation: Reset Demo restores every seed set, clears the queue and returns to the Guest map (3.22)_
    - _Requirements: 2.8, 2.13, 2.14, 2.15, 3.22_

  - [x] 6.7 Add the Waiting to Send panel and remove the draft labels
    - Create `src/components/WaitingToSendPanel.tsx` with props `lang`, `items`, `isOnline`, `onSend()` and `onDiscard(id)`. It shows `t.waitingToSendCount(n)`, a `t.sendQueuedBtn(n)` button disabled while offline, and one row per item with its summary, original time, and either `t.waitingToSendLabel` or `${t.notSentLabel}: ${item.error}`. Rejected rows get a Remove button
    - In the `App.tsx` menu popover, replace the single drafts button with `<WaitingToSendPanel>`
    - Remove `sendDraftsBtn` and `localDraftsBtn` from `TranslationDict` and from EN, BM and CN (`translations.ts` lines 18 to 19, 144 to 145, 272 to 273, 400 to 401)
    - Run `npx tsx --test --test-name-pattern="^offline:" src/utils/bugCondition.test.ts` in the worktree; all `offline:` tests, including the translation test, must pass
    - _Bug_Condition: isOfflineBug(X) where X.kind = 'queued_label' or X.kind = 'queue_send'_
    - _Expected_Behavior: expectedBehavior 'queued_label' and 'queue_send' (failed items visible with their reason)_
    - _Preservation: translations not changed by this fix stay identical (3.24)_
    - _Requirements: 2.14, 2.16, 3.24_

  - [x] 6.8 Show offline state in the coordinator console
    - In `src/components/CoordinatorConsole.tsx`, when `!isOnline`, show the banner "Offline: verify pin, assign boat, priority, owner, family updates, boat location, supplies, shelters and outages need a connection. Boat status and pickup confirmations are kept as Waiting to send." and disable those desk-only buttons and supply inputs
    - Add props `queuedCaseIds` and `queuedBoatIds`. Replace "Local draft (not sent)" (line 261) with `t.waitingToSendLabel` when the case is in `queuedCaseIds`, and show the same badge on boat cards in `queuedBoatIds`
    - Show "Pickup confirmation waiting to send." when the pickup outcome is `queued` (line 582)
    - Working directory for commands: the worktree
    - _Bug_Condition: isOfflineBug(X) where X.kind = 'coordinator_write' and X.isOnline = false; X.kind = 'queued_label'_
    - _Expected_Behavior: expectedBehavior 'coordinator_write' (desk-only blocked with reason, crew-side queued) and 'queued_label'_
    - _Preservation: online console behavior unchanged (3.19)_
    - _Requirements: 2.16, 2.17, 3.19_

  - [x] 6.9 Show offline state on the map cards
    - In `src/components/ShahAlamLeafletMap.tsx`, pass `isOnline` to `BoatDetailCard` (from line 1964) and `CaseDetailCard`
    - `BoatDetailCard`: disable Assign and "Update boat location" while offline; when a status change is queued, the status button shows "{Boat}: {status} · Waiting to send"
    - `CaseDetailCard`: disable "Confirm priority" while offline with the needs-connection note
    - Change the offline banner only through the updated `t.offlineMapWarning`; keep the banner logic
    - Working directory for commands: the worktree
    - _Bug_Condition: isOfflineBug(X) where X.kind = 'coordinator_write' and X.isOnline = false_
    - _Expected_Behavior: expectedBehavior 'coordinator_write'_
    - _Preservation: map viewing, layers and per-account visibility unchanged (3.11 to 3.13); map tiles warning kept (3.20)_
    - _Requirements: 2.16, 2.17, 3.11, 3.12, 3.13, 3.20_

  - [x] 6.10 Show Waiting to send items to the family and reporter
    - In `src/components/FamilyTrackerCard.tsx`, add props `waitingItems` (queue items with `actorRole !== 'coordinator'`) and `queuedCaseIds`. Show a "Waiting to send" list with summary, original time, or the reason when rejected, including in the no-active-request state
    - Replace " · Local draft" (line 223) with the badge, "Saved offline as a local draft." (line 153) with a "Waiting to send" message, and "Save draft" (line 311) with `t.saveWaitingBtn`
    - In `src/components/ReportModal.tsx` line 700, replace `'Save Local Draft (Offline)'` with `t.saveWaitingBtn`. Line 244 keeps `t.offlineMapWarning`
    - Pass the new props from `App.tsx`
    - Working directory for commands: the worktree
    - _Bug_Condition: isOfflineBug(X) where X.kind = 'create_report' and X.isOnline = false; X.kind = 'queued_label'_
    - _Expected_Behavior: expectedBehavior 'create_report' (shown to the reporter as Waiting to send, not in shared data)_
    - _Preservation: the Puan Aminah tracker summary is unchanged (3.1)_
    - _Requirements: 2.15, 2.16, 3.1_

  - [x] 6.11 Block Command Centre writes while offline
    - In `src/components/CommandCentrePanel.tsx`, add the prop `isOnline`. When offline, show the English banner "Offline: Command Centre changes need a connection." and disable write controls: wrap write-only sections in `<fieldset disabled>`, and use `disabled` on individual buttons where a section also holds navigation such as "Show on map"
    - Pass `isOnline` from `App.tsx`
    - Search `src/` with `Select-String` for `Local draft`, `Draft(s)`, `Saved Locally`, `Draf Disimpan` and `本地草稿`; no user-facing match may remain
    - Run `npx tsx --test src/utils/bugCondition.test.ts src/utils/rescueLogic.test.ts src/utils/preservation.test.ts` in the worktree; all must pass. Run `npm run lint` in the worktree; no error may remain in `src/`
    - _Bug_Condition: isOfflineBug(X) where X.kind = 'coordinator_write' and X.isOnline = false_
    - _Expected_Behavior: expectedBehavior 'coordinator_write' (desk-only blocked, shared state unchanged)_
    - _Preservation: road, route, shelter and hazard functions unchanged (3.16 to 3.18); "Show on map" navigation still works offline_
    - _Requirements: 2.17, 3.16, 3.17, 3.18_

- [ ] 7. Fix 5: Project files match the README

  - [ ] 7.1 Clean up the setup files
    - `package.json`: set `"name": "flood-rescue-map-malaysia"`; remove `@google/genai`, `express`, `dotenv` and `@types/express`; set `"clean": "node -e \"require('fs').rmSync('dist',{recursive:true,force:true})\""`. Keep `motion`, `autoprefixer` and `esbuild`, and keep the `test` script file list from tasks 1 and 2
    - `metadata.json`: set `"majorCapabilities": []`
    - `.env.example` (D10): replace the contents with the three comment lines in design (no variables required; optional `DISABLE_HMR=true`)
    - `vite.config.ts` line 11: use `path.resolve(import.meta.dirname, '.')`. Keep the `DISABLE_HMR` logic and its comments
    - `README.md`: change "a simulated offline mode that saves drafts locally" to describe offline detection plus the demo toggle and the "Waiting to send" queue. Change nothing else in the README
    - Working directory for commands: the worktree
    - _Bug_Condition: isLeftoverBug(X) where X.kind IN {'install', 'read_setup', 'clean', 'build'}_
    - _Expected_Behavior: expectedBehavior 'install' | 'read_setup' | 'clean' | 'build'_
    - _Preservation: browser-only runtime with no backend, API key, crew role or sync (3.25); `dev` still serves on port 3000 (3.27)_
    - _Requirements: 2.19, 2.20, 2.21, 2.22, 3.25, 3.27_

  - [ ] 7.2 Regenerate the npm lockfile
    - Run `npm install` in the worktree (needs network) to prune the removed packages and write `package-lock.json`. Then delete `bun.lock` from the worktree
    - Run `npm ls @google/genai express dotenv @types/express` in the worktree; expect no matches
    - **Fallback if `npm install` fails for lack of network**: keep the `package.json` changes, do not hand-write `package-lock.json`, and do not delete `bun.lock`, so the project keeps a lockfile. Report the blocker and ask the user to run `npm install` in the worktree and then delete `bun.lock`. The `setup:` lockfile test stays failing until then; record that as the only open item
    - Run `npx tsx --test --test-name-pattern="^setup:" tests/projectSetup.test.ts` and `npx tsx --test src/utils/preservation.test.ts` in the worktree; all must pass (except the lockfile test under the fallback)
    - Run `npm run clean` in the worktree and confirm it removes only `dist`
    - _Bug_Condition: isLeftoverBug(X) where X.kind IN {'install', 'clean'}_
    - _Expected_Behavior: package-lock.json present, bun.lock absent, removed packages not installed; clean removes only dist_
    - _Preservation: `test`, `lint`, `build` and `dev` scripts unchanged in behavior (3.26, 3.27)_
    - _Requirements: 2.19, 2.21, 3.26, 3.27_

- [ ] 8. Verify the fix against both properties

  - [ ] 8.1 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Rescue demo rules hold for every buggy input
    - **IMPORTANT**: Re-run the SAME tests from task 1. Do NOT write new tests
    - The tests from task 1 encode the expected behavior; when they pass, the expected behavior is satisfied
    - Run `npx tsx --test src/utils/bugCondition.test.ts tests/projectSetup.test.ts` in the worktree
    - **EXPECTED OUTCOME**: Tests PASS (confirms the bugs are fixed). Under the task 7.2 fallback, only the lockfile `setup:` test may fail
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16, 2.17, 2.19, 2.20, 2.21, 2.22_

  - [ ] 8.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Behavior outside the bug condition is unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2. Do NOT write new tests
    - Run `npx tsx --test src/utils/preservation.test.ts src/utils/rescueLogic.test.ts` in the worktree. The online location test must run, not be skipped
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18, 3.19, 3.24, 3.26, 3.27_

- [~] 9. Checkpoint - Ensure all tests pass
  - Run in the worktree, in this order, and stop on the first failure:
    - `npm run build`: the output must contain no `__dirname` line. The Vite chunk-size warning is acceptable
    - `npm run lint`: no errors
    - `npm test`: all files in the `test` script pass
    - Optional coverage: `npx tsx --test --experimental-test-coverage src/utils/rescueLogic.test.ts src/utils/bugCondition.test.ts src/utils/preservation.test.ts`, targeting at least 80% line coverage of the changed functions in `rescueLogic.ts`
    - `npm ls @google/genai express dotenv @types/express`: no matches
  - Search `src/` with `Select-String` for `Local draft`, `Draft(s)`, `Saved Locally`, `Draf Disimpan` and `本地草稿`; expect no user-facing matches
  - Run `git diff --stat` in the worktree and review each changed file for unintended changes. Confirm no backend, crew role or multi-device sync was added
  - Give the user the manual browser checklist from design "Integration Tests" to run with `npm run dev` in the worktree (port 3000): the four judge scenarios; DevTools Network "Offline" and back without the toggle; labels in EN, BM and CN; desk actions disabled offline in the console, map cards and Command Centre; the pickup chooser with two arrived boats; the Drill view before and after running the drill; a saved v6 state ignored and removed; Reset Demo clearing the queue and drill events; paper baseline bounds and persistence after reload
  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: 2.22, 3.20, 3.21, 3.22, 3.23, 3.25, 3.26, 3.27_

## Notes

- Working directory: every command in this plan runs in the worktree `c:\Users\User\Desktop\projects\Flood Rescue Map Malaysia\.claude\worktrees\flood-rescue-map-malaysia-071029`, not the workspace root.
- Scope: do not add a backend, a crew role or multi-device sync. Do not build the optional offline app shell (2.18, D8). Keep `motion`, `autoprefixer` and `esbuild` in `package.json`.
- Test names in the new test files start with an area tag (`seed:`, `pickup:`, `drill:`, `offline:`, `flow:`, `setup:`, `preserve:`), so one area can be run with `--test-name-pattern`.
- Lint between tasks: after tasks 1 and 2, `npm run lint` reports errors in the new test files for exports that later tasks add. They are expected until task 6.11. Each fix task must leave no lint error in the source files it changed. `tsx` does not type-check, so the tests still run.
- `npm test` fails from task 1 until the fix is complete, because the `test` script includes the exploration tests. That is intended.
- Network: task 7.2 needs registry access for `npm install`. Its fallback keeps `bun.lock` and reports the open item to the user.
- Never start `npm run dev` or any watcher from a task. The browser checklist in task 9 is for the user.

## Task Dependency Graph

The tasks run strictly in order, because most fix tasks edit `src/App.tsx` and the per-area test checks depend on the previous area.

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2"] },
    { "id": 6, "tasks": ["4.3"] },
    { "id": 7, "tasks": ["4.4"] },
    { "id": 8, "tasks": ["5.1"] },
    { "id": 9, "tasks": ["5.2"] },
    { "id": 10, "tasks": ["5.3"] },
    { "id": 11, "tasks": ["6.1"] },
    { "id": 12, "tasks": ["6.2"] },
    { "id": 13, "tasks": ["6.3"] },
    { "id": 14, "tasks": ["6.4"] },
    { "id": 15, "tasks": ["6.5"] },
    { "id": 16, "tasks": ["6.6"] },
    { "id": 17, "tasks": ["6.7"] },
    { "id": 18, "tasks": ["6.8"] },
    { "id": 19, "tasks": ["6.9"] },
    { "id": 20, "tasks": ["6.10"] },
    { "id": 21, "tasks": ["6.11"] },
    { "id": 22, "tasks": ["7.1"] },
    { "id": 23, "tasks": ["7.2"] },
    { "id": 24, "tasks": ["8.1"] },
    { "id": 25, "tasks": ["8.2"] },
    { "id": 26, "tasks": ["9"] }
  ]
}
```
