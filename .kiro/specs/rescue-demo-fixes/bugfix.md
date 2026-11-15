# Bugfix Requirements Document

## Introduction

Flood Rescue Map Malaysia is a browser-only demo in which a district rescue coordinator turns an incomplete family report into a verified pickup and keeps the family accurately informed during an outage. The concept document sets these rules: a boat being assigned or arriving is not the same as a person being picked up, and a rescue request (case) stays open until the crew confirms that individual boarded; every status shown to a family carries the time it was last confirmed; and while offline, unsent updates are visibly queued as "Waiting to send" and never silently dropped.

The current build breaks these rules in five areas:

- The "Rapid response" judge demo cannot be completed from seed data because no boat is available.
- A pickup can be confirmed before any boat has arrived, and the wrong boat and crew can be recorded.
- The drill comparison shows fixed numbers and a headline percentage that were never measured.
- Offline mode ignores real connectivity, restamps queued actions with the send time, drops or mislabels queued items, and shows unsent requests to the coordinator as received.
- Leftovers from Google AI Studio (unused Gemini and Express dependencies, an API key prompt, a placeholder package name, a build warning) contradict the README.

These faults weaken the demo's credibility with judges and, in a real deployment, could tell a family that a relative was rescued when they were still waiting.

Out of scope: adding a backend, a crew role, or multi-device sync, and rebuilding existing services (SaveME 999, Public InfoBanjir, MyIBJKM).

## Bug Analysis

### Current Behavior (Defect)

**Rapid-response demo**

