import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_AREA_INSTRUCTIONS,
  INITIAL_BOATS,
  INITIAL_CASES,
  INITIAL_COMMAND_INCIDENTS,
  INITIAL_COMMAND_TASKS,
  INITIAL_DRILL_BASELINE,
  INITIAL_EVAC_ROUTES,
  INITIAL_HAZARD_ZONES,
  INITIAL_NOTICES,
  INITIAL_OUTAGES,
  INITIAL_PPS_CENTERS,
  INITIAL_ROAD_CLOSURES,
  INITIAL_SUPPLY_DEPOTS,
} from '../data/seedData';
import {
  accountToRole,
  advanceBoatStatus,
  advanceCommandTask,
  approveOrWithdrawRoute,
  assignBoatToCase,
  buildAlertsForAccount,
  closeRoadSegmentAndWithdrawRoutes,
  clusterMarkersByZoom,
  computeDrillComparison,
  confirmCasePriority,
  confirmPersonPickedUp,
  applyFamilyLocationChange,
  enqueueLocalDraft,
  findZonesAtPoint,
  isAppOnline,
  moveCasePin,
  formatFamilyMemberStatus,
  getHazardColor,
  getPickupEligibility,
  getPickupPointSummary,
  getResidentRescueSummary,
  getVisibleMapDataForAccount,
  redactCaseForRole,
  reopenRoadSegment,
  sendFamilyUpdate,
  updateBoatLocation,
  updateHazardZoneSeverity,
  updatePpsShelterStatus,
  verifyAndMovePickupPin,
  drillEventForAssignment,
  drillEventForPickup,
  applyQueuedActions,
  projectQueuedState,
  getQueuedTargets,
} from './rescueLogic';
import type { QueueState, QueuedPayloadByType } from './rescueLogic';
import type { DrillEvent, LocalDraftAction, QueuedActionType } from '../types/rescue';

test('redactCaseForRole keeps personal contact and precise household address off public view', () => {
  const target = INITIAL_CASES[0];
  const publicView = redactCaseForRole(target, 'resident', []);
  assert.equal(publicView.isCallbackHidden, true);
  assert.equal(publicView.isExactLocationHidden, true);
  assert.equal(publicView.displayCallbackPhone.includes('4410'), false);
  assert.equal(publicView.displayAddress.includes('Block C'), false);

  const coordinatorView = redactCaseForRole(target, 'coordinator', []);
  assert.equal(coordinatorView.isCallbackHidden, false);
  assert.equal(coordinatorView.isExactLocationHidden, false);
  assert.equal(coordinatorView.displayCallbackPhone.includes('4410'), true);
});

test('assignBoatToCase prevents assigning a boat to two active destinations at once', () => {
  // Boat 04 is currently assigned to SK Taman Sri Muda (Covered School Entrance)
  // Trying to assign Boat 04 to Jalan Jasa Corner Shoplot Awning (case-devi) must be blocked!
  const twoDestinationsAttempt = assignBoatToCase(
    INITIAL_CASES,
    INITIAL_BOATS,
    'case-devi',
    'boat-04',
    '2:38 PM'
  );
  assert.equal(twoDestinationsAttempt.ok, false);
  assert.match(twoDestinationsAttempt.error ?? '', /two active destinations/i);
});

test('assignBoatToCase allows urgent unverified dispatch while keeping owner open, blocks non-urgent unverified & duplicates', () => {
  // Non-urgent unverified case must remain blocked until verified or marked urgent
  const nonUrgentUnverified = INITIAL_CASES.map((c) =>
    c.id === 'case-kampung' ? { ...c, urgency: 'high' as const } : c
  );
  const blockedAttempt = assignBoatToCase(
    nonUrgentUnverified,
    INITIAL_BOATS,
    'case-kampung',
    'boat-12',
    '2:38 PM'
  );
  assert.equal(blockedAttempt.ok, false);

  // Urgent unverified case CAN be urgently dispatched with an available boat while keeping locationVerified === false and named owner open
  const boatsWithAvailable = INITIAL_BOATS.map((b) =>
    b.id === 'boat-12'
      ? { ...b, status: 'available' as const, assignedPickupPoint: null, assignedCaseIds: [] }
      : b
  );
  const urgentAttempt = assignBoatToCase(
    INITIAL_CASES,
    boatsWithAvailable,
    'case-kampung',
    'boat-12',
    '2:38 PM'
  );
  assert.equal(urgentAttempt.ok, true);
  const updatedKampung = urgentAttempt.cases.find((c) => c.id === 'case-kampung');
  assert.equal(updatedKampung?.locationVerified, false);
  assert.equal(updatedKampung?.caseOwner, 'Volunteer Scout Unit B');
  assert.deepEqual(updatedKampung?.assignedBoatIds, ['boat-12']);

  const duplicateAttempt = assignBoatToCase(
    INITIAL_CASES,
    INITIAL_BOATS,
    'case-aminah',
    'boat-04',
    '2:38 PM'
  );
  assert.equal(duplicateAttempt.ok, false);
});

test('confirmCasePriority records urgency, reason, and coordinator confirmation', () => {
  const updated = confirmCasePriority(
    INITIAL_CASES,
    'case-kampung',
    'critical',
    'Rising river bend water + elderly resident unreachable',
    'Coordinator Nadia',
    '2:40 PM'
  );
  const target = updated.find((c) => c.id === 'case-kampung');
  assert.equal(target?.urgency, 'critical');
  assert.equal(target?.priorityConfirmed, true);
  assert.equal(target?.priorityReason, 'Rising river bend water + elderly resident unreachable');
  assert.equal(target?.priorityConfirmedBy, 'Coordinator Nadia');
});

test('clusterMarkersByZoom groups nearby markers at zoom 12 and splits them at zoom 15', () => {
  const pts = [
    { id: 'a', coordinates: { lat: 3.0285, lng: 101.5392 }, urgent: true, item: 'A' },
    { id: 'b', coordinates: { lat: 3.0308, lng: 101.5365 }, urgent: false, item: 'B' },
    { id: 'c', coordinates: { lat: 3.0715, lng: 101.4885 }, urgent: false, item: 'C' },
  ];
  const wide = clusterMarkersByZoom(pts, 12);
  assert.equal(wide.length, 2);
  assert.equal(wide[0].items.length, 2);
  assert.equal(wide[0].hasUrgent, true);

  const zoomedIn = clusterMarkersByZoom(pts, 15);
  assert.equal(zoomedIn.length, 3);
});

