# Rescue Demo Fixes Bugfix Design

## Overview

The demo currently breaks three concept rules: a case stays open until the crew confirms the individual boarded, every family-facing status carries its last-confirmed time, and unsent offline updates are visibly queued and never silently dropped. The faults sit in five areas (see `bugfix.md` 1.1 to 1.21): the rapid-response demo has no available boat, pickups can be confirmed without an arrived assigned boat, the drill view shows fixed numbers, offline mode ignores real connectivity and mishandles the queue, and AI Studio leftovers contradict the README.

The fix keeps the existing architecture. Domain rules stay as pure, immutable functions in `src/utils/rescueLogic.ts` that return `{ ok, error?, ... }` when an action can be rejected (the `assignBoatToCase` convention). `App.tsx` handlers become thin wrappers that read the clock, check connectivity, call a pure function and store the result. The offline queue gets one pure function, `applyQueuedActions`, which is used both to send the queue and to compute a projected view for crew-side checks while offline. Drill measures are computed from new optional epoch-millisecond fields and a small session event log, so seeded data with fictional times is never measured.

All code paths are in the worktree `c:\Users\User\Desktop\projects\Flood Rescue Map Malaysia\.claude\worktrees\flood-rescue-map-malaysia-071029` (referred to below as the project root).

### Decisions

| # | Decision | Status |
|---|----------|--------|
| D1 | Add seeded boat `boat-15` ("Boat 15"), status `available`, no pickup point, no cases, waiting at the Seksyen 25 staging jetty. Boats 04, 07, 12 and 09 are unchanged. Bump `STORAGE_KEY` to `..._v7`. The rapid-response scenario selects `case-devi`. | Approved by user |
| D2 | Offline: crew-side actions are queued as "Waiting to send" (boat status change, pickup confirmation, pickup point change or pin move, new rescue request, local issue report). Desk-only actions are blocked with a "needs a connection" message (full list in Fix Implementation). | Approved by user; full list decided here |
| D3 | npm is the package manager: generate `package-lock.json`, delete `bun.lock`. | Approved by user |
| D4 | Queue label: EN "Waiting to send", BM "Menunggu untuk dihantar", CN "等待发送". | Approved by user |
| D5 | While offline, "Person picked up" eligibility and queue-time validation use a projected state: the real state with the still-valid queued items applied in order. The send step re-validates every item against the real state in the same order. The projected state is never displayed as current status. | Decided here |
| D6 | Offline rescue requests and local issue reports are held inside the queued item's payload and are not inserted into `cases`, `roadClosures` or `outages` until sent. | Decided here |
| D7 | Queued items never change shared state before they are sent. "Waiting to send" badges are derived from the queue, so the old optimistic offline pickup-point update and the `syncState: 'local_draft'` writes are removed. | Decided here |
| D8 | The optional offline app shell (2.18) is not built. | Decided here |
| D9 | No new test dependency. Property-based tests use a small seeded random generator with `node:test` and `tsx`. | Decided here |
| D10 | Keep `.env.example`, reduced to a comment that no variables are required plus the optional `DISABLE_HMR` flag that `vite.config.ts` actually reads. | Decided here |

Justification for D5: the main offline story is a crew at the pickup point without signal who marks the boat arrived and then confirms boarding. If eligibility used only the real state, the queued arrival would not count and the crew could not record the boarding they just watched. Using the projection lets them queue both actions in order, while the send step still applies the full assigned-and-arrived check (2.8), so the projection cannot bypass the rule. Displaying the projection as current state would show a family "picked up" before anything was sent, so it is used only for checks.

Justification for D6 over "insert with `syncState: 'local_draft'` and filter": the alternative needs filters in `getVisibleMapDataForAccount`, `buildAlertsForAccount`, `CoordinatorConsole`, `CommandCentrePanel`, `workflowCounts` and `handleAccountSwitch`, and any filter that is missed leaks an unsent request to the coordinator. Holding the object in the queue keeps the shared data sets free of unsent items by construction, and the role-visibility functions and their tests (3.11 to 3.15) stay untouched.

Justification for D8: 2.18 is optional. A service worker needs a new plugin dependency and risks serving a stale build to judges. Saved state stays readable while the open tab is offline (3.20), and the map warning keeps stating that tiles need internet.

## Glossary

- **Bug_Condition (C)**: The set of inputs (app start, demo scenario, pickup confirmation, drill view, connectivity change, offline action, queue send, project setup command) that trigger one of the defects 1.1 to 1.21. Formalised as `isBugCondition` below.
- **Property (P)**: The required behavior for inputs in C, formalised as `expectedBehavior` and stated in Property 1.
- **Preservation**: The behaviors listed in `bugfix.md` 3.1 to 3.27 that must be identical before and after the fix for inputs outside C. Stated in Property 2.
- **F / F'**: The original (unfixed) code and the fixed code.
- **Effective connection state (`isOnline`)**: `browserOnline && !demoOffline`. `browserOnline` comes from `navigator.onLine` and the window `online`/`offline` events. `demoOffline` is the existing demo toggle.
- **Queue ("Waiting to send")**: The persisted `drafts: LocalDraftAction[]` array in `App.tsx`. Each item records the action, the display time and epoch time it was taken, and an `error` once a send attempt rejects it. The type keeps its existing name; only user-facing wording changes.
- **Crew-side action**: An action a field crew or family can take without a desk connection. Queued while offline.
- **Desk-only action**: A coordinator or command-centre write that needs the shared system. Blocked while offline.
- **Projected state**: `projectQueuedState(state, drafts)`, the real state with valid queued items applied in order. Used only for offline eligibility checks (D5).
- **Arrived assigned boat**: A boat whose id is in `rescueCase.assignedBoatIds` and whose `status` is `'arrived'`. The only kind of boat that can confirm a pickup.
- **Drill session**: The period since the demo state was created under the current storage key or last reset. Session data (cases with epoch times, drill events) is persisted across reloads and cleared by Reset Demo.
- **Drill event log (`drillEvents`)**: Persisted `DrillEvent[]` recording boat assignment attempts and pickup confirmation attempts with their outcome and epoch time.
- **`confirmPersonPickedUp`**: Function in `src/utils/rescueLogic.ts` (line 498) that marks a case picked up and updates the confirming boat's manifest.
- **`computeDrillComparison`**: Function in `src/utils/rescueLogic.ts` (line 642) that produces the Drill view numbers.
- **`syncLocalDrafts`**: Handler in `src/App.tsx` (line 577) that sends the queue. Replaced by a call to `applyQueuedActions`.

## Bug Details

### Bug Condition

The bug manifests in five groups of inputs. The seed data and scenario code leave the rapid-response demo without an assignable boat. `confirmPersonPickedUp` performs no check on the boat, and its callers pick the first assigned boat. `computeDrillComparison` returns constants and counts impossible states. The offline handlers ignore the browser's connection, restamp queued items, skip two item types, clear the whole queue and apply desk actions as if sent. The setup files still describe a Gemini/Express server.

