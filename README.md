# Flood Rescue Map Malaysia

A district flood rescue coordination prototype set in Shah Alam, Selangor. It puts family SOS reports, OKU boarding assistance, boat dispatch, evacuation centres (PPS) and power restoration updates on one map.

> **Demo prototype.** Every incident, person, boat position, shelter count and river reading is simulated, and all personal details are fictional. The app does not contact real emergency services. In a real emergency, call 999.

## What the demo covers

- **Three demo roles**, switched from the header: Guest (public information only), Resident (their own rescue request and the boats assigned to it) and Admin (rescue coordinator).
- **Live map** on OpenStreetMap: hazard zones, shelters, verified evacuation routes, road closures, boats and pickup pins.
- **Reporting**: a local issue (blocked road or power outage), a rescue request for yourself, or a request on behalf of a relative who has no phone.
- **Coordinator tools**: verify pickup points, confirm priority, assign boats, confirm each pickup, close and reopen roads, approve or withdraw routes, and update shelters.
- A language switch for English, Bahasa Melayu and Chinese (some screens are still English only), and a simulated offline mode that saves drafts locally.

Everything runs in the browser and state is kept in `localStorage`. There is no backend and no API key is needed. The role switch is a demo control, not real access control, so do not put real personal data into this build.

## Run it locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (http://localhost:3000 by default).

## Checks

```bash
npm test        # unit tests for the rescue logic
npm run lint    # TypeScript type check
npm run build   # production build into dist/
```

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4 and Leaflet. Map data © OpenStreetMap contributors.

Originally built in Google AI Studio: https://ai.studio/apps/6209ce96-4850-4c8d-bf5c-0ea32b48abf1