test('verifyAndMovePickupPin updates landmark, coordinates, and status', () => {
  const res = verifyAndMovePickupPin(INITIAL_CASES, INITIAL_BOATS, 'case-kampung', {
    pickupLandmark: 'Surau Al-Hidayah High Porch',
    coordinates: { lat: 3.0591, lng: 101.5528 },
    verifiedBy: 'Coordinator Nadia',
    timestamp: '2:40 PM',
    confirmedByWho: 'Ketua Kampung',
  });
  const kampung = res.cases.find((c) => c.id === 'case-kampung');
  assert.ok(kampung);
  assert.equal(kampung.locationVerified, true);
  assert.equal(kampung.status, 'confirmed');
  assert.equal(kampung.pickupLandmark, 'Surau Al-Hidayah High Porch');
});

test('Boat arrived and Person picked up are separate actions; confirming one leaves others open', () => {
  const arrived = advanceBoatStatus(
    INITIAL_BOATS,
    INITIAL_CASES,
    'boat-04',
    'arrived',
    '2:42 PM'
  );
  const aminahAfterArrival = arrived.cases.find((c) => c.id === 'case-aminah');
  assert.equal(aminahAfterArrival?.status, 'boat_arrived');
  assert.match(formatFamilyMemberStatus(aminahAfterArrival!), /Boat arrived/);

  const afterAminah = confirmPersonPickedUp(
    arrived.cases,
    arrived.boats,
    'case-aminah',
    'boat-04',
    '2:45 PM'
  );
  assert.equal(afterAminah.ok, true);

  const aminahPickedUp = afterAminah.cases.find((c) => c.id === 'case-aminah');
  const limStillWaiting = afterAminah.cases.find((c) => c.id === 'case-lim');
  assert.equal(aminahPickedUp?.status, 'picked_up');
  assert.notEqual(limStillWaiting?.status, 'picked_up');
});

test('getPickupPointSummary shows 3 assigned, 2 on the way, 1 preparing', () => {
  const summary = getPickupPointSummary(
    INITIAL_CASES,
    INITIAL_BOATS,
    'SK Taman Sri Muda (Covered School Entrance)'
  );
  assert.equal(summary.assignedBoats.length, 3);
  assert.equal(summary.onTheWayCount, 2);
  assert.equal(summary.preparingCount, 1);
  assert.equal(summary.waitingHouseholds.length, 2);
});

test('boat ETA is only shown if entered by crew', () => {
  const boat04 = INITIAL_BOATS.find((b) => b.id === 'boat-04');
  const boat07 = INITIAL_BOATS.find((b) => b.id === 'boat-07');
  assert.equal(boat04?.eta, '2:45 PM');
  assert.equal(boat07?.eta, undefined);
});

test('sendFamilyUpdate appends coordinator message and enqueueLocalDraft saves offline draft', () => {
  const updated = sendFamilyUpdate(
    INITIAL_CASES,
    'case-aminah',
    'Coordinator Nadia',
    'Wheelchair ramp confirmed on Boat 04.',
    '2:41 PM'
  );
  const aminah = updated.find((c) => c.id === 'case-aminah');
  assert.ok(aminah?.familyUpdates.some((m) => m.text.includes('Wheelchair ramp')));

  const drafts = enqueueLocalDraft(
    [],
    {
      actorRole: 'resident',
      summary: 'Local draft report for Pak Cik Hassan',
      payloadType: 'new_case',
      payload: { name: 'Pak Cik Hassan' },
    },
    '2:44 PM'
  );
  assert.equal(drafts.length, 1);
});

const MINUTE_MS = 60000;
const DRILL_T0 = Date.UTC(2025, 0, 1, 6, 0, 0);

function measuredCase(id: string, reportedAtMs?: number, verifiedAtMs?: number) {
  return { ...INITIAL_CASES[0], id, reportedAtMs, verifiedAtMs };
}

test('computeDrillComparison reports nothing measured on seed data with no events', () => {
  const drill = computeDrillComparison(INITIAL_CASES, [], INITIAL_DRILL_BASELINE);
  assert.equal(drill.digitalVerify, null);
  assert.equal(drill.headline, null);
  assert.equal(drill.digitalAssignments, null);
  assert.equal(drill.digitalPickups, null);
  assert.equal(drill.paperVerifyMinutes, INITIAL_DRILL_BASELINE.paperVerifyMinutes);
  assert.equal(drill.paperDuplicateAssignments, INITIAL_DRILL_BASELINE.paperDuplicateAssignments);
  assert.equal(drill.paperFalseRescuedCount, INITIAL_DRILL_BASELINE.paperFalseRescuedCount);
});

test('computeDrillComparison reports measured values from epoch times and events', () => {
  const cases = [measuredCase('m-1', DRILL_T0, DRILL_T0 + 7 * MINUTE_MS)];
  const events: DrillEvent[] = [
    { kind: 'assignment_made', atMs: DRILL_T0 },
    { kind: 'assignment_blocked_second_destination', atMs: DRILL_T0 },
    { kind: 'pickup_rejected_not_arrived', atMs: DRILL_T0 },
    { kind: 'pickup_confirmed', atMs: DRILL_T0 },
  ];
  const drill = computeDrillComparison(cases, events, {
    ...INITIAL_DRILL_BASELINE,
    paperVerifyMinutes: 28,
  });
  assert.deepEqual(drill.digitalVerify, { minutes: 7, requestsMeasured: 1 });
  assert.deepEqual(drill.headline, { direction: 'faster', percent: 75 });
  assert.deepEqual(drill.digitalAssignments, { blocked: 1, attempts: 2 });
  assert.deepEqual(drill.digitalPickups, { blocked: 1, attempts: 2 });
});

test('Guest visibility hides all boats, cases, supplies, and standby shelters', () => {
  assert.equal(accountToRole('guest'), 'guest');
  const data = getVisibleMapDataForAccount({
    account: 'guest',
    cases: INITIAL_CASES,
    boats: INITIAL_BOATS,
    ppsCenters: INITIAL_PPS_CENTERS,
    outages: INITIAL_OUTAGES,
    roadClosures: INITIAL_ROAD_CLOSURES,
    supplyDepots: INITIAL_SUPPLY_DEPOTS,
  });
  assert.equal(data.visibleBoats.length, 0);
  assert.equal(data.visibleCases.length, 0);
  assert.equal(data.visibleSupplyDepots.length, 0);
  assert.equal(data.canSeeSupplies, false);
  assert.equal(data.canSeeRescueRequests, false);
  assert.ok(data.visiblePps.every((p) => p.status !== 'Standby' && p.availableSupplies.length === 0));
  assert.ok(data.visibleRoads.every((r) => r.verified));
});