**Formal Specification:**
```
TYPE Input =
    { kind: 'app_start', source: 'fresh' | 'reset' | 'stored_pre_fix' }
  | { kind: 'scenario', scenario: 'rapid_response' | 'continuity' | 'data_protection' | 'community_support' }
  | { kind: 'confirm_pickup', state, caseId, boatId, via: 'online' | 'queue_send' }
  | { kind: 'confirm_pickup_ui', state, caseId, arrivedBoatId?, surface: 'console' | 'map_popup' }
  | { kind: 'show_pickup_action', state, caseId, surface: 'console' | 'map_popup' }
  | { kind: 'drill_view', cases, events, baseline }
  | { kind: 'browser_connectivity', browserOnline, demoOffline }      -- app start or online/offline event
  | { kind: 'create_report', report: 'rescue_request' | 'local_issue', isOnline }
  | { kind: 'coordinator_write', action, isOnline }
  | { kind: 'queue_send', state, queue }
  | { kind: 'queued_label', lang }
  | { kind: 'install' | 'read_setup' | 'clean' | 'build' }

FUNCTION isBugCondition(X)
  INPUT: X of type Input
  OUTPUT: boolean

  RETURN isDemoBug(X) OR isPickupBug(X) OR isDrillBug(X)
         OR isOfflineBug(X) OR isLeftoverBug(X)
END FUNCTION

FUNCTION isDemoBug(X)                                                     -- 1.1, 1.2, 1.3
  RETURN (X.kind = 'app_start' AND X.source IN {'fresh', 'reset'}
            AND COUNT(b IN seedBoats WHERE b.status = 'available') = 0)
      OR (X.kind = 'scenario' AND X.scenario = 'rapid_response')
      OR (X.kind = 'app_start' AND X.source = 'stored_pre_fix')
END FUNCTION

FUNCTION isPickupBug(X)                                                   -- 1.4 to 1.8
  IF X.kind = 'confirm_pickup' THEN
    c := caseById(X.state, X.caseId)
    b := boatById(X.state, X.boatId)
    RETURN X.boatId NOT IN c.assignedBoatIds          -- 1.5
        OR b.status <> 'arrived'                       -- 1.4, and 1.8 when via = 'queue_send'
  IF X.kind = 'confirm_pickup_ui' THEN                 -- 1.6
    c := caseById(X.state, X.caseId)
    RETURN c.assignedBoatIds = []
        OR (X.arrivedBoatId IS DEFINED AND X.arrivedBoatId <> c.assignedBoatIds[0])
  IF X.kind = 'show_pickup_action' THEN                -- 1.7
    c := caseById(X.state, X.caseId)
    RETURN c.status IN {'assigned', 'boat_arrived'} AND arrivedAssignedBoats(X.state, c) = []
  RETURN false
END FUNCTION

FUNCTION isDrillBug(X)                                                    -- 1.9, 1.10, 1.11
  RETURN X.kind = 'drill_view'                         -- every render shows fixed or structural values
END FUNCTION

FUNCTION isOfflineBug(X)                                                  -- 1.12 to 1.17
  RETURN (X.kind = 'browser_connectivity' AND X.browserOnline = false)   -- 1.12 (offline at start or offline event)
      OR (X.kind = 'browser_connectivity' AND X.browserOnline = true
            AND previousBrowserOnline = false)                           -- 1.12 (online event)
      OR (X.kind = 'queue_send' AND X.queue <> [])                        -- 1.13, 1.14
      OR (X.kind = 'create_report' AND X.isOnline = false)                -- 1.15
      OR (X.kind = 'queued_label')                                        -- 1.16
      OR (X.kind = 'coordinator_write' AND X.isOnline = false)            -- 1.17
END FUNCTION

FUNCTION isLeftoverBug(X)                                                 -- 1.18 to 1.21
  RETURN X.kind IN {'install', 'read_setup', 'clean', 'build'}
END FUNCTION
```

### Expected Behavior Specification

```
FUNCTION expectedBehavior(X, result)
  INPUT: X of type Input where isBugCondition(X), result = output of F'(X)
  OUTPUT: boolean

  CASE X.kind OF
    'app_start' (fresh | reset):                                          -- 2.1
      RETURN boatsWhere(status = 'available') = [boat-15]
         AND boat-15.assignedPickupPoint = null AND boat-15.assignedCaseIds = []
         AND assignBoatToCase(seedCases, seedBoats, 'case-devi', 'boat-15', t).ok
    'app_start' (stored_pre_fix):                                         -- 2.3
      RETURN loadedState = seedState                   -- v6 key is ignored and removed
    'scenario' (rapid_response):                                          -- 2.2
      RETURN account = 'admin' AND view = 'dispatch' AND subTab = 'boats_cases'
         AND selectedCaseId = 'case-devi' AND 'case-kampung' IN cases
    'confirm_pickup':                                                     -- 2.4, 2.5, 2.8
      RETURN result.ok = false
         AND result.cases = X.state.cases AND result.boats = X.state.boats
         AND result.error STATES ('<boat> is not assigned to this case'
                                  OR 'an assigned boat must be marked arrived first')
         AND (X.via = 'queue_send' IMPLIES item kept in queue with item.error = result.error)
    'confirm_pickup_ui':                                                  -- 2.6
      RETURN recordedBoat = X.arrivedBoatId (or the only arrived assigned boat)
         AND case.pickedUpBy = boatById(recordedBoat).crewLead
    'show_pickup_action':                                                 -- 2.7
      RETURN action is hidden or disabled AND reason text is shown
    'drill_view':                                                         -- 2.9, 2.10, 2.11
      M := cases WHERE reportedAtMs AND verifiedAtMs are numbers AND verifiedAtMs >= reportedAtMs
      RETURN (M = [] IMPLIES digitalVerify = null AND headline = null)
         AND (M <> [] IMPLIES digitalVerify.minutes = round1(mean(verifiedAtMs - reportedAtMs) / 60000)
                              AND digitalVerify.requestsMeasured = |M|
                              AND headline.direction = 'faster' ONLY IF digital < paper)
         AND digitalAssignments, digitalPickups are counts over X.events, or null when no such event
    'browser_connectivity':                                               -- 2.12
      RETURN isOnline = (browserOnline AND NOT demoOffline)
    'queue_send':                                                         -- 2.13, 2.14, 2.8
      RETURN every applied item used item.createdAt as its timestamp
         AND items are applied in queue order, all five types handled
         AND sentIds ∪ ids(remaining) = ids(X.queue) AND sentIds ∩ ids(remaining) = ∅
         AND every remaining item has a non-empty error
         AND every case not touched by a sent item is unchanged
    'create_report' (offline):                                            -- 2.15
      RETURN report NOT IN cases, roadClosures, outages, map data or alerts
         AND report IS in the queue AND shown to the reporter as "Waiting to send"
    'queued_label':                                                       -- 2.16
      RETURN label = {en: 'Waiting to send', bm: 'Menunggu untuk dihantar', cn: '等待发送'}[X.lang]
    'coordinator_write' (offline):                                        -- 2.17
      RETURN (X.action IS crew-side AND action is queued as "Waiting to send")
          OR (X.action IS desk-only AND shared state unchanged AND "needs a connection" shown)
    'install' | 'read_setup' | 'clean' | 'build':                         -- 2.19 to 2.22
      RETURN package name = 'flood-rescue-map-malaysia'
         AND no @google/genai, express, dotenv, @types/express AND package-lock.json present, bun.lock absent
         AND metadata.majorCapabilities = [] AND .env.example has no GEMINI_API_KEY or APP_URL
         AND clean removes only dist AND build output has no __dirname warning
  END CASE
END FUNCTION
```

### Examples

