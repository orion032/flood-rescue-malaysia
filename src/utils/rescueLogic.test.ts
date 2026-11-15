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
  enqueueLocalDraft,
  findZonesAtPoint,
  formatFamilyMemberStatus,
  getHazardColor,
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
} from './rescueLogic';

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
    '2:45 PM',
    'Sgt. Faizal Hamid'
  );

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

test('computeDrillComparison passes zero false rescues and zero duplicates', () => {
  const drill = computeDrillComparison(INITIAL_CASES, INITIAL_BOATS, INITIAL_DRILL_BASELINE);
  assert.equal(drill.digitalDuplicateAssignments, 0);
  assert.equal(drill.digitalFalseRescuedCount, 0);
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
  assert.equal(adminData.visibleBoats.length, 4);
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