test('User (Resident) sees only own case and boats assigned to their pickup point', () => {
  const data = getVisibleMapDataForAccount({
    account: 'resident',
    cases: INITIAL_CASES,
    boats: INITIAL_BOATS,
    ppsCenters: INITIAL_PPS_CENTERS,
    outages: INITIAL_OUTAGES,
    roadClosures: INITIAL_ROAD_CLOSURES,
    supplyDepots: INITIAL_SUPPLY_DEPOTS,
  });
  assert.deepEqual(
    data.visibleCases.map((c) => c.id),
    ['case-aminah']
  );
  // Boats 04, 07, 12 are assigned to SK Taman Sri Muda; Boat 09 (Seksyen 17) must be hidden
  assert.deepEqual(
    data.visibleBoats.map((b) => b.id),
    ['boat-04', 'boat-07', 'boat-12']
  );
  assert.equal(data.visibleBoats.every((b) => b.crewLead === undefined && b.supplies === undefined), true);
  assert.equal(data.visibleSupplyDepots.length, 0);

  const summary = getResidentRescueSummary('resident', INITIAL_CASES, INITIAL_BOATS);
  assert.equal(summary.hasActiveRequest, true);
  assert.equal(summary.onTheWayCount, 2);
  assert.equal(summary.preparingCount, 1);
  assert.equal(summary.summaryText, '3 boats assigned · 2 on the way · 1 preparing');
});

test('User (Resident) with 0 boats or 0 requests shows waiting or empty summary', () => {
  const noBoatsCases = INITIAL_CASES.map((c) =>
    c.id === 'case-aminah' ? { ...c, assignedBoatIds: [] } : c
  );
  const noBoats = INITIAL_BOATS.map((b) => ({
    ...b,
    assignedPickupPoint: b.assignedPickupPoint === 'SK Taman Sri Muda (Covered School Entrance)' ? null : b.assignedPickupPoint,
    assignedCaseIds: [],
  }));
  const awaiting = getResidentRescueSummary('resident', noBoatsCases, noBoats);
  assert.equal(awaiting.hasActiveRequest, true);
  assert.equal(awaiting.summaryText, 'Waiting for a boat.');

  const noCases = INITIAL_CASES.filter((c) => c.ownerAccountId !== 'resident');
  const empty = getResidentRescueSummary('resident', noCases, INITIAL_BOATS);
  assert.equal(empty.hasActiveRequest, false);
});

test('Admin sees all 4 boats, all cases, supply depots, and updates propagate to resident', () => {
  const adminData = getVisibleMapDataForAccount({
    account: 'admin',
    cases: INITIAL_CASES,
    boats: INITIAL_BOATS,
    ppsCenters: INITIAL_PPS_CENTERS,
    outages: INITIAL_OUTAGES,
    roadClosures: INITIAL_ROAD_CLOSURES,
    supplyDepots: INITIAL_SUPPLY_DEPOTS,
  });
  assert.equal(adminData.visibleBoats.length, INITIAL_BOATS.length);
  assert.equal(adminData.visibleCases.length, INITIAL_CASES.length);
  assert.equal(adminData.visibleSupplyDepots.length, INITIAL_SUPPLY_DEPOTS.length);
  assert.equal(adminData.canSeeSupplies, true);
  assert.ok((adminData.visibleCases[0].assignedCrewNames?.length ?? 0) >= 1);

  // Admin moves Boat 04 and marks Boat 12 as on_the_way -> Resident sees update immediately
  const movedBoats = updateBoatLocation(
    INITIAL_BOATS,
    'boat-04',
    { lat: 3.025, lng: 101.537 },
    '2:48 PM'
  );
  const resBoat12 = advanceBoatStatus(movedBoats, INITIAL_CASES, 'boat-12', 'on_the_way', '2:49 PM');

  const resSummary = getResidentRescueSummary('resident', resBoat12.cases, resBoat12.boats);
  assert.equal(resSummary.summaryText, '3 boats assigned · 3 on the way');

  const resData = getVisibleMapDataForAccount({
    account: 'resident',
    cases: resBoat12.cases,
    boats: resBoat12.boats,
    ppsCenters: INITIAL_PPS_CENTERS,
    outages: INITIAL_OUTAGES,
    roadClosures: INITIAL_ROAD_CLOSURES,
    supplyDepots: INITIAL_SUPPLY_DEPOTS,
  });
  assert.deepEqual(resData.visibleBoats[0].position, { lat: 3.025, lng: 101.537 });

  // Marking Boat 04 available removes it from resident's assigned boats
  const resAvail = advanceBoatStatus(resBoat12.boats, resBoat12.cases, 'boat-04', 'available', '2:55 PM');
  const resSummaryAfter = getResidentRescueSummary('resident', resAvail.cases, resAvail.boats);
  assert.equal(resSummaryAfter.assignedBoats.length, 2);
});

test('multi-hazard colour palettes and overlapping polygon detection work accurately', () => {
  assert.equal(getHazardColor('flood', 'low'), '#C6DBEF');
  assert.equal(getHazardColor('flood', 'critical'), '#08306B');
  assert.equal(getHazardColor('earthquake', 'moderate'), '#D2AE7E');
  assert.equal(getHazardColor('fire', 'critical'), '#B71C1C');
  assert.equal(getHazardColor('flood', 'unknown'), '#64748B');

  // Point inside overlapping Seksyen 17 flood & earthquake demo zones
  const overlaps = findZonesAtPoint(INITIAL_HAZARD_ZONES, { lat: 3.046, lng: 101.501 });
  assert.equal(overlaps.length, 2);
  assert.deepEqual(
    overlaps.map((z) => z.hazardType).sort(),
    ['earthquake', 'flood']
  );
});

