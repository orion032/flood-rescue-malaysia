# Demo Video Script: Flood Rescue Map Malaysia

Target length: about 4 minutes. Check the competition's time limit. If you need to cut, drop Scene 4 or Scene 7 first.

All people, boats and places in the demo are fictional. The app does not contact emergency services.

## 1. Before you record

1. Start the app from the project folder:

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000. Stay connected to the internet, because the map tiles load online.
2. Open **Menu** and click **Reset** so the session starts from the seed data. Do not press Reset while recording, because it also clears the Drill Check numbers.
3. Do one full practice run of every scene, then press **Reset** again before the real take.
4. Screen setup: 1920 x 1080 browser window, zoom 110 to 125%, bookmarks bar hidden, other tabs closed, Do Not Disturb on.
5. Recording tools on Windows:
   - **Xbox Game Bar**: Win + Alt + R starts and stops recording the active window.
   - **Snipping Tool** (Windows 11): its Record mode captures a chosen screen area.
   - **OBS Studio**: more control, for example microphone and screen on separate tracks.
   - **Clipchamp** (built into Windows 11): join the clips, trim pauses and add captions.
6. Record each scene as its own clip, so a mistake costs one scene instead of the whole video. You can speak live or record the narration afterwards as a voiceover.

## 2. Scenes

Each scene lists what to do on screen and what to say.

### Scene 1. Intro (0:00 to 0:20)

**On screen:** the Live Map as Guest, showing Shah Alam.

**Say:** "When Shah Alam floods, rescue requests, boats and shelters are tracked across phone calls, WhatsApp groups and paper. Flood Rescue Map Malaysia puts them on one map for families, residents and rescue coordinators. Everything you see is fictional demo data, and the app does not contact 999."

### Scene 2. Drill Check before (0:20 to 0:35)

**On screen:** Menu > **Drill Check**. Hold on the three measures that read "Not measured yet".

**Say:** "This drill check compares the app with a paper-and-phone drill. It only shows numbers it has measured in this session, so right now every measure says Not measured yet."

### Scene 3. Family-assisted OKU request (0:35 to 1:05)

**On screen:**
1. On Drill Check, click **Open Family-Assisted Form** (card 4).
2. Fill in the form for an elderly relative. Use a landmark as the pickup point and a clearly fictional name, for example "Encik Rahman (Fictional)".
3. Click **Request rescue**.

**Say:** "Many elderly and OKU residents don't have a smartphone. A family member in another town can request a rescue for them, using a landmark the crew can find, without the person's GPS or phone account."

### Scene 4. Public map privacy (1:05 to 1:20)

**On screen:** Menu > Drill Check > **Inspect Resident & Family Map** (card 3). Pan around the Guest map: hazard zones, shelters, verified routes and road closures.

**Say:** "The public map shows hazards, shelters and verified routes. It never shows other households' phone numbers, exact addresses or boat positions."

### Scene 5. Coordinator: verify and assign (1:20 to 2:20)

**On screen:**
1. Switch the account to **Admin (Rescue Coordinator)**, then Menu > **Boat Dispatch & Cases**.
2. Select the request you submitted in Scene 3 and click **Verify / Update Pickup Pin**.
3. Menu > Drill Check > **Open Rescue Coordinator** (card 2). It opens Madam Saraswathy Devi's verified request at Jalan Jasa with Boat 15 already chosen. Click the assign button.
4. Select your new request again, choose Boat 15 and click assign. The app blocks it and says Boat 15 already has an active destination.
5. Open Pak Cik Salleh's request at Kampung Kebun Bunga. Point out that it is not verified yet but already has an owner and a follow-up time.

**Say:** "The coordinator first verifies where the pickup point is, then assigns a boat. Boat 15 goes to Madam Devi at Jalan Jasa. If I try to send the same boat to a second destination, the app stops me, because one boat can't be in two places. Requests we can't verify yet, like Pak Cik Salleh's, still get an owner and a follow-up time, so nobody is forgotten."

### Scene 6. Safe pickup confirmation (2:20 to 2:50)

**On screen:**
1. Select Puan Aminah's request at SK Taman Sri Muda. Boats 04, 07 and 12 are assigned and none has arrived. Show that **Person picked up** is disabled and the reason under it.
2. On Boat 07's card, click **Arrived**.
3. Back on Puan Aminah's request, the button now names Boat 07. Click it.

**Say:** "A family should only hear 'picked up' when it's true. The app only allows a pickup through a boat that is assigned to this request and marked arrived. Once Boat 07 arrives, the coordinator confirms, and the record shows Boat 07's crew lead. Other households waiting at the same school entrance stay open."

### Scene 7. Offline continuity (2:50 to 3:30)

**On screen:**
1. Menu > Drill Check > **Demonstrate Offline Mode** (card 1). Show the offline banner on the map.
2. Menu > **Boat Dispatch & Cases**. Show the offline banner and the greyed-out desk buttons.
3. Select Puan Salma's request at Seksyen 17 Terminal Jetty. On Boat 09's card, click **Arrived**. It is marked Waiting to send.
4. On Puan Salma's request, click **Person picked up** with Boat 09. It shows "Pickup confirmation waiting to send."
5. Open **Menu**. The Waiting to Send list shows both items with their times.
6. Click **Offline · Go Online**. Open Menu again and, if the items are still listed, click **Send 2 waiting item(s)**. A message confirms they were sent.

**Say:** "Floods cut mobile coverage. Offline, saved requests stay readable. Crew actions like a boat arriving or a pickup are kept as Waiting to send, and the app still checks that the boat has arrived. Desk decisions that need fresh information, like assigning boats, are disabled until we're back online. When the connection returns, we send the queue, and each item keeps the time it actually happened."

A real disconnection also works (browser DevTools > Network > Offline), but the demo button is easier to show on video.

### Scene 8. Drill Check after (3:30 to 3:50)

**On screen:** Menu > **Drill Check**. Show the measured values.

**Say:** "Now the drill check shows numbers measured in this session: how long it took to verify the pickup point, how many unsafe boat assignments were blocked, and how many pickups were confirmed. These come from this demo, not from a field trial."

The pickup measure will most likely show 0 blocked, because the disabled button stops a wrong pickup before anyone can attempt it. That is worth saying out loud.

### Scene 9. Languages and close (3:50 to 4:05)

**On screen:** Menu > Language > **BM**, then **CN**, then back to **EN**.

**Say:** "The app works in English, Bahasa Melayu and Chinese. Flood Rescue Map Malaysia: one map, so every family knows when a boat is really coming."

## 3. Claims to avoid

- Real 999 or emergency service integration. None exists.
- Multi-device sync or a server. Everything runs in one browser.
- Full Bahasa Melayu and Chinese coverage. Some screens are still English only, including the Remove button in the Waiting to Send list.
- Field-tested time savings. The Drill Check numbers come from the demo session.

## 4. If something goes wrong

- **Leftover or wrong data:** Menu > Reset, then restart from Scene 1.
- **A scene misbehaves in the practice run:** skip it. Scenes 4 and 7 can be cut without breaking the story. Without Scene 7, the Drill Check shows one pickup instead of two.
- **The map is blank:** check the internet connection. Map tiles only load online.