- **No available boat (1.1)**: on fresh seed data, assigning Boat 04 to Madam Saraswathy Devi (`case-devi`) returns "Boat 04 is currently assigned to "SK Taman Sri Muda (Covered School Entrance)". A boat cannot be assigned to two active destinations at once." Every other boat fails the same way. Expected: Boat 15 is available, and assigning it to `case-devi` succeeds and sets Boat 15 to `preparing`.
- **Rapid-response scenario (1.2)**: the scenario opens the console with `case-kampung` (unverified) selected. Expected: `case-devi` selected, with `case-kampung` still in the list for owner and follow-up changes.
- **Pickup before arrival (1.4)**: after assigning Boat 15 to `case-devi` (Boat 15 is `preparing`), "Person picked up" sets the case to `picked_up`. Expected: rejected with "An assigned boat must be marked arrived first. Boat 15 is preparing.", case still `assigned`, boats unchanged.
- **Wrong boat (1.5)**: `confirmPersonPickedUp(..., 'case-lim', 'boat-12', ...)` marks Mr Lim picked up although Boat 12 is assigned only to Puan Aminah. Expected: rejected with "Boat 12 is not assigned to this case." and no crew lead recorded.
- **First boat recorded (1.6)**: Puan Aminah has Boats 04, 07 and 12. Boat 07 is marked arrived. The console records Boat 04 and "Sgt. Faizal Hamid". Expected: the console offers Boat 07 (the only arrived assigned boat) and records "Kpl. Suresh Nair (Demo Crew)".
- **Drill numbers (1.9, 1.10)**: on fresh data the Drill view shows "6 min" and "79% faster pickup verification" (28-minute baseline). Expected: "Not measured yet" with a prompt to submit and verify a request, and no percentage.
- **Offline time restamp (1.13)**: offline at 2:40 PM, the crew confirms Puan Aminah boarded Boat 04 (already arrived). Sent at 3:05 PM, the case shows "Person picked up (3:05 PM)". Expected: "Person picked up (2:40 PM)".
- **Offline request shown as received (1.15)**: a rescue request submitted offline appears at once in the coordinator queue and on the map. Expected: it appears only in the reporter's "Waiting to send" list until sent.
- **Edge case, queued arrival then pickup (D5)**: offline, the crew marks Boat 04 arrived and then confirms Puan Aminah. Both are queued, because the projection shows Boat 04 arrived. On send, the arrival is applied first and the pickup passes the real check. If the crew instead confirms a case whose boats are neither arrived nor queued as arrived, the confirmation is rejected immediately with the reason and nothing is queued.
- **Edge case, rejected item kept (2.8, 2.14)**: a queued pickup whose boat was marked available before sending is rejected on send. It stays in the queue as "Not sent: Boat 04 is not assigned to this case." Items after it in the queue are still processed.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Seed summaries: Puan Aminah's tracker shows "3 boats assigned · 2 on the way · 1 preparing", and the SK Taman Sri Muda summary shows 3 boats, 2 on the way, 1 preparing and 2 waiting households (3.1, 3.2). Boat 15 is not assigned to that point, so these do not change.
- Assignment rules and their error text: two active destinations blocked, duplicate assignment blocked, non-critical unverified blocked, critical unverified allowed with owner kept (3.3 to 3.6).
- Boat status transitions: arrived moves waiting cases to "Boat arrived — awaiting boarding confirmation"; available detaches the boat and returns cases with no boats to `confirmed`; ETA shown only when entered (3.7, 3.9, 3.10).
- A pickup confirmed through an assigned arrived boat leaves other households at the point open and returns the boat to available after its last household (3.8). The fixed function must produce the same cases and boats as the original for these inputs.
- Role visibility and privacy for Guest, Resident and Admin maps and alerts (3.11 to 3.15). Boat 15 appears only on the Admin map.
- Road closure, route withdrawal and approval, pump confirmation, PPS closure alerts, hazard severity and overlap detection (3.16 to 3.18).
- Online actions apply immediately with the current time and are not queued (3.19).
- Offline keeps saved cases, boats and assignments readable and states that map tiles need internet (3.20).
- Paper baseline editing keeps its bounds and persists across reloads (3.21).
- Reset Demo restores every seed set, clears the queue and returns to the Guest map; it now also clears the drill event log (3.22).
- "Offline continuity", "Data protection" and "Community support" scenarios switch to the same account, view and dialog (3.23). "Offline continuity" sets the demo toggle offline as before.
- Translations not changed by this fix stay identical (3.24).
- Browser-only runtime with local storage, no backend, no API key, no crew role, no sync, no real emergency contact (3.25).
- `npm test`, `npm run lint`, `npm run build` pass; `npm run dev` serves on port 3000 (3.26, 3.27).

**Scope:**
All inputs that are not in C must be unaffected. This includes:
- Online coordinator actions (verify pin, assign boat, confirm priority, set owner, send family update, boat status, boat location, supplies, PPS, outages, command-centre writes) while the browser and demo toggle are both online.
- Pickup confirmations through an arrived assigned boat while online.
- Map viewing, layer toggles, search, account and language switching, and alert focus in any connection state.
- Drill baseline edits and the three unchanged demo scenarios.
- Reading saved data while offline.

## Hypothesized Root Cause

Each cause below was found by reading the code. The exploration tests in the Testing Strategy confirm them before the fix.

1. **Seed data and scenario wiring (1.1 to 1.3)**
   - `src/data/seedData.ts` lines 582 to 665: all four boats in `INITIAL_BOATS` are `on_the_way` or `preparing` with a pickup point, so `assignBoatToCase` (`rescueLogic.ts` lines 349 to 360) blocks every new destination.
   - `src/App.tsx` line 1420: `handleTriggerDemoScenario('rapid_response')` hard-codes `setSelectedCaseId('case-kampung')`.
   - `src/App.tsx` lines 102 and 146 to 207: `STORAGE_KEY` is still `flood_rescue_shah_alam_demo_v6`, and `loadInitialState` accepts any saved object with `cases` and `boats` arrays.
   - `src/components/CoordinatorConsole.tsx` line 102: the boat picker defaults to `boat-12`, a busy boat.

2. **No pickup validation (1.4 to 1.8)**
   - `src/utils/rescueLogic.ts` lines 498 to 544: `confirmPersonPickedUp` never checks that the boat is assigned to the case or has arrived, and takes `crewLead` from the caller instead of the boat.
   - `src/components/CoordinatorConsole.tsx` line 576 uses `activeCase.assignedBoatIds[0] ?? boats[0].id`; `src/components/ShahAlamLeafletMap.tsx` line 2300 uses `item.assignedBoatIds[0]`.
   - The console shows the action by case status (`assigned` or `boat_arrived`, line 568) and the map popup by `assignedBoatIds.length > 0` (line 2297), not by boat status.
   - `src/App.tsx` lines 619 to 637: the queued `confirm_pickup` is applied without any check.

3. **Drill numbers not measured (1.9 to 1.11)**
   - `src/utils/rescueLogic.ts` lines 642 to 680: `digitalVerifyMinutes = verifiedCount > 0 ? 6 : 9`; duplicates are counted from duplicate ids in `assignedBoatIds` and unverified non-critical dispatches, both of which `assignBoatToCase` prevents; false rescues count `picked_up` cases without `pickedUpAt`, which the app never creates.
   - The data model has only display strings such as `'2:32 PM'` (`getFormattedTime`, `App.tsx` line 127), so no interval can be computed, and there is no record of blocked attempts.
   - `src/components/DrillBenchmarkView.tsx` line 73 always prints "% faster".

4. **Offline handling (1.12 to 1.17)**
   - `src/App.tsx` line 213: `isOnline` is a plain `useState(true)`; nothing reads `navigator.onLine` or listens for `online`/`offline`.
   - `syncLocalDrafts` (`App.tsx` lines 577 to 646) uses `nowTime` for every item, handles only `update_location`, `advance_boat` and `confirm_pickup`, sets every case to `synced` before looping, and ends with `setDrafts([])`.
   - `handleSubmitRescueCase` (line 1217) and `handleSubmitLocalIssue` (line 1340) insert into `cases`, `roadClosures` or `outages` before checking `isOnline`.
   - Labels come from `translations.ts` lines 144 to 145, 272 to 273 and 400 to 401, plus English strings in `CoordinatorConsole.tsx` (261, 582), `FamilyTrackerCard.tsx` (153, 223, 311), `ReportModal.tsx` (700), `DrillBenchmarkView.tsx` (194, 197) and App toasts.
   - Desk handlers (`handleVerifyPin`, `handleAssignBoat`, `handleConfirmPriority`, `handleAssignOwnerAndFollowUp`, `handleSendFamilyUpdate` and others) have no connectivity check. `handleMoveSelectedCasePin` (line 705) sets `local_draft` but never enqueues.