test('closing road segment withdraws dependent route, blocks reopening until pump confirmed, and route approval requires both checks', () => {
  const closed = closeRoadSegmentAndWithdrawRoutes(
    INITIAL_ROAD_CLOSURES,
    INITIAL_EVAC_ROUTES,
    INITIAL_NOTICES,
    'road-sepadu-east',
    'Culvert overflowed 0.9 m',
    'Coordinator Amir',
    '2:45 PM'
  );
  assert.deepEqual(closed.withdrawnRouteIds, ['route-sri-muda-main']);
  const withdrawnRoute = closed.routes.find((r) => r.id === 'route-sri-muda-main');
  assert.equal(withdrawnRoute?.status, 'withdrawn');

  // Pump task linked to road-sepadu-east blocks reopening until field confirmation
  const blockedReopen = reopenRoadSegment(
    closed.roadClosures,
    INITIAL_COMMAND_TASKS,
    'road-sepadu-east',
    'Coordinator Amir',
    '2:55 PM'
  );
  assert.equal(blockedReopen.ok, false);

  const confirmedTasks = advanceCommandTask(
    INITIAL_COMMAND_TASKS,
    'task-2',
    'completed',
    'Drain cleared & standing water <0.05 m',
    'Pump Squad 2',
    '3:05 PM',
    true
  );
  const allowedReopen = reopenRoadSegment(
    closed.roadClosures,
    confirmedTasks,
    'road-sepadu-east',
    'Coordinator Amir',
    '3:06 PM'
  );
  assert.equal(allowedReopen.ok, true);

  // Approving alternative route fails without both confirmations, succeeds when confirmed
  const blockedApprove = approveOrWithdrawRoute(
    closed.routes,
    INITIAL_PPS_CENTERS,
    closed.roadClosures,
    'route-sri-muda-alt',
    'approve',
    { destinationPpsOpenConfirmed: true, routeFieldCheckedConfirmed: false },
    'Coordinator Nadia',
    '2:50 PM'
  );
  assert.equal(blockedApprove.ok, false);

  const approvedAlt = approveOrWithdrawRoute(
    closed.routes,
    INITIAL_PPS_CENTERS,
    closed.roadClosures,
    'route-sri-muda-alt',
    'approve',
    { destinationPpsOpenConfirmed: true, routeFieldCheckedConfirmed: true },
    'Coordinator Nadia',
    '2:52 PM'
  );
  assert.equal(approvedAlt.ok, true);
  assert.equal(
    approvedAlt.routes.find((r) => r.id === 'route-sri-muda-alt')?.status,
    'approved'
  );
});

test('closing a PPS shelter withdraws its evacuation routes and publishes an urgent shelter alert', () => {
  const closedPps = updatePpsShelterStatus(
    INITIAL_PPS_CENTERS,
    INITIAL_EVAC_ROUTES,
    INITIAL_NOTICES,
    'pps-1',
    { status: 'Closed', acceptingArrivals: false },
    'JKM Shelter Lead',
    '3:00 PM'
  );
  assert.deepEqual(closedPps.withdrawnRouteIds, ['route-sri-muda-main']);
  assert.equal(
    closedPps.routes.find((r) => r.id === 'route-sri-muda-main')?.status,
    'withdrawn'
  );
  assert.match(closedPps.notices[0].title, /stopped accepting arrivals/i);

  // Severity change alone does not touch instructions
  const updatedZones = updateHazardZoneSeverity(
    INITIAL_HAZARD_ZONES,
    'zone-sri-muda-flood',
    'critical',
    'Rising river level',
    'Coordinator Nadia',
    '3:01 PM'
  );
  assert.equal(updatedZones.find((z) => z.id === 'zone-sri-muda-flood')?.severity, 'critical');
});

test('buildAlertsForAccount filters private rescue alerts away from Guest while surfacing boat & pickup alerts to Resident and incidents to Admin', () => {
  const guestAlerts = buildAlertsForAccount({
    account: 'guest',
    cases: INITIAL_CASES,
    boats: INITIAL_BOATS,
    ppsCenters: INITIAL_PPS_CENTERS,
    roadClosures: INITIAL_ROAD_CLOSURES,
    outages: INITIAL_OUTAGES,
    hazardZones: INITIAL_HAZARD_ZONES,
    evacRoutes: INITIAL_EVAC_ROUTES,
    areaInstructions: INITIAL_AREA_INSTRUCTIONS,
    notices: INITIAL_NOTICES,
    incidents: INITIAL_COMMAND_INCIDENTS,
  });
  assert.equal(guestAlerts.some((a) => a.isPrivateRescue), false);
  assert.equal(guestAlerts.some((a) => a.headline.includes('Boat 04')), false);

  const residentAlerts = buildAlertsForAccount({
    account: 'resident',
    cases: INITIAL_CASES,
    boats: INITIAL_BOATS,
    ppsCenters: INITIAL_PPS_CENTERS,
    roadClosures: INITIAL_ROAD_CLOSURES,
    outages: INITIAL_OUTAGES,
    hazardZones: INITIAL_HAZARD_ZONES,
    evacRoutes: INITIAL_EVAC_ROUTES,
    areaInstructions: INITIAL_AREA_INSTRUCTIONS,
    notices: INITIAL_NOTICES,
    incidents: INITIAL_COMMAND_INCIDENTS,
  });
  assert.equal(
    residentAlerts.some((a) => a.headline.includes('Boat 04 is on the way')),
    true
  );

  const adminAlerts = buildAlertsForAccount({
    account: 'admin',
    cases: INITIAL_CASES,
    boats: INITIAL_BOATS,
    ppsCenters: INITIAL_PPS_CENTERS,
    roadClosures: INITIAL_ROAD_CLOSURES,
    outages: INITIAL_OUTAGES,
    hazardZones: INITIAL_HAZARD_ZONES,
    evacRoutes: INITIAL_EVAC_ROUTES,
    areaInstructions: INITIAL_AREA_INSTRUCTIONS,
    notices: INITIAL_NOTICES,
    incidents: INITIAL_COMMAND_INCIDENTS,
  });
  assert.equal(adminAlerts.some((a) => a.actionKind === 'review_case'), true);
});


// --- Validated pickup confirmation (Requirements 2.4, 2.5, 2.6, 2.7, 3.7, 3.8) ---

function boatsWithArrived(...arrivedIds: string[]) {
  return INITIAL_BOATS.map((b) =>
    arrivedIds.includes(b.id) ? { ...b, status: 'arrived' as const } : b
  );
}

test('confirmPersonPickedUp rejects an unknown case and leaves state unchanged', () => {
  const result = confirmPersonPickedUp(INITIAL_CASES, INITIAL_BOATS, 'case-missing', 'boat-04', '2:45 PM');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'case_not_found');
  assert.equal(result.error, 'Rescue request not found.');
  assert.equal(result.cases, INITIAL_CASES);
  assert.equal(result.boats, INITIAL_BOATS);
});

test('confirmPersonPickedUp rejects a case that is already picked up', () => {
  const boats = boatsWithArrived('boat-04');
  const cases = INITIAL_CASES.map((c) =>
    c.id === 'case-aminah' ? { ...c, status: 'picked_up' as const } : c
  );
  const result = confirmPersonPickedUp(cases, boats, 'case-aminah', 'boat-04', '2:45 PM');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'already_picked_up');
  assert.equal(result.error, 'Person has already been picked up.');
  assert.equal(result.cases, cases);
  assert.equal(result.boats, boats);
});