1.1 WHEN the demo starts from fresh or reset seed data THEN the system has no boat in "available" status, because all four seeded boats are already preparing or on the way to other pickup points, so every attempt to assign any boat to the verified Jalan Jasa Corner Shoplot Awning request (Madam Saraswathy Devi) or the unverified Kampung Kebun Bunga request (Pak Cik Salleh's household) is blocked with a "two active destinations" error

1.2 WHEN the judge runs the "Rapid response" demo scenario THEN the system opens the coordinator view with the unverified Kampung Kebun Bunga request selected, so the coordinator is not shown a verified pickup that a boat can be dispatched to

1.3 WHEN a browser that saved demo state before this fix opens the app THEN the system restores the old saved state, so the corrected seed data does not appear unless the user manually resets the demo

**Pickup confirmation**

1.4 WHEN "Person picked up" is confirmed for a case whose assigned boats are all still preparing or on the way THEN the system marks the person as picked up even though no boat has arrived

1.5 WHEN "Person picked up" is confirmed with a boat that is not assigned to that case THEN the system marks the person as picked up and records that boat's crew lead as the confirming crew

1.6 WHEN a case has more than one assigned boat and "Person picked up" is confirmed from the coordinator console or the map popup THEN the system always records the first assigned boat (or, if no boat is assigned, the first boat in the fleet) as the confirming boat, regardless of which boat actually arrived

1.7 WHEN a case is in "assigned" status and no assigned boat has arrived THEN the coordinator console and the map popup still offer the "Person picked up" action, and the system gives no message explaining why a confirmation would be invalid

1.8 WHEN a pickup confirmation that was queued offline is sent after reconnecting THEN the system applies it without checking that the boat was assigned to the case and had arrived

**Drill comparison**

1.9 WHEN the Drill view is shown THEN the system displays a fixed digital verification time (6 minutes if any case is verified, otherwise 9 minutes) that is not measured from any recorded event

1.10 WHEN the Drill view is shown before any drill has been run THEN the system displays a headline "% faster pickup verification" (79% against the 28-minute seed baseline) computed from the fixed value

1.11 WHEN the Drill view shows the digital counts for duplicate boat assignments and for households still waiting that were incorrectly marked as rescued THEN the system counts only states that the app's own rules already prevent, so both always show 0 and are presented as measured results

**Offline mode**

1.12 WHEN the browser actually loses or regains its network connection THEN the system does not detect it, and online or offline state changes only through the demo toggle

1.13 WHEN queued actions (pickup confirmation, pickup point change, boat status change) are sent after reconnecting THEN the system stamps them with the time of sending instead of the time the action was taken, so for example a pickup confirmed offline shows the reconnection time as its pickup time

1.14 WHEN the queue is sent after reconnecting THEN the system skips queued rescue requests and queued local issue reports, clears the whole queue anyway, and marks every case as sent, including cases whose changes were never queued or sent

1.15 WHEN a rescue request or a local issue report (blocked road, power outage) is created while offline THEN the system immediately adds it to the coordinator queue and the shared map as though it had been received

1.16 WHEN items are queued while offline THEN the system labels them "Local draft" and "Draft(s) Saved Locally" (with equivalent BM and CN wording), and the label "Waiting to send" does not appear anywhere

1.17 WHEN the coordinator verifies a pickup pin, assigns a boat, confirms priority, assigns an owner, or sends a family update while offline THEN the system applies the action as though it had been sent, without adding it to the queue or showing it as unsent; a pickup pin moved while offline is marked as a local draft but never added to the queue, so it is later marked as sent without being sent

**Project leftovers**

1.18 WHEN a developer installs the project THEN the package is named "react-example", the install pulls in the Gemini SDK, Express, dotenv and Express type definitions that the app never imports, and the only committed lockfile is a Bun lockfile while the README instructs `npm install`

1.19 WHEN a developer reads the setup files THEN the app metadata declares a server-side Gemini API capability and the environment example asks for `GEMINI_API_KEY` and `APP_URL`, contradicting the README, which says there is no backend and no API key is needed

1.20 WHEN the clean script runs THEN it tries to delete a `server.js` file that the project does not produce

1.21 WHEN the production build runs THEN Vite prints a warning about `__dirname` being used in the Vite config

### Expected Behavior (Correct)

**Rapid-response demo**

2.1 WHEN the demo starts from fresh or reset seed data THEN the system SHALL have exactly one boat in "available" status with no assigned pickup point and no assigned cases, and assigning that boat to the verified Jalan Jasa Corner Shoplot Awning request SHALL succeed

2.2 WHEN the judge runs the "Rapid response" demo scenario THEN the system SHALL open the coordinator view with the verified Jalan Jasa request selected, and the unverified Kampung Kebun Bunga request SHALL remain in the coordinator queue so the coordinator can assign or change its owner and follow-up action

2.3 WHEN a browser that saved demo state before this fix opens the app THEN the system SHALL start from the corrected seed data instead of restoring the older saved state

**Pickup confirmation**

2.4 WHEN "Person picked up" is confirmed for a case and no boat assigned to that case has "arrived" status THEN the system SHALL reject the confirmation, leave the case open and the boats unchanged, and return a reason stating that an assigned boat must be marked arrived first

2.5 WHEN "Person picked up" is confirmed with a boat that is not assigned to that case THEN the system SHALL reject the confirmation, leave the case and boats unchanged, record no crew lead, and return a reason stating that the boat is not assigned to this case

2.6 WHEN a case has one or more assigned boats in "arrived" status and the coordinator confirms "Person picked up" from the coordinator console or the map popup THEN the system SHALL record the pickup against the arrived boat the coordinator selects (or the only arrived boat, when there is just one) and SHALL record that boat's crew lead as the confirming crew

2.7 WHEN a case has no assigned boat in "arrived" status THEN the coordinator console and the map popup SHALL hide or disable the "Person picked up" action and SHALL show the reason, for example that the case is waiting for an assigned boat to be marked arrived

2.8 WHEN a queued pickup confirmation is sent after reconnecting THEN the system SHALL apply the same assigned-and-arrived check, processing queued actions in the order they were taken, and IF the check fails THEN the system SHALL keep the item visible with its rejection reason instead of dropping it

**Drill comparison**

2.9 WHEN at least one pickup point has been verified in the app during the current session THEN the system SHALL show a digital verification time computed from the recorded time each of those requests was received and the recorded time its pickup point was verified, together with the number of requests measured; seeded verifications, whose times are fictional, SHALL NOT count

2.10 WHEN the digital verification time has not been measured THEN the system SHALL show "Not measured yet" with a prompt to run the drill and SHALL NOT show any headline percentage; WHEN it has been measured THEN the headline SHALL be computed from the current paper baseline and the measured value, and SHALL NOT describe a slower result as faster

2.11 WHEN the Drill view shows the digital duplicate-assignment and false-rescue measures THEN the system SHALL derive each value from events recorded in the current session (for example, boat assignment attempts that were blocked as duplicates or second destinations, and pickups confirmed without an assigned arrived boat), SHALL label each value for what it actually counts, and SHALL show "Not measured yet" when no relevant event has been recorded

**Offline mode**

2.12 WHEN the browser reports that it has gone offline or come back online, including the connection state at app start THEN the system SHALL update its connection state accordingly, and the system SHALL treat itself as offline whenever either the browser reports no connection or the demo toggle is set to offline

2.13 WHEN queued actions are sent after reconnecting THEN the system SHALL apply each action with the time it was originally taken (for example, the pickup time SHALL be the time the crew confirmed boarding offline)

2.14 WHEN the queue is sent after reconnecting THEN the system SHALL process every queued item type, including rescue requests, local issue reports, pickup point changes, boat status changes, pickup confirmations and any other queued coordinator action; SHALL mark as sent only the items and cases it actually processed; and IF an item cannot be applied THEN the system SHALL keep it visible with its reason instead of silently dropping it

2.15 WHEN a rescue request or a local issue report is created while offline THEN the system SHALL show it on the reporting family's side as "Waiting to send" and SHALL NOT show it in the coordinator queue, on the shared map, or in alerts until it has been sent

2.16 WHEN items are queued while offline THEN the system SHALL label them "Waiting to send" in English, with equivalent Bahasa Melayu and Chinese labels (for example "Menunggu untuk dihantar" and "等待发送")

2.17 WHEN the coordinator takes a write action while offline (verifying a pickup pin, assigning a boat, confirming priority, assigning an owner, sending a family update, or moving a pickup pin) THEN the system SHALL either queue it as "Waiting to send" or block it with a message that it needs a connection, and SHALL NOT present it as sent

2.18 WHERE an offline app shell is provided (optional, not required by this fix) THEN the system SHALL reopen while offline with saved cases and queued items readable, and SHALL continue to state that map tiles need an internet connection

**Project leftovers**

2.19 WHEN a developer installs the project THEN the package SHALL be named for the project (for example "flood-rescue-map-malaysia"), dependencies confirmed by search to be unused (Gemini SDK, Express, dotenv, Express type definitions) SHALL be removed, and the committed lockfile SHALL match both the dependency list and the package manager named in the README

2.20 WHEN a developer reads the setup files THEN the app metadata SHALL NOT declare a server-side Gemini capability and the environment example SHALL NOT ask for an API key or app URL, consistent with the README

2.21 WHEN the clean script runs THEN it SHALL only remove outputs the project actually produces

2.22 WHEN the production build runs THEN the system SHALL build without the `__dirname` warning

### Unchanged Behavior (Regression Prevention)

**Dispatch and pickup rules**

3.1 WHEN the Resident views the family tracker for Puan Aminah from seed data THEN the system SHALL CONTINUE TO show "3 boats assigned · 2 on the way · 1 preparing"

3.2 WHEN the pickup point summary for SK Taman Sri Muda (Covered School Entrance) is shown from seed data THEN the system SHALL CONTINUE TO show 3 assigned boats, 2 on the way, 1 preparing and 2 waiting households

3.3 WHEN a boat already heading to one pickup point is assigned to a case at a different pickup point THEN the system SHALL CONTINUE TO block the assignment with the "two active destinations" error

3.4 WHEN a boat is assigned to a case it is already assigned to THEN the system SHALL CONTINUE TO block the assignment

3.5 WHEN a boat is assigned to an unverified case that is not marked critical THEN the system SHALL CONTINUE TO block the assignment until the pickup point is verified or urgent priority is confirmed

3.6 WHEN an available boat is assigned to an unverified case marked critical THEN the system SHALL CONTINUE TO allow urgent dispatch while keeping the pickup point unverified and keeping the existing case owner

3.7 WHEN a boat is marked arrived THEN the system SHALL CONTINUE TO move its assigned waiting cases to "Boat arrived — awaiting boarding confirmation" without marking anyone as picked up

3.8 WHEN one person at a shared pickup point is confirmed picked up through an assigned boat that has arrived THEN the system SHALL CONTINUE TO leave the other households at that pickup point open and on the boat's manifest, and SHALL CONTINUE TO return the boat to "available" once its last waiting household is confirmed

3.9 WHEN a boat is marked available THEN the system SHALL CONTINUE TO detach it from its cases and return a case to "confirmed" when it has no remaining assigned boats

3.10 WHEN a crew enters an ETA THEN the system SHALL CONTINUE TO show it, and SHALL CONTINUE TO show no ETA for boats where none was entered

**Visibility and privacy**

3.11 WHEN the Guest account views the map THEN the system SHALL CONTINUE TO hide all boats, rescue requests, supply depots and standby shelters, and to show only verified roads

3.12 WHEN the Resident account views the map THEN the system SHALL CONTINUE TO show only their own rescue request and the boats assigned to their pickup point, without crew names or supplies

3.13 WHEN the Admin account views the map THEN the system SHALL CONTINUE TO show every boat, every rescue request and every supply depot, including assigned crew names

3.14 WHEN a rescue request is shown outside the coordinator view THEN the system SHALL CONTINUE TO hide the reporter's callback phone and the household's exact address

3.15 WHEN alerts are built for an account THEN the system SHALL CONTINUE TO keep private rescue alerts away from Guest, show boat and pickup alerts to Resident, and show case review actions to Admin

**Roads, routes and shelters**

3.16 WHEN a road segment is closed THEN the system SHALL CONTINUE TO withdraw evacuation routes that depend on it, to block reopening until the linked pump task is confirmed in the field, and to require both the destination-open and field-checked confirmations before approving a route

3.17 WHEN a PPS shelter is closed THEN the system SHALL CONTINUE TO withdraw its evacuation routes and publish an urgent shelter alert

3.18 WHEN a hazard zone's severity is changed THEN the system SHALL CONTINUE TO update that zone's severity and colour, and to detect overlapping hazard zones at a point

**Online and offline**

3.19 WHEN the app is online and the browser has a connection THEN the system SHALL CONTINUE TO apply every action immediately with the current time, without queuing it

3.20 WHEN the app is offline THEN the system SHALL CONTINUE TO keep saved cases, boats and assignments readable and to show that map tiles need an internet connection

**Drill and demo controls**

3.21 WHEN the coordinator edits a paper-drill baseline number THEN the system SHALL CONTINUE TO accept it within the existing bounds (verification time at least 1 minute, counts at least 0) and keep it across reloads

3.22 WHEN the demo is reset THEN the system SHALL CONTINUE TO restore every seed data set, clear the queue and return to the Guest public map

3.23 WHEN the judge runs the "Offline continuity", "Data protection" or "Community support" demo scenario THEN the system SHALL CONTINUE TO switch to the same account, view and dialog as before

3.24 WHEN the user switches language between English, Bahasa Melayu and Chinese THEN the system SHALL CONTINUE TO show the existing translations for all labels not changed by this fix

**Project and build**

3.25 WHEN the app runs THEN the system SHALL CONTINUE TO run entirely in the browser with state saved locally, with no backend, no API key, no crew role, no multi-device sync, and no contact with real emergency services

3.26 WHEN `npm test`, `npm run lint` and `npm run build` are run THEN the system SHALL CONTINUE TO pass all three, with existing tests changed only where behaviour changes on purpose (pickup confirmation requiring an assigned arrived boat, drill measures reported as measured or "Not measured yet", and the seeded boat count if a boat is added)

3.27 WHEN `npm run dev` is run THEN the system SHALL CONTINUE TO serve the app on port 3000