5. **AI Studio leftovers (1.18 to 1.21)**
   - `package.json`: name `react-example`, unused `@google/genai`, `express`, `dotenv`, `@types/express`, and `"clean": "rm -rf dist server.js"` (`rm` also fails under Windows `cmd.exe`, which npm uses on Windows).
   - `metadata.json` declares `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`; `.env.example` asks for `GEMINI_API_KEY` and `APP_URL`.
   - `vite.config.ts` line 11 uses `__dirname`. Running `npx vite build` prints: "`__dirname` (vite.config.ts:11:27). Use `import.meta.dirname` instead".
   - A search of `src/`, `vite.config.ts` and `index.html` finds no import of the four packages.

## Correctness Properties

Property 1: Bug Condition - Rescue demo rules hold for every buggy input

_For any_ input X where isBugCondition(X) returns true, the fixed system SHALL satisfy expectedBehavior(X, F'(X)). In particular: fresh or reset seed data SHALL contain exactly one available boat (Boat 15) that can be assigned to the verified `case-devi`, the rapid-response scenario SHALL select `case-devi`, and pre-fix saved state SHALL NOT be restored; a pickup confirmation through a boat that is not assigned to the case or not arrived SHALL be rejected with its reason and SHALL leave cases and boats unchanged, both online and when sent from the queue; the console and map popup SHALL record the arrived boat the coordinator selects and its crew lead, and SHALL disable the action with a reason when no assigned boat has arrived; the Drill view SHALL show measured values computed from in-session epoch times and recorded events, or "Not measured yet", and SHALL never call a slower result faster; the app SHALL be offline whenever the browser reports no connection or the demo toggle is offline; sending the queue SHALL apply every item type in order with its original time, SHALL mark as sent only processed items, and SHALL keep failed items with their reason; offline reports SHALL stay out of shared data until sent; queued items SHALL be labelled "Waiting to send" / "Menunggu untuk dihantar" / "等待发送"; offline crew-side actions SHALL be queued and desk-only actions SHALL be blocked with a "needs a connection" message; and the project files SHALL match the README with a warning-free `__dirname` build.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16, 2.17, 2.19, 2.20, 2.21, 2.22**

Property 2: Preservation - Behavior outside the bug condition is unchanged

_For any_ input X where isBugCondition(X) returns false, the fixed code SHALL produce the same result as the original code. This covers the seed boat summaries for SK Taman Sri Muda, every `assignBoatToCase` outcome and error message, `advanceBoatStatus` transitions and ETA handling, pickup confirmations through an assigned arrived boat (same cases and boats, ignoring generated message ids), Guest, Resident and Admin map visibility and alerts (with Boat 15 visible only to Admin), road, route, shelter and hazard functions, immediate application of online actions with the current time, offline readability of saved data, baseline editing bounds, Reset Demo, the three unchanged demo scenarios, untouched translations, the browser-only runtime, and the `test`, `lint`, `build` and `dev` commands.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18, 3.19, 3.20, 3.21, 3.22, 3.23, 3.24, 3.25, 3.26, 3.27**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the changes below are grouped by file. Paths are relative to the project root.

**File**: `src/types/rescue.ts`

**Types**: `RescueCase`, `LocalDraftAction`, new `DrillEvent`

**Specific Changes**:
1. **Machine-readable times (optional, so seeded data is excluded)**:
   ```ts
   export interface RescueCase {
     // ...existing fields unchanged
     reportedAtMs?: number;  // epoch ms; set only for requests created in this app
     verifiedAtMs?: number;  // epoch ms of the first in-app pin verification
   }
   ```
2. **Queue item fields**: add `createdAtMs?: number` and `error?: string` to `LocalDraftAction`; extract the payload type union as `QueuedActionType` (`'new_case' | 'update_location' | 'advance_boat' | 'confirm_pickup' | 'report_issue'`). `payload` stays `Record<string, unknown>`.
3. **Drill events**:
   ```ts
   export type DrillEventKind =
     | 'assignment_made'
     | 'assignment_blocked_duplicate'
     | 'assignment_blocked_second_destination'
     | 'assignment_blocked_other'
     | 'pickup_confirmed'
     | 'pickup_rejected_not_assigned'
     | 'pickup_rejected_not_arrived'
     | 'pickup_rejected_other';

   export interface DrillEvent {
     kind: DrillEventKind;
     atMs: number;
     caseId?: string;
     boatId?: string;
   }
   ```
4. **`syncState`**: keep the field for type compatibility with seed data and `RedactedCaseView`. The app stops writing `'local_draft'` (D7).

**File**: `src/data/seedData.ts`

**Constant**: `INITIAL_BOATS`, `INITIAL_CASES`

**Specific Changes**:
1. **Add Boat 15** after `boat-09`: `id: 'boat-15'`, `name: 'Boat 15'`, a fictional crew lead marked "(Demo Crew)", `crewCount: 3`, `status: 'available'`, `assignedPickupPoint: null`, `assignedCaseIds: []`, `position: { lat: 3.0362, lng: 101.5404 }` (beside the 3.0358, 101.5408 staging point that `advanceBoatStatus` uses, so markers do not overlap when another boat returns), `lastUpdatedAt: '2:36 PM'`, no `eta`, `capacityPax: 6`, supplies with life jackets and water, `savedAssignmentNote: 'Waiting at Dewan Seksyen 25 staging jetty. No assignment yet.'`.
2. **Update `case-devi.followUpAction`** to "Assign Boat 15 from the Seksyen 25 staging jetty", so the seed text does not contradict the new boat.
3. Seed cases get no `reportedAtMs` or `verifiedAtMs`.

**File**: `src/utils/rescueLogic.ts`

**Functions**: `assignBoatToCase`, `verifyAndMovePickupPin`, `confirmPersonPickedUp`, `enqueueLocalDraft`, `computeDrillComparison`, plus new pure functions

**Specific Changes**:
1. **Assignment reason codes**: add `reason?: 'not_found' | 'unverified' | 'picked_up' | 'duplicate' | 'second_destination'` to `AssignmentResult`. Error strings and all other outputs stay identical (Property 2).
2. **Pin verification time**: `verifyAndMovePickupPin` payload gains optional `atMs?: number`; the case gets `verifiedAtMs: c.verifiedAtMs ?? payload.atMs`, so only the first in-app verification is measured. Other outputs unchanged.
3. **Validated pickup confirmation**:
   ```ts
   export type PickupRejectReason =
     'case_not_found' | 'already_picked_up' | 'boat_not_assigned' | 'boat_not_arrived';
   export interface PickupResult {
     ok: boolean; error?: string; reason?: PickupRejectReason;
     cases: RescueCase[]; boats: BoatUnit[];
   }
   export function confirmPersonPickedUp(
     cases: RescueCase[], boats: BoatUnit[], caseId: string, boatId: string, timestamp: string
   ): PickupResult
   ```
   Checks run in this order and return the input arrays unchanged on failure: case exists ("Rescue request not found."); case not `picked_up` ("Person has already been picked up."); boat exists and `caseId`'s `assignedBoatIds` includes it ("{Boat} is not assigned to this case."); `boat.status === 'arrived'` ("An assigned boat must be marked arrived first. {Boat} is {status}."). On success the existing update logic runs unchanged, with `crewLead` read from the boat. The `crewLead` parameter is removed so a caller cannot record the wrong crew (1.5).
4. **Shared eligibility for both UIs**:
   ```ts
   export interface PickupEligibility { arrivedBoats: BoatUnit[]; blocker: string | null }
   export function getPickupEligibility(cases: RescueCase[], boats: BoatUnit[], caseId: string): PickupEligibility
   ```
   Blockers: "No boat is assigned to this case yet." or "Waiting for an assigned boat to be marked arrived." (2.7).
5. **Extract online location changes into pure functions** so online handlers and the queue share one implementation (3.19 parity): `applyFamilyLocationChange(cases, caseId, landmark, confirmedBy, coords, timestamp)` (body moved from the online branch of `handleReportLocationChange`, including its family update message) and `moveCasePin(cases, caseId, point, timestamp)` (body of `handleMoveSelectedCasePin` without the `syncState` write).
6. **Queue helpers**:
   - `enqueueLocalDraft(drafts, draft, timestamp, atMs?)` sets `createdAtMs: atMs` and ids `draft-${atMs ?? timestamp-digits}-${drafts.length + 1}`. The existing test call without `atMs` keeps working. Ids must stay unique now that failed items remain in the queue.
   - Payload shapes, declared with `type` aliases (an `interface` is not assignable to `Record<string, unknown>`):
     `new_case: { rescueCase: RescueCase }`; `report_issue: { issueKind: 'road'; roadClosure: RoadClosure } | { issueKind: 'outage'; outage: PowerOutageZone }`; `update_location: { caseId; mode: 'family_change' | 'pin_move'; pickupLandmark; confirmedBy; coords? }`; `advance_boat: { boatId; nextStatus; eta? }`; `confirm_pickup: { caseId; boatId }`.
   - `applyQueuedActions` and `projectQueuedState`:
     ```ts
     export interface QueueState {
       cases: RescueCase[]; boats: BoatUnit[];
       roadClosures: RoadClosure[]; outages: PowerOutageZone[];
     }
     export interface QueueSendResult {
       state: QueueState;
       sentIds: string[];
       remaining: LocalDraftAction[];   // not applied, original order, each with error
       events: DrillEvent[];
     }
     export function applyQueuedActions(
       state: QueueState, drafts: LocalDraftAction[], sent: { at: string; atMs: number }
     ): QueueSendResult
     export function projectQueuedState(state: QueueState, drafts: LocalDraftAction[]): QueueState
     export function getQueuedTargets(drafts: LocalDraftAction[]): { caseIds: Set<string>; boatIds: Set<string> }
     ```
     ```
     FUNCTION applyQueuedActions(state, drafts, sent)
       s := state; sentIds := []; remaining := []; events := []
       FOR item IN drafts DO                         -- array order = order the actions were taken
         at := item.createdAt; atMs := item.createdAtMs ?? sent.atMs
         CASE item.payloadType OF
           'new_case':       reject 'This request was already sent.' IF id exists in s.cases
                             ELSE prepend rescueCase (reportedAt = at, reportedAtMs = atMs) with a family
                             update "Request made offline at {at}; sent at {sent.at}. Coordinator will review..."
           'report_issue':   reject IF id exists ELSE prepend to s.roadClosures or s.outages
           'update_location':reject 'Rescue request not found.' IF case missing
                             ELSE applyFamilyLocationChange or moveCasePin with timestamp = at
           'advance_boat':   reject 'Boat not found.' IF boat missing
                             ELSE advanceBoatStatus(s.boats, s.cases, boatId, nextStatus, at, eta)
           'confirm_pickup': r := confirmPersonPickedUp(s.cases, s.boats, caseId, boatId, at)
                             event := drillEventForPickup(r, atMs, caseId, boatId)
                             reject r.error IF NOT r.ok
         IF applied THEN update s; sentIds.push(item.id)
         ELSE remaining.push({ ...item, error })
         IF event AND (applied OR item.error IS undefined) THEN events.push(event)  -- count a rejection once
       RETURN { state: s, sentIds, remaining, events }
     END FUNCTION
     ```
     `projectQueuedState` returns `applyQueuedActions(state, drafts, { at: '', atMs: 0 }).state` and discards events. Rejected items are retried on every send, because the state may have changed since.
7. **Drill measures from recorded data (2.9 to 2.11)**:
   ```ts
   export interface DrillComparisonResult {
     paperVerifyMinutes: number;
     digitalVerify: { minutes: number; requestsMeasured: number } | null;
     headline: { direction: 'faster' | 'slower' | 'same'; percent: number } | null;
     paperDuplicateAssignments: number;
     digitalAssignments: { blocked: number; attempts: number } | null;
     paperFalseRescuedCount: number;
     digitalPickups: { blocked: number; attempts: number } | null;
   }
   export function computeDrillComparison(
     cases: RescueCase[], events: DrillEvent[], baseline: DrillBaseline
   ): DrillComparisonResult
   ```
   - `digitalVerify`: over cases with numeric `reportedAtMs` and `verifiedAtMs` where `verifiedAtMs >= reportedAtMs`; `minutes` is the mean interval rounded to one decimal; `null` when none.
   - `headline`: `null` when `digitalVerify` is `null`; otherwise `percent = round(|paper - digital| / paper * 100)`, with direction `same` when `percent` is 0, `faster` when digital is lower, `slower` when higher.
   - `digitalAssignments`: `blocked` counts `assignment_blocked_duplicate` and `assignment_blocked_second_destination`; `attempts` counts every `assignment_*` event; `null` when there are none.
   - `digitalPickups`: `blocked` counts `pickup_rejected_not_assigned` and `pickup_rejected_not_arrived`; `attempts` counts every `pickup_*` event; `null` when there are none.
   - The unused `boats` parameter is dropped.
   - Helpers `drillEventForAssignment(result, atMs, caseId, boatId)` and `drillEventForPickup(result, atMs, caseId, boatId)` map results and reason codes to `DrillEvent`.
8. **Connectivity rule**: `isAppOnline(browserOnline: boolean, demoOffline: boolean): boolean` returns `browserOnline && !demoOffline`.

**File**: `src/App.tsx`

**Functions**: `loadInitialState`, connectivity state, all write handlers, `syncLocalDrafts`, `handleResetDemo`, `handleTriggerDemoScenario`, menu popover JSX

**Specific Changes**:
1. **Storage**: `STORAGE_KEY = 'flood_rescue_shah_alam_demo_v7'`. On load, remove other `localStorage` keys starting with `flood_rescue_shah_alam_demo_` so older fictional personal data is not left behind. Add `drillEvents: DrillEvent[]` to `PersistedState`, defaulting to `[]`.
2. **Clock**: add `getNow(): { at: string; atMs: number }` that reads `new Date()` once, so display time and epoch time always match.
3. **Real connectivity (2.12)**: a local `useBrowserOnline()` hook initialises from `navigator.onLine` (true when `navigator` is undefined) and subscribes to window `online`/`offline` in a `useEffect` with cleanup. Rename the toggle state to `demoOffline`. `const isOnline = isAppOnline(browserOnline, demoOffline)` and every existing `isOnline` prop receives this value. When the browser connection changes, show a toast ("No network connection. New actions wait to send." / "Connection restored · {n} waiting to send."). The menu shows a "no network detected" note while `browserOnline` is false, because the toggle cannot override it. Note that `navigator.onLine === true` does not guarantee internet access; `false` reliably means offline.
4. **Offline policy**. Crew-side handlers queue while offline; desk-only handlers start with a guard that returns early (or `{ ok: false, error: t.needsConnectionMsg }` where the handler already returns a result) and shows the message.

   | Handler (App.tsx) | Called from | Offline behavior |
   |---|---|---|
   | `handleAdvanceBoatStatus` | console boat card, map boat card | Queue `advance_boat`; returns `{ ok: true, queued: true }` |
   | `handleConfirmPersonPickedUp` | console, map case card | Validate against `projectQueuedState`; if valid queue `confirm_pickup`, else return the error and record the rejection event |
   | `handleReportLocationChange` | FamilyTrackerCard | Queue `update_location` (`family_change`); no optimistic change |
   | `handleMoveSelectedCasePin` | map pin move and marker drag (Admin, Resident) | Queue `update_location` (`pin_move`) |
   | `handleSubmitRescueCase` | ReportModal | Queue `new_case` with the full case; not inserted |
   | `handleSubmitLocalIssue` | ReportModal | Queue `report_issue` with the full road or outage object; not inserted |
   | `handleVerifyPin`, `handleAssignBoat`, `handleConfirmPriority`, `handleAssignOwnerAndFollowUp`, `handleSendFamilyUpdate` | console, map cards | Block |
   | `handleUpdateBoatLocation`, `handleUpdateBoatResources` (supplies, ETA) | console, map boat move | Block |
   | `handleUpdatePps`, `handleUpdateOutage` | console | Block |
   | `handleVerifyIncident`, `handleUpdateIncidentSteps`, `handleCreateTask`, `handleAdvanceTask`, `handleUpdateZoneSeverity`, `handlePublishInstruction`, `handleCloseRoadSegment`, `handleReopenRoadSegment`, `handleApproveOrWithdrawRoute`, `handleCommandPpsStatus` | CommandCentrePanel | Block |
   | Account, language, layers, search, selection, demo toggle, Reset Demo, baseline edits, scenario buttons | various | Allowed (not shared writes) |

   Online, every handler behaves as today (3.19); the only additions are drill events and epoch fields.
5. **Return values**: `handleConfirmPersonPickedUp` and `handleAdvanceBoatStatus` return `ActionOutcome = { ok: boolean; queued?: boolean; error?: string }` (exported from `rescueLogic.ts`) so the console and map can show "Waiting to send" or the rejection reason. Online pickup uses the new `confirmPersonPickedUp` and records `pickup_confirmed` or a rejection event.
6. **Drill events**: `handleAssignBoat` appends `drillEventForAssignment(res, atMs, caseId, boatId)`; pickup handlers append `drillEventForPickup(...)`. `handleVerifyPin` passes `atMs`. `handleSubmitRescueCase` sets `reportedAtMs`.
7. **Send the queue (2.13, 2.14)**: `syncLocalDrafts` becomes: guard `isOnline`; `res = applyQueuedActions({ cases, boats, roadClosures, outages }, drafts, getNow())`; set the four data sets from `res.state`; `setDrafts(res.remaining)`; append `res.events`; toast "Sent {sent}. {n} not sent, see reasons." when anything remains. Add `discardQueuedItem(id)` for rejected items only (explicit user action).
8. **Derived queue views**: `queuedTargets = useMemo(() => getQueuedTargets(drafts))`; `pickupEligibilityFor(caseId)` uses `projectQueuedState` while offline and the real state while online. Pass these to the console, map and family tracker.
9. **Resident with only a queued request**: `residentBottomBarText` shows "{n} request(s) waiting to send" when the resident has no active case but has queued `new_case` items owned by `'resident'`.
10. **Scenarios**: `rapid_response` selects `'case-devi'` and sets `demoOffline` to false; `continuity` sets `demoOffline` to true. Other scenarios unchanged.
11. **Reset Demo**: also `setDrillEvents([])` and `setDemoOffline(false)` (the existing `setIsOnline(true)`).
12. **Wording**: replace "draft" wording in toasts and queued `summary` strings (for example `Pickup point change to "{landmark}"`, `{Boat} marked {status}`, `Person picked up: {name}`, `Rescue request for {name}`, `Local issue ({kind}): {location}`).
13. **Menu popover**: replace the single drafts button with `<WaitingToSendPanel>`.

**File**: `src/components/WaitingToSendPanel.tsx` (new)

**Component**: `WaitingToSendPanel`

**Specific Changes**:
1. Props: `lang`, `items: LocalDraftAction[]`, `isOnline`, `onSend()`, `onDiscard(id)`.
2. Renders the count (`t.waitingToSendCount(n)`), a send button (`t.sendQueuedBtn(n)`, disabled offline), and one row per item with summary, original time, and either `t.waitingToSendLabel` or `${t.notSentLabel}: ${item.error}`. Rejected rows get a Remove button.

**File**: `src/components/CoordinatorConsole.tsx`

**Component**: `CoordinatorConsole`

**Specific Changes**:
1. **Default boat choice**: initialise `dispatchBoatChoice` to the first boat with `status === 'available'` and no pickup point, falling back to the first boat (line 102).
2. **Pickup chooser (2.6, 2.7)**: new prop `getPickupEligibility(caseId)`. In the "Person picked up" block (lines 567 to 591): with no arrived boats, disable the button and show `blocker`; with one, label the button with that boat; with several, show a select of arrived boats (default first) and confirm with the selected id. Show `ActionOutcome.error` or "Pickup confirmation waiting to send." in `dispatchFeedback`. Remove the `boats[0].id` fallback.
3. **Offline (2.17)**: when `!isOnline`, show a banner "Offline: verify pin, assign boat, priority, owner, family updates, boat location, supplies, shelters and outages need a connection. Boat status and pickup confirmations are kept as Waiting to send." and disable those desk-only controls (buttons and supply inputs).
4. **Labels**: replace "Local draft (not sent)" (line 261) with `t.waitingToSendLabel` when `queuedCaseIds.has(c.id)`; show the same badge on boat cards in `queuedBoatIds`.

**File**: `src/components/ShahAlamLeafletMap.tsx`

**Components**: `ShahAlamLeafletMap`, `BoatDetailCard`, `CaseDetailCard`

**Specific Changes**:
1. Change the prop types `onAdminConfirmPickedUp` and `onAdminAdvanceBoatStatus` to return `ActionOutcome`; add `getPickupEligibility` and pass `isOnline` to both cards.
2. `CaseDetailCard` (from line 2162): replace `item.assignedBoatIds[0]` (line 2300) with the same chooser rules as the console; show the blocker text when no arrived boat; show the outcome message. Disable "Confirm priority" offline with the needs-connection note.
3. `BoatDetailCard` (from line 1964): disable Assign and "Update boat location" offline; status buttons show "{Boat}: {status} · Waiting to send" when `queued`.
4. Change the offline banner text through the updated `t.offlineMapWarning` only; the banner logic stays the same.

**File**: `src/components/FamilyTrackerCard.tsx`

**Component**: `FamilyTrackerCard`

**Specific Changes**:
1. New props `waitingItems: LocalDraftAction[]` (queue items with `actorRole !== 'coordinator'`) and `queuedCaseIds`.
2. Show a "Waiting to send" list (summary, original time, or reason if rejected), including in the no-active-request state, so an offline request is visible to the family (2.15).
3. Replace " · Local draft" (line 223) with the badge, "Saved offline as a local draft." (line 153) with a "Waiting to send" message, and "Save draft" (line 311) with `t.saveWaitingBtn`.

**File**: `src/components/CommandCentrePanel.tsx`

**Component**: `CommandCentrePanel`

**Specific Changes**:
1. New prop `isOnline`. When offline, show an English banner (the panel is English only) "Offline: Command Centre changes need a connection." and disable the write controls (wrap write-only sections in `<fieldset disabled>`; use `disabled` on individual buttons where a section also holds navigation such as "Show on map").

**File**: `src/components/DrillBenchmarkView.tsx`

**Component**: `DrillBenchmarkView`

**Specific Changes**:
1. Props: replace `boats` with `drillEvents`; call `computeDrillComparison(cases, drillEvents, baseline)` (line 43).
2. Header (line 73): measured shows "{p}% faster pickup verification than the paper baseline", "{p}% slower than the paper baseline" or "Same verification time as the paper baseline"; not measured shows "Verification time not measured yet" with no percentage.
3. Measure 1 cell: "{m} min ({n} request(s) verified in this session)" or "Not measured yet. Submit a rescue request, then verify its pickup point in Boat Dispatch & Pickup Cases."
4. Measure 2 cell: "{blocked} blocked of {attempts} assignment attempts", labelled "Duplicate or second-destination assignments blocked", or "Not measured yet".
5. Measure 3 cell: "{blocked} blocked of {attempts} pickup confirmations", labelled "Pickup confirmations blocked (no assigned boat marked arrived)", or "Not measured yet".
6. Scenario text: card 1 becomes "Offline Continuity & Waiting to Send" with "reports are kept as Waiting to send"; card 2 describes assigning Boat 15 to the verified Jalan Jasa request, checking Kampung Kebun Bunga's owner and follow-up, and the two-destination lock. Baseline inputs and bounds stay unchanged (3.21).

**File**: `src/components/ReportModal.tsx`

**Specific Changes**:
1. Line 700: replace `'Save Local Draft (Offline)'` with `t.saveWaitingBtn`. Line 244 keeps using `t.offlineMapWarning`.

**File**: `src/i18n/translations.ts`

**Specific Changes**:
1. Add to `TranslationDict` and all three languages:

   | Key | EN | BM | CN |
   |---|---|---|---|
   | `waitingToSendLabel` | Waiting to send | Menunggu untuk dihantar | 等待发送 |
   | `waitingToSendCount(n)` | {n} waiting to send | {n} menunggu untuk dihantar | {n} 条等待发送 |
   | `sendQueuedBtn(n)` | Send {n} waiting item(s) | Hantar {n} item yang menunggu | 发送 {n} 条等待发送的项目 |
   | `saveWaitingBtn` | Save · Waiting to send | Simpan · Menunggu untuk dihantar | 保存 · 等待发送 |
   | `notSentLabel` | Not sent | Tidak dihantar | 未发送 |
   | `needsConnectionMsg` | Needs a connection. Not saved while offline. | Perlu sambungan internet. Tidak disimpan semasa luar talian. | 需要网络连接。离线时不会保存。 |
   | `browserOfflineNote` | No network connection detected. | Tiada sambungan rangkaian dikesan. | 未检测到网络连接。 |

2. Remove `sendDraftsBtn` and `localDraftsBtn` (lines 18 to 19, 144 to 145, 272 to 273, 400 to 401).
3. Reword `offlineMapWarning` in all three languages so it keeps the map-tiles statement (3.20) and replaces "drafts": EN "No internet: Map tiles need internet. Your saved rescue list stays readable, and new actions are kept as Waiting to send." BM "Tiada internet: Peta memerlukan internet. Senarai kes anda masih boleh dibaca, dan tindakan baharu disimpan sebagai Menunggu untuk dihantar." CN "当前离线：地图底图需要网络加载。已保存的求助信息仍可查看，新的操作将显示为等待发送。"
4. All other keys stay unchanged (3.24).

**File**: project setup (`package.json`, `package-lock.json`, `bun.lock`, `metadata.json`, `.env.example`, `vite.config.ts`, `README.md`)

**Specific Changes**:
1. **`package.json`**: `"name": "flood-rescue-map-malaysia"`; remove `@google/genai`, `express`, `dotenv` and `@types/express`; `"clean": "node -e \"require('fs').rmSync('dist',{recursive:true,force:true})\""` (checked on Node 24 under PowerShell; `node -e` runs CommonJS by default, so `require` works despite `"type": "module"`); extend `"test"` to list the new test files explicitly (Node 20 has no glob support in `--test`).
2. **Lockfile**: run `npm install` (network required) to prune removed packages and write `package-lock.json`; delete `bun.lock`; check with `npm ls @google/genai express dotenv @types/express` (expect empty).
3. **`metadata.json`**: `"majorCapabilities": []`.
4. **`.env.example`** (D10):
   ```
   # No environment variables are required to run this demo.
   # Optional: set DISABLE_HMR=true to turn off Vite hot reload and file watching.
   # DISABLE_HMR=true
   ```
5. **`vite.config.ts`**: `path.resolve(import.meta.dirname, '.')`. Node 20.11+ supports it (README requires 20.19+), and the installed `@types/node` 22.20.5 declares `ImportMeta.dirname`. The `DISABLE_HMR` logic and its comments stay unchanged.
6. **`README.md`**: change "a simulated offline mode that saves drafts locally" to describe offline detection plus the demo toggle and the "Waiting to send" queue. No other README change.

Not changed: `motion`, `autoprefixer` and `esbuild` also have no imports in `src/`, but 2.19 lists only the four packages above, so they stay. They are candidates for a separate cleanup if the user wants it. The Vite chunk-size warning is unrelated to 2.22 and stays.

**File**: tests (`src/utils/rescueLogic.test.ts`, new `src/utils/testSupport.ts`, `src/utils/bugCondition.test.ts`, `src/utils/preservation.test.ts`, `tests/projectSetup.test.ts`)

**Specific Changes**:
1. Update existing tests only where behavior changes on purpose (3.26): "Admin sees all 4 boats" becomes 5; the arrived-then-picked-up test drops the `crewLead` argument and asserts `ok`; "computeDrillComparison passes zero false rescues and zero duplicates" becomes a not-measured test plus a measured-values test.
2. Add the new files described in the Testing Strategy.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior. Following the TDD workflow, the exploration and preservation tests are written and run before any production change. Exploration tests must fail on unfixed code and preservation tests must pass on it. After the fix both sets must pass. All tests use the existing `node:test` + `tsx` setup.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write `src/utils/bugCondition.test.ts` and `tests/projectSetup.test.ts` against existing exports and files, asserting the fixed behavior. Run them with `npx tsx --test <file>` on the UNFIXED code (tsx does not type-check, so calls written for the new signatures still run). Bugs that live inside `App.tsx` state handling have no test harness (no React Testing Library, by choice), so they are reproduced manually on unfixed code with `npm run dev`, and the fix moves their logic into pure functions that get automated fix-checking tests.

**Test Cases**:
1. **Seed boat availability (1.1)**: assert exactly one seed boat is `available` with no point and no cases, and `assignBoatToCase(INITIAL_CASES, INITIAL_BOATS, 'case-devi', 'boat-15', '2:38 PM').ok` (will fail on unfixed code)
2. **Pickup before arrival (1.4)**: assign Boat 15 to `case-devi` using a test copy of the boats with Boat 15 added, then `confirmPersonPickedUp(..., 'case-devi', 'boat-15', '2:40 PM')`; assert `ok === false` and the case is not `picked_up` (will fail on unfixed code)
3. **Unassigned boat (1.5)**: `confirmPersonPickedUp(arrivedState, 'case-lim', 'boat-12', ...)` after Boat 12 is marked arrived; assert rejection and no `pickedUpBy` (will fail on unfixed code)
4. **Drill constants (1.9 to 1.11)**: `computeDrillComparison(INITIAL_CASES, [], INITIAL_DRILL_BASELINE)`; assert `digitalVerify === null`, `headline === null`, `digitalAssignments === null`, `digitalPickups === null`; log the unfixed output (expected counterexample: 6 min, 79%, 0, 0) (will fail on unfixed code)
5. **Project leftovers (1.18 to 1.21)**: read `package.json`, `metadata.json`, `.env.example`, `vite.config.ts` and the file list; assert name, absent packages, `package-lock.json` present and `bun.lock` absent, empty capabilities, no API key or URL, clean script without `server.js` and `rm -rf`, and no `__dirname` in `vite.config.ts` (will fail on unfixed code)
6. **Manual, App-level (1.2, 1.3, 1.6, 1.7, 1.12 to 1.17)** on unfixed code: run "Rapid response" and note the selected case; load with a saved v6 state; mark only Boat 07 arrived for Puan Aminah and confirm from the console, then note Boat 04's crew recorded; check the button with no arrived boat; set DevTools Network to Offline and note the app still says online; queue a pickup at one minute and send at a later minute; submit a rescue request and a road issue offline and check the coordinator console; verify a pin and assign a boat offline (will reproduce on unfixed code)
7. **Edge case, queue type coverage (1.14)**: manual, queue a rescue request and an issue offline, send, and confirm they are dropped while the queue is cleared (may be masked on unfixed code because 1.15 already inserted them)

**Expected Counterexamples**:
- `confirmPersonPickedUp` returns a `picked_up` case for a `preparing` boat and for an unassigned boat.
- `computeDrillComparison` returns 6 minutes and 79% with no recorded event.
- `INITIAL_BOATS` has zero available boats.
- Possible causes: missing validation in the pure function, caller-chosen boat and crew, constants in place of measurements, missing machine-readable time, connectivity state that ignores the browser, blanket queue clearing.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := F'(X)
  ASSERT expectedBehavior(X, result)
END FOR

-- concrete instances run in bugCondition.test.ts after the fix
FOR ALL (state, caseId, boatId) WHERE boatId NOT IN case.assignedBoatIds OR boat.status <> 'arrived' DO
  r := confirmPersonPickedUp(state.cases, state.boats, caseId, boatId, t)
  ASSERT r.ok = false AND r.cases = state.cases AND r.boats = state.boats AND r.error <> ''
END FOR

FOR ALL (state, queue, sentAt) DO
  r := applyQueuedActions(state, queue, sentAt)
  ASSERT ids(r.sentIds) ∪ ids(r.remaining) = ids(queue) AND disjoint
  ASSERT order(r.remaining) = order in queue AND every r.remaining.error <> ''
  ASSERT every applied pickup has pickedUpAt = item.createdAt
  ASSERT cases not referenced by sent items are deep-equal to state.cases
END FOR

FOR ALL (cases, events, baseline) DO
  d := computeDrillComparison(cases, events, baseline)
  ASSERT (measured(cases) = [] ⇔ d.digitalVerify = null ∧ d.headline = null)
  ASSERT d.headline.direction = 'faster' ⇒ d.digitalVerify.minutes < baseline.paperVerifyMinutes
END FOR

FOR ALL (browserOnline, demoOffline) IN {true,false}² DO
  ASSERT isAppOnline(browserOnline, demoOffline) = browserOnline AND NOT demoOffline
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR

-- pickup preservation uses a frozen copy of the original confirmPersonPickedUp as oracle
FOR ALL (state, caseId, boatId) WHERE boatId IN case.assignedBoatIds AND boat.status = 'arrived' DO
  ASSERT stripIds(originalConfirm(state, caseId, boatId, t, boat.crewLead))
       = stripIds(confirmPersonPickedUp(state.cases, state.boats, caseId, boatId, t))
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

Generators live in `src/utils/testSupport.ts`: a seeded `mulberry32` PRNG, `pick`, and `randomOnlineSequence(seed, steps)`, which starts from seed data and applies random valid online actions (assign, advance status, verify pin, confirm priority, set owner, family update, pickup through an arrived assigned boat). Each property runs a fixed list of seeds (for example 200) and includes the seed in the assertion message so a failure can be replayed. There is no shrinking; fast-check would add it but is not needed for this size of input space (D9).

**Test Plan**: Observe behavior on UNFIXED code first for online actions, pickups through an arrived assigned boat, visibility and command-centre functions, then write property-based tests capturing that behavior. Run `src/utils/preservation.test.ts` on unfixed code (must pass), then again after the fix. Tests that depend on Boat 15 are written to accept the seed with or without it, so they are valid on both versions.

**Test Cases**:
1. **Assignment rules (3.3 to 3.6)**: Observe that on unfixed code, for random states and (case, boat) pairs, `assignBoatToCase` is blocked exactly when the case is non-critical unverified, picked up, already has the boat, or the busy boat points elsewhere, with the same error text; write the test to verify this continues after the fix
2. **Pickup through arrived assigned boat (3.7, 3.8)**: Observe that on unfixed code arrival sets cases to `boat_arrived`, and confirming one household leaves others open and frees the boat after the last one; write the oracle comparison above to verify this continues after the fix
3. **Visibility (3.11 to 3.15)**: Observe that on unfixed code, for random sequences, Guest sees no boats, cases or depots, Resident sees only owned cases and boats assigned to them without crew or supplies, Admin sees everything, and Guest alerts contain no private rescue alerts; write the test to verify this continues after the fix
4. **Online location changes (3.19)**: Observe the output of the unfixed online branches of `handleReportLocationChange` and `handleMoveSelectedCasePin` (copied into the test as oracles), then verify `applyFamilyLocationChange` and `moveCasePin` give the same cases
5. **Seed summaries and command functions (3.1, 3.2, 3.9, 3.10, 3.16 to 3.18)**: keep the existing tests in `rescueLogic.test.ts` unchanged; they must pass before and after

### Unit Tests

- `confirmPersonPickedUp`: each rejection reason and its message; success records the boat's crew lead; shared pickup point leaves other households open.
- `getPickupEligibility`: no boats, boats not arrived, one arrived, several arrived.
- `assignBoatToCase` reason codes for each block, with unchanged messages.
- `verifyAndMovePickupPin` sets `verifiedAtMs` once and keeps it on re-verification.
- `applyQueuedActions`: each of the five item types; original timestamps; duplicate `new_case` id rejected; rejected item kept with error and later items still applied; rejection event recorded once across two sends; queued arrival followed by pickup succeeds.
- `projectQueuedState` returns the same state as applying the queue and does not change its inputs.
- `computeDrillComparison`: no data; one measured request; mean over several; slower and equal results; seeded cases without epoch fields excluded; event counts.
- `isAppOnline` over all four combinations.
- `enqueueLocalDraft` ids stay unique after an item is removed.
- Seed: one available boat; the four original boats deep-equal their current definitions.
- Translations: `waitingToSendLabel` in EN, BM and CN equals the approved strings, and no translation value contains "Draft", "Draf" or "草稿".

### Property-Based Tests

- Random states from `randomOnlineSequence` plus random (case, boat) pairs: pickups through an unassigned or not-arrived boat are always rejected with inputs unchanged (Property 1).
- Random queues of 1 to 8 items with random `createdAt` minutes, including invalid pickups and missing ids: no item is lost, remaining order is preserved, applied items carry their original time, and untouched cases are unchanged (Property 1).
- Random sets of cases with and without epoch fields and random event logs: drill values match their definitions and the headline never calls a slower result faster (Property 1).
- Random online sequences: assignment outcomes, visibility, and pickups through an arrived assigned boat match the observed original behavior (Property 2).

### Integration Tests

- **Rapid-response flow (pure, automated)**: seed, assign Boat 15 to `case-devi`, mark it on the way and arrived, confirm the pickup, then check that Boat 15 is available again, `pickedUpBy` is its crew lead, and `computeDrillComparison` reports 1 pickup attempt and 0 blocked.
- **Offline continuity flow (pure, automated)**: queue Boat 04 arrived, Puan Aminah's pickup, a new rescue request and a road issue with `createdAt` 2:40 PM, send at 3:05 PM, and check the pickup time is 2:40 PM, the new request and road appear only after sending, and the queue is empty.
- **Manual browser checklist** (`npm run dev`, port 3000): the four judge scenarios; DevTools Network "Offline" and back to confirm 2.12 without the toggle; labels in EN, BM and CN; desk actions disabled offline in the console, map cards and Command Centre; the pickup chooser with two arrived boats; Drill view before and after running the drill; a saved v6 state is ignored and removed; Reset Demo clears the queue and drill events.

### Verification Loop

Run after the fix, in this order, and stop on the first failure:
1. `npm run build` and confirm the output has no `__dirname` line (the chunk-size warning is expected).
2. `npm run lint` (`tsc --noEmit`).
3. `npm test`. For coverage, run `npx tsx --test --experimental-test-coverage <test files>` and target at least 80% line coverage of the changed functions in `rescueLogic.ts`.
4. `npm ls @google/genai express dotenv @types/express` returns nothing.
5. Search `src/` for `Local draft`, `Draft(s)`, `Saved Locally`, `Draf Disimpan` and `本地草稿`; expect no user-facing matches.
6. `git diff --stat` and review each changed file for unintended changes.