test('confirmPersonPickedUp rejects a boat not assigned to the case and records no crew lead', () => {
  const boats = boatsWithArrived('boat-09');
  const result = confirmPersonPickedUp(INITIAL_CASES, boats, 'case-aminah', 'boat-09', '2:45 PM');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'boat_not_assigned');
  assert.equal(result.error, 'Boat 09 is not assigned to this case.');
  assert.equal(result.cases, INITIAL_CASES);
  assert.equal(result.boats, boats);
  assert.equal(result.cases.find((c) => c.id === 'case-aminah')?.pickedUpBy, undefined);
});

test('confirmPersonPickedUp names a missing boat by its id', () => {
  const result = confirmPersonPickedUp(INITIAL_CASES, INITIAL_BOATS, 'case-aminah', 'boat-99', '2:45 PM');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'boat_not_assigned');
  assert.equal(result.error, 'boat-99 is not assigned to this case.');
});

test('confirmPersonPickedUp rejects an assigned boat that has not arrived', () => {
  const result = confirmPersonPickedUp(INITIAL_CASES, INITIAL_BOATS, 'case-aminah', 'boat-04', '2:45 PM');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'boat_not_arrived');
  assert.equal(
    result.error,
    'An assigned boat must be marked arrived first. Boat 04 is on the way.'
  );
  assert.equal(result.cases, INITIAL_CASES);
  assert.equal(result.boats, INITIAL_BOATS);
});

test('confirmPersonPickedUp records the crew lead of the confirming boat', () => {
  const boats = boatsWithArrived('boat-07');
  const result = confirmPersonPickedUp(INITIAL_CASES, boats, 'case-aminah', 'boat-07', '2:45 PM');
  assert.equal(result.ok, true);
  assert.equal(result.error, undefined);
  const aminah = result.cases.find((c) => c.id === 'case-aminah');
  assert.equal(aminah?.status, 'picked_up');
  assert.equal(aminah?.pickedUpBy, 'Kpl. Suresh Nair (Demo Crew)');
  const lastUpdate = aminah?.familyUpdates[aminah.familyUpdates.length - 1];
  assert.equal(lastUpdate?.sender, 'Kpl. Suresh Nair (Demo Crew)');
});

test('getPickupEligibility blocks a case with no assigned boat', () => {
  const result = getPickupEligibility(INITIAL_CASES, INITIAL_BOATS, 'case-devi');
  assert.deepEqual(result.arrivedBoats, []);
  assert.equal(result.blocker, 'No boat is assigned to this case yet.');
});

test('getPickupEligibility blocks a case whose assigned boats have not arrived', () => {
  const result = getPickupEligibility(INITIAL_CASES, INITIAL_BOATS, 'case-aminah');
  assert.deepEqual(result.arrivedBoats, []);
  assert.equal(result.blocker, 'Waiting for an assigned boat to be marked arrived.');
});

test('getPickupEligibility lists the single arrived boat', () => {
  const result = getPickupEligibility(INITIAL_CASES, boatsWithArrived('boat-07'), 'case-aminah');
  assert.deepEqual(result.arrivedBoats.map((b) => b.id), ['boat-07']);
  assert.equal(result.blocker, null);
});

test('getPickupEligibility lists several arrived boats in assignment order, ignoring unassigned ones', () => {
  const boats = boatsWithArrived('boat-12', 'boat-04', 'boat-09');
  const result = getPickupEligibility(INITIAL_CASES, boats, 'case-aminah');
  assert.deepEqual(result.arrivedBoats.map((b) => b.id), ['boat-04', 'boat-12']);
  assert.equal(result.blocker, null);
});

test('assignBoatToCase returns a reason code for each block with unchanged messages', () => {
  const notFound = assignBoatToCase(INITIAL_CASES, INITIAL_BOATS, 'case-missing', 'boat-15', '2:38 PM');
  assert.equal(notFound.reason, 'not_found');
  assert.equal(notFound.error, 'Case or boat not found.');

  const nonUrgent = INITIAL_CASES.map((c) =>
    c.id === 'case-kampung' ? { ...c, urgency: 'high' as const } : c
  );
  const unverified = assignBoatToCase(nonUrgent, INITIAL_BOATS, 'case-kampung', 'boat-15', '2:38 PM');
  assert.equal(unverified.reason, 'unverified');
  assert.match(unverified.error ?? '', /^Pickup point is unverified\./);

  const pickedUpCases = INITIAL_CASES.map((c) =>
    c.id === 'case-devi' ? { ...c, status: 'picked_up' as const } : c
  );
  const pickedUp = assignBoatToCase(pickedUpCases, INITIAL_BOATS, 'case-devi', 'boat-15', '2:38 PM');
  assert.equal(pickedUp.reason, 'picked_up');
  assert.equal(pickedUp.error, 'Person has already been picked up.');

  const duplicate = assignBoatToCase(INITIAL_CASES, INITIAL_BOATS, 'case-aminah', 'boat-04', '2:38 PM');
  assert.equal(duplicate.reason, 'duplicate');
  assert.equal(duplicate.error, 'Boat 04 is already assigned to this case.');

  const second = assignBoatToCase(INITIAL_CASES, INITIAL_BOATS, 'case-devi', 'boat-04', '2:38 PM');
  assert.equal(second.reason, 'second_destination');
  assert.match(second.error ?? '', /two active destinations/);

  const made = assignBoatToCase(INITIAL_CASES, INITIAL_BOATS, 'case-devi', 'boat-15', '2:38 PM');
  assert.equal(made.ok, true);
  assert.equal(made.reason, undefined);
});

test('verifyAndMovePickupPin sets verifiedAtMs once and keeps it on re-verification', () => {
  const payload = {
    pickupLandmark: 'Surau Al-Hidayah High Porch',
    coordinates: { lat: 3.0591, lng: 101.5528 },
    verifiedBy: 'Coordinator Nadia',
    timestamp: '2:40 PM',
  };
  const first = verifyAndMovePickupPin(INITIAL_CASES, INITIAL_BOATS, 'case-kampung', {
    ...payload,
    atMs: DRILL_T0,
  });
  assert.equal(first.cases.find((c) => c.id === 'case-kampung')?.verifiedAtMs, DRILL_T0);

  const again = verifyAndMovePickupPin(first.cases, first.boats, 'case-kampung', {
    ...payload,
    timestamp: '2:50 PM',
    atMs: DRILL_T0 + 10 * MINUTE_MS,
  });
  assert.equal(again.cases.find((c) => c.id === 'case-kampung')?.verifiedAtMs, DRILL_T0);

  const withoutMs = verifyAndMovePickupPin(INITIAL_CASES, INITIAL_BOATS, 'case-kampung', payload);
  const kampung = withoutMs.cases.find((c) => c.id === 'case-kampung');
  assert.equal(kampung !== undefined && 'verifiedAtMs' in kampung, false);
});

test('computeDrillComparison averages several measured requests to one decimal', () => {
  const cases = [
    measuredCase('m-1', DRILL_T0, DRILL_T0 + 4 * MINUTE_MS),
    measuredCase('m-2', DRILL_T0, DRILL_T0 + 6 * MINUTE_MS),
    measuredCase('m-3', DRILL_T0, DRILL_T0 + 8.5 * MINUTE_MS),
  ];
  const drill = computeDrillComparison(cases, [], INITIAL_DRILL_BASELINE);
  assert.deepEqual(drill.digitalVerify, { minutes: 6.2, requestsMeasured: 3 });
});

test('computeDrillComparison never calls a slower or equal result faster', () => {
  const baseline = { ...INITIAL_DRILL_BASELINE, paperVerifyMinutes: 28 };
  const slower = computeDrillComparison(
    [measuredCase('m-1', DRILL_T0, DRILL_T0 + 35 * MINUTE_MS)],
    [],
    baseline
  );
  assert.deepEqual(slower.headline, { direction: 'slower', percent: 25 });

  const same = computeDrillComparison(
    [measuredCase('m-1', DRILL_T0, DRILL_T0 + 28 * MINUTE_MS)],
    [],
    baseline
  );
  assert.deepEqual(same.headline, { direction: 'same', percent: 0 });
});

test('computeDrillComparison excludes seeded cases and incomplete or inverted epoch times', () => {
  const cases = [
    ...INITIAL_CASES,
    measuredCase('m-ok', DRILL_T0, DRILL_T0 + 5 * MINUTE_MS),
    measuredCase('m-report-only', DRILL_T0),
    measuredCase('m-verify-only', undefined, DRILL_T0),
    measuredCase('m-inverted', DRILL_T0 + 5 * MINUTE_MS, DRILL_T0),
  ];
  const drill = computeDrillComparison(cases, [], INITIAL_DRILL_BASELINE);
  assert.deepEqual(drill.digitalVerify, { minutes: 5, requestsMeasured: 1 });
});

test('drill events from real attempts give assignment and pickup counts', () => {
  const events: DrillEvent[] = [];
  const t = DRILL_T0;

  const made = assignBoatToCase(INITIAL_CASES, INITIAL_BOATS, 'case-devi', 'boat-15', '2:38 PM');
  events.push(drillEventForAssignment(made, t, 'case-devi', 'boat-15'));
  const second = assignBoatToCase(made.cases, made.boats, 'case-devi', 'boat-04', '2:38 PM');
  events.push(drillEventForAssignment(second, t, 'case-devi', 'boat-04'));
  const duplicate = assignBoatToCase(made.cases, made.boats, 'case-aminah', 'boat-04', '2:38 PM');
  events.push(drillEventForAssignment(duplicate, t, 'case-aminah', 'boat-04'));
  const missing = assignBoatToCase(made.cases, made.boats, 'case-missing', 'boat-04', '2:38 PM');
  events.push(drillEventForAssignment(missing, t, 'case-missing', 'boat-04'));

  assert.deepEqual(
    events.map((e) => e.kind),
    [
      'assignment_made',
      'assignment_blocked_second_destination',
      'assignment_blocked_duplicate',
      'assignment_blocked_other',
    ]
  );
  assert.deepEqual(events[0], { kind: 'assignment_made', atMs: t, caseId: 'case-devi', boatId: 'boat-15' });

  const notArrived = confirmPersonPickedUp(made.cases, made.boats, 'case-devi', 'boat-15', '2:40 PM');
  events.push(drillEventForPickup(notArrived, t, 'case-devi', 'boat-15'));
  const notAssigned = confirmPersonPickedUp(made.cases, made.boats, 'case-devi', 'boat-04', '2:40 PM');
  events.push(drillEventForPickup(notAssigned, t, 'case-devi', 'boat-04'));
  const arrived = advanceBoatStatus(made.boats, made.cases, 'boat-15', 'arrived', '2:44 PM');
  const confirmed = confirmPersonPickedUp(arrived.cases, arrived.boats, 'case-devi', 'boat-15', '2:45 PM');
  events.push(drillEventForPickup(confirmed, t, 'case-devi', 'boat-15'));
  const again = confirmPersonPickedUp(confirmed.cases, confirmed.boats, 'case-devi', 'boat-15', '2:46 PM');
  events.push(drillEventForPickup(again, t, 'case-devi', 'boat-15'));

  assert.deepEqual(
    events.slice(4).map((e) => e.kind),
    [
      'pickup_rejected_not_arrived',
      'pickup_rejected_not_assigned',
      'pickup_confirmed',
      'pickup_rejected_other',
    ]
  );

  const drill = computeDrillComparison(confirmed.cases, events, INITIAL_DRILL_BASELINE);
  assert.deepEqual(drill.digitalAssignments, { blocked: 2, attempts: 4 });
  assert.deepEqual(drill.digitalPickups, { blocked: 2, attempts: 4 });
});

test('isAppOnline is online only when the browser is online and the demo toggle is not offline', () => {
  assert.equal(isAppOnline(true, false), true);
  assert.equal(isAppOnline(true, true), false);
  assert.equal(isAppOnline(false, false), false);
  assert.equal(isAppOnline(false, true), false);
});

test('enqueueLocalDraft records createdAtMs and keeps ids unique after an item is removed', () => {
  const item = {
    actorRole: 'coordinator' as const,
    summary: 'Boat 04 marked arrived',
    payloadType: 'advance_boat' as const,
    payload: { boatId: 'boat-04', nextStatus: 'arrived' },
  };
  let queue = enqueueLocalDraft([], item, '2:40 PM', 1_000);
  queue = enqueueLocalDraft(queue, item, '2:40 PM', 2_000);
  assert.equal(queue[0].createdAtMs, 1_000);
  assert.equal(queue[0].createdAt, '2:40 PM');

  // Remove the first item (e.g. sent), then queue another at the same moment as the second.
  queue = queue.slice(1);
  queue = enqueueLocalDraft(queue, item, '2:40 PM', 2_000);
  assert.equal(new Set(queue.map((d) => d.id)).size, queue.length);

  // Without atMs (existing call style) ids still differ within the same minute.
  let legacy = enqueueLocalDraft([], item, '2:44 PM');
  legacy = enqueueLocalDraft(legacy, item, '2:44 PM');
  legacy = enqueueLocalDraft(legacy.slice(1), item, '2:44 PM');
  assert.equal(legacy[0].createdAtMs, undefined);
  assert.equal(new Set(legacy.map((d) => d.id)).size, legacy.length);
});

test('applyFamilyLocationChange updates only the target case and adds the family message', () => {
  const coords = { lat: 3.07, lng: 101.52 };
  const next = applyFamilyLocationChange(
    INITIAL_CASES,
    'case-aminah',
    'Surau Al-Ikhlas gate',
    'Daughter (Siti)',
    coords,
    '2:45 PM'
  );
  const aminah = next.find((c) => c.id === 'case-aminah')!;
  assert.equal(aminah.pickupLandmark, 'Surau Al-Ikhlas gate');
  assert.deepEqual(aminah.coordinates, coords);
  assert.equal(aminah.confirmedByWho, 'Daughter (Siti)');
  assert.equal(aminah.confirmedWhen, '2:45 PM');
  assert.equal(aminah.syncState, 'synced');
  const last = aminah.familyUpdates[aminah.familyUpdates.length - 1];
  assert.equal(last.timestamp, '2:45 PM');
  assert.equal(
    last.text,
    'Updated pickup point to "Surau Al-Ikhlas gate" (confirmed by Daughter (Siti)).'
  );
  next
    .filter((c) => c.id !== 'case-aminah')
    .forEach((c) => assert.equal(c, INITIAL_CASES.find((o) => o.id === c.id)));

  const keepCoords = applyFamilyLocationChange(
    INITIAL_CASES,
    'case-aminah',
    'Same pin',
    'Siti',
    undefined,
    '2:46 PM'
  ).find((c) => c.id === 'case-aminah')!;
  assert.deepEqual(
    keepCoords.coordinates,
    INITIAL_CASES.find((c) => c.id === 'case-aminah')!.coordinates
  );
});

test('moveCasePin moves the pin and stamps confirmedWhen without touching other cases', () => {
  const point = { lat: 3.071, lng: 101.521 };
  const next = moveCasePin(INITIAL_CASES, 'case-lim', point, '2:47 PM');
  const lim = next.find((c) => c.id === 'case-lim')!;
  const before = INITIAL_CASES.find((c) => c.id === 'case-lim')!;
  assert.deepEqual(lim.coordinates, point);
  assert.equal(lim.confirmedWhen, '2:47 PM');
  assert.equal(lim.syncState, before.syncState);
  assert.equal(lim.pickupLandmark, before.pickupLandmark);
  next
    .filter((c) => c.id !== 'case-lim')
    .forEach((c) => assert.equal(c, INITIAL_CASES.find((o) => o.id === c.id)));
});

// --- Offline queue ("Waiting to send"): applyQueuedActions, projectQueuedState, getQueuedTargets ---

const queueState = (): QueueState => ({
  cases: INITIAL_CASES,
  boats: INITIAL_BOATS,
  roadClosures: INITIAL_ROAD_CLOSURES,
  outages: INITIAL_OUTAGES,
});

const queued = <K extends QueuedActionType>(
  id: string,
  payloadType: K,
  payload: QueuedPayloadByType[K],
  createdAt: string,
  createdAtMs?: number
): LocalDraftAction => ({
  id,
  payloadType,
  payload: payload as Record<string, unknown>,
  createdAt,
  createdAtMs,
  actorRole: 'coordinator',
  summary: `${payloadType} ${id}`,
});

const SENT = { at: '3:05 PM', atMs: 9_000_000 };

/** Removes generated message ids (they include Date.now()) so two runs can be compared. */
const stripIds = (value: unknown) =>
  JSON.parse(JSON.stringify(value, (k, v) => (k === 'id' && typeof v === 'string' && /\d{10,}/.test(v) ? '' : v)));

test('offline: queued arrival then pickup are applied in order with their original times', () => {
  const drafts = [
    queued('q1', 'advance_boat', { boatId: 'boat-04', nextStatus: 'arrived' }, '2:40 PM', 1_000),
    queued('q2', 'confirm_pickup', { caseId: 'case-aminah', boatId: 'boat-04' }, '2:41 PM', 2_000),
  ];
  const res = applyQueuedActions(queueState(), drafts, SENT);

  assert.deepEqual(res.sentIds, ['q1', 'q2']);
  assert.deepEqual(res.remaining, []);
  const aminah = res.state.cases.find((c) => c.id === 'case-aminah')!;
  assert.equal(aminah.status, 'picked_up');
  assert.equal(aminah.pickedUpAt, '2:41 PM');
  assert.equal(aminah.pickedUpBy, INITIAL_BOATS.find((b) => b.id === 'boat-04')!.crewLead);
  assert.equal(res.state.boats.find((b) => b.id === 'boat-04')!.lastUpdatedAt, '2:41 PM');
  assert.deepEqual(res.events, [
    { kind: 'pickup_confirmed', atMs: 2_000, caseId: 'case-aminah', boatId: 'boat-04' },
  ]);
  // Cases no sent item touched are unchanged
  assert.deepEqual(
    res.state.cases.find((c) => c.id === 'case-devi'),
    INITIAL_CASES.find((c) => c.id === 'case-devi')
  );
});

test('offline: queued new_case is inserted with its original time; a duplicate id is rejected', () => {
  const rescueCase = { ...INITIAL_CASES.find((c) => c.id === 'case-devi')!, id: 'case-offline-1' };
  const drafts = [
    queued('q1', 'new_case', { rescueCase }, '2:40 PM', 1_000),
    queued('q2', 'new_case', { rescueCase }, '2:42 PM', 3_000),
  ];
  const res = applyQueuedActions(queueState(), drafts, SENT);

  assert.deepEqual(res.sentIds, ['q1']);
  assert.equal(res.state.cases[0].id, 'case-offline-1');
  assert.equal(res.state.cases[0].reportedAt, '2:40 PM');
  assert.equal(res.state.cases[0].reportedAtMs, 1_000);
  assert.match(
    res.state.cases[0].familyUpdates.at(-1)!.text,
    /^Request made offline at 2:40 PM; sent at 3:05 PM\. Coordinator will review/
  );
  assert.equal(res.state.cases.length, INITIAL_CASES.length + 1);
  assert.equal(res.remaining.length, 1);
  assert.equal(res.remaining[0].id, 'q2');
  assert.equal(res.remaining[0].error, 'This request was already sent.');
});

test('offline: queued report_issue adds a road closure or outage; an existing id is rejected', () => {
  const road = { ...INITIAL_ROAD_CLOSURES[0], id: 'road-offline-1' };
  const outage = { ...INITIAL_OUTAGES[0], id: 'outage-offline-1' };
  const drafts = [
    queued('q1', 'report_issue', { issueKind: 'road', roadClosure: road }, '2:40 PM'),
    queued('q2', 'report_issue', { issueKind: 'outage', outage }, '2:41 PM'),
    queued('q3', 'report_issue', { issueKind: 'road', roadClosure: INITIAL_ROAD_CLOSURES[0] }, '2:42 PM'),
  ];
  const res = applyQueuedActions(queueState(), drafts, SENT);

  assert.deepEqual(res.sentIds, ['q1', 'q2']);
  assert.equal(res.state.roadClosures[0].id, 'road-offline-1');
  assert.equal(res.state.outages[0].id, 'outage-offline-1');
  assert.equal(res.state.roadClosures.length, INITIAL_ROAD_CLOSURES.length + 1);
  assert.deepEqual(res.remaining.map((r) => [r.id, r.error]), [['q3', 'This request was already sent.']]);
});

test('offline: queued update_location applies family change and pin move; missing case or boat is rejected', () => {
  const point = { lat: 3.05, lng: 101.55 };
  const drafts = [
    queued(
      'q1',
      'update_location',
      { caseId: 'case-lim', mode: 'family_change', pickupLandmark: 'Surau Al-Ikhlas', confirmedBy: 'Daughter' },
      '2:40 PM'
    ),
    queued(
      'q2',
      'update_location',
      { caseId: 'case-salma', mode: 'pin_move', pickupLandmark: 'x', confirmedBy: 'Coordinator', coords: point },
      '2:41 PM'
    ),
    queued(
      'q3',
      'update_location',
      { caseId: 'case-missing', mode: 'family_change', pickupLandmark: 'x', confirmedBy: 'x' },
      '2:42 PM'
    ),
    queued('q4', 'advance_boat', { boatId: 'boat-missing', nextStatus: 'arrived' }, '2:43 PM'),
  ];
  const res = applyQueuedActions(queueState(), drafts, SENT);

  assert.deepEqual(res.sentIds, ['q1', 'q2']);
  const lim = res.state.cases.find((c) => c.id === 'case-lim')!;
  assert.equal(lim.pickupLandmark, 'Surau Al-Ikhlas');
  assert.equal(lim.confirmedWhen, '2:40 PM');
  const salma = res.state.cases.find((c) => c.id === 'case-salma')!;
  assert.deepEqual(salma.coordinates, point);
  assert.equal(salma.confirmedWhen, '2:41 PM');
  assert.deepEqual(
    res.remaining.map((r) => [r.id, r.error]),
    [
      ['q3', 'Rescue request not found.'],
      ['q4', 'Boat not found.'],
    ]
  );
});

test('offline: a rejected pickup stays queued while later items apply, and its rejection is counted once', () => {
  const drafts = [
    queued('q1', 'confirm_pickup', { caseId: 'case-lim', boatId: 'boat-12' }, '2:40 PM', 1_000),
    queued('q2', 'advance_boat', { boatId: 'boat-09', nextStatus: 'arrived' }, '2:41 PM', 2_000),
  ];
  const first = applyQueuedActions(queueState(), drafts, SENT);

  assert.deepEqual(first.sentIds, ['q2']);
  assert.equal(first.remaining.length, 1);
  assert.equal(first.remaining[0].id, 'q1');
  assert.equal(first.remaining[0].error, 'Boat 12 is not assigned to this case.');
  assert.equal(first.state.boats.find((b) => b.id === 'boat-09')!.status, 'arrived');
  assert.equal(first.state.cases.find((c) => c.id === 'case-lim')!.status, 'assigned');
  assert.deepEqual(first.events, [
    { kind: 'pickup_rejected_not_assigned', atMs: 1_000, caseId: 'case-lim', boatId: 'boat-12' },
  ]);

  const second = applyQueuedActions(first.state, first.remaining, { at: '3:10 PM', atMs: 9_500_000 });
  assert.deepEqual(second.sentIds, []);
  assert.equal(second.remaining.length, 1);
  assert.deepEqual(second.events, []);
});

test('offline: projectQueuedState matches applyQueuedActions state and does not change its inputs', () => {
  const state = queueState();
  const drafts = [
    queued('q1', 'advance_boat', { boatId: 'boat-07', nextStatus: 'arrived' }, '2:40 PM', 1_000),
    queued('q2', 'confirm_pickup', { caseId: 'case-lim', boatId: 'boat-07' }, '2:41 PM', 2_000),
    queued('q3', 'confirm_pickup', { caseId: 'case-devi', boatId: 'boat-15' }, '2:42 PM', 3_000),
  ];
  const stateBefore = structuredClone(state);
  const draftsBefore = structuredClone(drafts);

  const projected = projectQueuedState(state, drafts);
  const applied = applyQueuedActions(state, drafts, { at: '', atMs: 0 }).state;

  assert.deepEqual(stripIds(projected), stripIds(applied));
  assert.equal(projected.cases.find((c) => c.id === 'case-lim')!.status, 'picked_up');
  assert.deepEqual(state, stateBefore);
  assert.deepEqual(drafts, draftsBefore);
});

test('offline: getQueuedTargets lists case and boat ids referenced by the queue', () => {
  const rescueCase = { ...INITIAL_CASES[0], id: 'case-offline-2' };
  const targets = getQueuedTargets([
    queued('q1', 'new_case', { rescueCase }, '2:40 PM'),
    queued('q2', 'advance_boat', { boatId: 'boat-04', nextStatus: 'arrived' }, '2:41 PM'),
    queued('q3', 'confirm_pickup', { caseId: 'case-aminah', boatId: 'boat-07' }, '2:42 PM'),
    queued(
      'q4',
      'update_location',
      { caseId: 'case-lim', mode: 'family_change', pickupLandmark: 'x', confirmedBy: 'x' },
      '2:43 PM'
    ),
  ]);
  assert.deepEqual([...targets.caseIds].sort(), ['case-aminah', 'case-lim', 'case-offline-2']);
  assert.deepEqual([...targets.boatIds].sort(), ['boat-04', 'boat-07']);
});
