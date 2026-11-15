import {
  AreaInstruction,
  AreaNotice,
  BoatStatus,
  BoatSupply,
  BoatUnit,
  CommandIncident,
  CommandTask,
  DemoAccountId,
  DemoRole,
  DrillBaseline,
  GeoPoint,
  HazardSeverity,
  HazardType,
  HazardZone,
  LocalDraftAction,
  OfficialWarning,
  PPSCenter,
  PowerOutageZone,
  RescueCase,
  RoadClosure,
  SupplyDepot,
  TaskStage,
  UrgencyLevel,
  VerifiedEvacuationRoute,
} from '../types/rescue';
import { HAZARD_PALETTES } from '../data/seedData';

export interface RedactedCaseView {
  id: string;
  displayName: string;
  householdCount: number;
  postcode: string;
  areaName: string;
  pickupLandmark: string;
  displayAddress: string;
  displayCallbackPhone: string;
  displayReporter: string;
  reportSource: string;
  currentDanger: string;
  abilityToEvacuate: string;
  coordinates: GeoPoint;
  isExactLocationHidden: boolean;
  isCallbackHidden: boolean;
  status: RescueCase['status'];
  urgency: RescueCase['urgency'];
  priorityConfirmed?: boolean;
  priorityReason?: string;
  priorityConfirmedBy?: string;
  priorityConfirmedAt?: string;
  okuNeeds: RescueCase['okuNeeds'];
  locationVerified: boolean;
  assignedBoatIds: string[];
  assignedCrewNames?: string[];
  lastContactTime: string;
  reportedAt: string;
  confirmedByWho: string;
  confirmedWhen: string;
  notes: string;
  caseOwner?: string;
  followUpAction?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  pickedUpAt?: string;
  pickedUpBy?: string;
  syncState: RescueCase['syncState'];
}

export function redactCaseForRole(
  rescueCase: RescueCase,
  role: DemoRole,
  ownedCaseIds: string[] = ['case-aminah'],
  boats: BoatUnit[] = []
): RedactedCaseView {
  const isCoordinator = role === 'coordinator';
  const isFamilyOwner = role === 'resident' && ownedCaseIds.includes(rescueCase.id);
  const assignedCrewNames = isCoordinator
    ? boats
        .filter((b) => rescueCase.assignedBoatIds.includes(b.id))
        .map((b) => `${b.name} (${b.crewLead})`)
    : undefined;

  if (isCoordinator) {
    return {
      id: rescueCase.id,
      displayName: rescueCase.affectedPersonName,
      householdCount: rescueCase.householdCount,
      postcode: rescueCase.postcode,
      areaName: rescueCase.areaName,
      pickupLandmark: rescueCase.pickupLandmark,
      displayAddress: rescueCase.lastSeenLocation,
      displayCallbackPhone: rescueCase.reporterCallbackPhone,
      displayReporter: `${rescueCase.reporterName} (${rescueCase.reporterLocation})`,
      reportSource: rescueCase.reportSource,
      currentDanger: rescueCase.priorityFacts.reportedDanger,
      abilityToEvacuate: rescueCase.priorityFacts.abilityToEvacuate,
      coordinates: rescueCase.coordinates,
      isExactLocationHidden: false,
      isCallbackHidden: false,
      status: rescueCase.status,
      urgency: rescueCase.urgency,
      priorityConfirmed: rescueCase.priorityConfirmed,
      priorityReason: rescueCase.priorityReason,
      priorityConfirmedBy: rescueCase.priorityConfirmedBy,
      priorityConfirmedAt: rescueCase.priorityConfirmedAt,
      okuNeeds: rescueCase.okuNeeds,
      locationVerified: rescueCase.locationVerified,
      assignedBoatIds: rescueCase.assignedBoatIds,
      assignedCrewNames,
      lastContactTime: rescueCase.lastContactTime,
      reportedAt: rescueCase.reportedAt,
      confirmedByWho: rescueCase.confirmedByWho,
      confirmedWhen: rescueCase.confirmedWhen,
      notes: rescueCase.notes,
      caseOwner: rescueCase.caseOwner,
      followUpAction: rescueCase.followUpAction,
      verifiedBy: rescueCase.verifiedBy,
      verifiedAt: rescueCase.verifiedAt,
      pickedUpAt: rescueCase.pickedUpAt,
      pickedUpBy: rescueCase.pickedUpBy,
      syncState: rescueCase.syncState,
    };
  }

  if (isFamilyOwner) {
    return {
      id: rescueCase.id,
      displayName: `${rescueCase.relationshipLabel} (${rescueCase.affectedPersonName})`,
      householdCount: rescueCase.householdCount,
      postcode: rescueCase.postcode,
      areaName: rescueCase.areaName,
      pickupLandmark: rescueCase.pickupLandmark,
      displayAddress: rescueCase.lastSeenLocation,
      displayCallbackPhone: rescueCase.reporterCallbackPhone,
      displayReporter: rescueCase.reporterName,
      reportSource: rescueCase.reportSource,
      currentDanger: rescueCase.priorityFacts.reportedDanger,
      abilityToEvacuate: rescueCase.priorityFacts.abilityToEvacuate,
      coordinates: rescueCase.coordinates,
      isExactLocationHidden: false,
      isCallbackHidden: false,
      status: rescueCase.status,
      urgency: rescueCase.urgency,
      priorityConfirmed: rescueCase.priorityConfirmed,
      priorityReason: rescueCase.priorityReason,
      priorityConfirmedBy: rescueCase.priorityConfirmedBy,
      priorityConfirmedAt: rescueCase.priorityConfirmedAt,
      okuNeeds: rescueCase.okuNeeds,
      locationVerified: rescueCase.locationVerified,
      assignedBoatIds: rescueCase.assignedBoatIds,
      lastContactTime: rescueCase.lastContactTime,
      reportedAt: rescueCase.reportedAt,
      confirmedByWho: rescueCase.confirmedByWho,
      confirmedWhen: rescueCase.confirmedWhen,
      notes: rescueCase.notes,
      caseOwner: rescueCase.caseOwner,
      followUpAction: rescueCase.followUpAction,
      verifiedBy: rescueCase.verifiedBy,
      verifiedAt: rescueCase.verifiedAt,
      pickedUpAt: rescueCase.pickedUpAt,
      pickedUpBy: rescueCase.pickedUpBy,
      syncState: rescueCase.syncState,
    };
  }

  // Public / non-owner Resident view: hide personal contact details & precise household address
  return {
    id: rescueCase.id,
    displayName: `${rescueCase.areaName} (${rescueCase.householdCount} pax)`,
    householdCount: rescueCase.householdCount,
    postcode: rescueCase.postcode,
    areaName: rescueCase.areaName,
    pickupLandmark: rescueCase.pickupLandmark,
    displayAddress: 'Precise household location hidden on public map (coordinator only)',
    displayCallbackPhone: 'Personal contact hidden on public map',
    displayReporter: 'Verified family / community report',
    reportSource: 'Community report',
    currentDanger: rescueCase.priorityFacts.reportedDanger,
    abilityToEvacuate: rescueCase.priorityFacts.abilityToEvacuate,
    coordinates: rescueCase.publicSectorCoordinates,
    isExactLocationHidden: true,
    isCallbackHidden: true,
    status: rescueCase.status,
    urgency: rescueCase.urgency,
    priorityConfirmed: rescueCase.priorityConfirmed,
    okuNeeds: rescueCase.okuNeeds,
    locationVerified: rescueCase.locationVerified,
    assignedBoatIds: rescueCase.assignedBoatIds,
    lastContactTime: rescueCase.lastContactTime,
    reportedAt: rescueCase.reportedAt,
    confirmedByWho: 'Sector summary',
    confirmedWhen: rescueCase.confirmedWhen,
    notes:
      rescueCase.okuNeeds.length > 0
        ? `Evacuation assistance noted (${rescueCase.okuNeeds.length})`
        : 'Boat pickup requested',
    caseOwner: undefined,
    followUpAction: undefined,
    verifiedBy: rescueCase.verifiedBy ? 'Rescue Coordinator' : undefined,
    verifiedAt: rescueCase.verifiedAt,
    pickedUpAt: rescueCase.pickedUpAt,
    pickedUpBy: undefined,
    syncState: rescueCase.syncState,
  };
}

export function verifyAndMovePickupPin(
  cases: RescueCase[],
  boats: BoatUnit[],
  caseId: string,
  payload: {
    pickupLandmark: string;
    coordinates: GeoPoint;
    verifiedBy: string;
    timestamp: string;
    confirmedByWho?: string;
  }
): { cases: RescueCase[]; boats: BoatUnit[] } {
  const target = cases.find((c) => c.id === caseId);
  const oldLandmark = target?.pickupLandmark;
  const newLandmark = payload.pickupLandmark.trim() || oldLandmark || 'Verified pickup point';

  const updatedCases = cases.map((c) => {
    if (c.id !== caseId) return c;
    const nextStatus =
      c.status === 'unverified' || c.status === 'welfare_check' ? 'confirmed' : c.status;
    return {
      ...c,
      pickupLandmark: newLandmark,
      coordinates: payload.coordinates,
      locationVerified: true,
      verifiedBy: payload.verifiedBy,
      verifiedAt: payload.timestamp,
      confirmedByWho: payload.confirmedByWho?.trim() || c.confirmedByWho,
      confirmedWhen: payload.timestamp,
      status: nextStatus,
      familyUpdates: [
        ...c.familyUpdates,
        {
          id: `upd-${Date.now()}-${c.familyUpdates.length}`,
          timestamp: payload.timestamp,
          sender: payload.verifiedBy,
          text: `Pickup pin verified at "${newLandmark}".`,
        },
      ],
    };
  });

  // Keep any boats already assigned to this case aligned with the updated pickup point name
  const updatedBoats = boats.map((b) => {
    if (!b.assignedCaseIds.includes(caseId)) return b;
    return {
      ...b,
      assignedPickupPoint: newLandmark,
    };
  });

  return { cases: updatedCases, boats: updatedBoats };
}

export function assignOwnerAndFollowUp(
  cases: RescueCase[],
  caseId: string,
  ownerName: string,
  followUpAction: string
): RescueCase[] {
  return cases.map((c) => {
    if (c.id !== caseId) return c;
    return {
      ...c,
      caseOwner: ownerName.trim() || c.caseOwner,
      followUpAction: followUpAction.trim() || c.followUpAction,
      status: c.status === 'unverified' ? 'welfare_check' : c.status,
    };
  });
}

export function confirmCasePriority(
  cases: RescueCase[],
  caseId: string,
  urgency: UrgencyLevel,
  reason: string,
  confirmedBy: string,
  timestamp: string
): RescueCase[] {
  const cleanReason = reason.trim() || 'Coordinator priority review';
  return cases.map((c) => {
    if (c.id !== caseId) return c;
    return {
      ...c,
      urgency,
      priorityConfirmed: true,
      priorityReason: cleanReason,
      priorityConfirmedBy: confirmedBy,
      priorityConfirmedAt: timestamp,
    };
  });
}

export interface AssignmentResult {
  ok: boolean;
  error?: string;
  cases: RescueCase[];
  boats: BoatUnit[];
}

export function assignBoatToCase(
  cases: RescueCase[],
  boats: BoatUnit[],
  caseId: string,
  boatId: string,
  timestamp: string
): AssignmentResult {
  const targetCase = cases.find((c) => c.id === caseId);
  const targetBoat = boats.find((b) => b.id === boatId);

  if (!targetCase || !targetBoat) {
    return { ok: false, error: 'Case or boat not found.', cases, boats };
  }

  if (!targetCase.locationVerified && targetCase.urgency !== 'critical') {
    return {
      ok: false,
      error:
        'Pickup point is unverified. Assign an owner to confirm the location, or confirm Urgent priority first to dispatch while verifying.',
      cases,
      boats,
    };
  }

  if (targetCase.status === 'picked_up') {
    return {
      ok: false,
      error: 'Person has already been picked up.',
      cases,
      boats,
    };
  }

  if (targetCase.assignedBoatIds.includes(boatId)) {
    return {
      ok: false,
      error: `${targetBoat.name} is already assigned to this case.`,
      cases,
      boats,
    };
  }

  // Enforce: prevent a boat from being assigned to two active destinations at once
  if (
    targetBoat.status !== 'available' &&
    targetBoat.assignedPickupPoint !== null &&
    targetBoat.assignedPickupPoint !== targetCase.pickupLandmark
  ) {
    return {
      ok: false,
      error: `${targetBoat.name} is currently assigned to "${targetBoat.assignedPickupPoint}". A boat cannot be assigned to two active destinations at once.`,
      cases,
      boats,
    };
  }

  const nextBoatStatus: BoatStatus =
    targetBoat.status === 'available' ? 'preparing' : targetBoat.status;
  const isUrgentWhileUnverified = !targetCase.locationVerified && targetCase.urgency === 'critical';

  const updatedCases = cases.map((c) => {
    if (c.id !== caseId) return c;
    return {
      ...c,
      assignedBoatIds: [...c.assignedBoatIds, boatId],
      status:
        c.status === 'confirmed' || isUrgentWhileUnverified
          ? ('assigned' as const)
          : c.status,
      caseOwner: c.caseOwner || (isUrgentWhileUnverified ? 'Field Scout / Dispatch' : c.caseOwner),
      followUpAction:
        c.followUpAction ||
        (isUrgentWhileUnverified ? 'Verify exact pickup pin while boat is en route' : c.followUpAction),
      familyUpdates: [
        ...c.familyUpdates,
        {
          id: `upd-${Date.now()}-${c.familyUpdates.length}`,
          timestamp,
          sender: 'Dispatch Desk',
          text: isUrgentWhileUnverified
            ? `Urgent dispatch: ${targetBoat.name} sent toward ${targetCase.pickupLandmark} while verification continues.`
            : `${targetBoat.name} assigned to ${targetCase.pickupLandmark}.`,
        },
      ],
    };
  });

  const updatedBoats = boats.map((b) => {
    if (b.id !== boatId) return b;
    return {
      ...b,
      status: nextBoatStatus,
      assignedPickupPoint: targetCase.pickupLandmark,
      assignedCaseIds: b.assignedCaseIds.includes(caseId)
        ? b.assignedCaseIds
        : [...b.assignedCaseIds, caseId],
      lastUpdatedAt: timestamp,
      savedAssignmentNote: `Assigned to ${targetCase.pickupLandmark} for ${targetCase.affectedPersonName}${
        targetCase.okuNeeds.length > 0 ? ` (${targetCase.okuNeeds[0]})` : ''
      }.`,
    };
  });

  return { ok: true, cases: updatedCases, boats: updatedBoats };
}

export function advanceBoatStatus(
  boats: BoatUnit[],
  cases: RescueCase[],
  boatId: string,
  nextStatus: BoatStatus,
  timestamp: string,
  crewEta?: string
): { boats: BoatUnit[]; cases: RescueCase[] } {
  const boat = boats.find((b) => b.id === boatId);
  if (!boat) return { boats, cases };

  const targetCase = cases.find((c) => boat.assignedCaseIds.includes(c.id));

  const updatedBoats = boats.map((b) => {
    if (b.id !== boatId) return b;

    let nextPosition = b.position;
    if (nextStatus === 'on_the_way' && targetCase) {
      nextPosition = {
        lat: Number(((b.position.lat + targetCase.coordinates.lat) / 2).toFixed(5)),
        lng: Number(((b.position.lng + targetCase.coordinates.lng) / 2).toFixed(5)),
      };
    } else if (nextStatus === 'arrived' && targetCase) {
      nextPosition = {
        lat: Number((targetCase.coordinates.lat - 0.0003).toFixed(5)),
        lng: Number((targetCase.coordinates.lng - 0.0003).toFixed(5)),
      };
    } else if (nextStatus === 'available') {
      nextPosition = { lat: 3.0358, lng: 101.5408 };
    }

    const nextEta =
      nextStatus === 'available' || nextStatus === 'arrived'
        ? undefined
        : crewEta !== undefined
        ? crewEta.trim() || undefined
        : b.eta;

    return {
      ...b,
      status: nextStatus,
      position: nextPosition,
      lastUpdatedAt: timestamp,
      eta: nextEta,
      assignedPickupPoint: nextStatus === 'available' ? null : b.assignedPickupPoint,
      assignedCaseIds: nextStatus === 'available' ? [] : b.assignedCaseIds,
    };
  });

  // Note: Boat arrived updates case to 'boat_arrived', NOT 'picked_up'.
  // When a boat is marked 'available', detach it from waiting cases cleanly.
  const updatedCases = cases.map((c) => {
    if (nextStatus === 'available' && c.assignedBoatIds.includes(boatId)) {
      const remaining = c.assignedBoatIds.filter((id) => id !== boatId);
      return {
        ...c,
        assignedBoatIds: remaining,
        status:
          remaining.length === 0 && (c.status === 'assigned' || c.status === 'boat_arrived')
            ? ('confirmed' as const)
            : c.status,
      };
    }
    if (!boat.assignedCaseIds.includes(c.id)) return c;
    if (nextStatus === 'arrived' && c.status === 'assigned') {
      return {
        ...c,
        status: 'boat_arrived' as const,
        familyUpdates: [
          ...c.familyUpdates,
          {
            id: `arr-${Date.now()}-${c.familyUpdates.length}`,
            timestamp,
            sender: boat.name,
            text: `${boat.name} arrived at ${c.pickupLandmark}. Awaiting boarding confirmation.`,
          },
        ],
      };
    }
    return c;
  });

  return { boats: updatedBoats, cases: updatedCases };
}

export function confirmPersonPickedUp(
  cases: RescueCase[],
  boats: BoatUnit[],
  caseId: string,
  boatId: string,
  timestamp: string,
  crewLead: string
): { cases: RescueCase[]; boats: BoatUnit[] } {
  const updatedCases = cases.map((c) => {
    if (c.id !== caseId) return c;
    return {
      ...c,
      status: 'picked_up' as const,
      pickedUpAt: timestamp,
      pickedUpBy: crewLead,
      familyUpdates: [
        ...c.familyUpdates,
        {
          id: `pk-${Date.now()}-${c.familyUpdates.length}`,
          timestamp,
          sender: crewLead,
          text: `Person picked up confirmed at ${timestamp}. En route to PPS shelter.`,
        },
      ],
    };
  });

  // Other waiting households at the same entrance remain open on the boat manifest
  const remainingWaitingAtBoat = updatedCases.filter(
    (c) => c.assignedBoatIds.includes(boatId) && c.status !== 'picked_up'
  );

  const updatedBoats = boats.map((b) => {
    if (b.id !== boatId) return b;
    const allDone = remainingWaitingAtBoat.length === 0;
    return {
      ...b,
      status: allDone ? ('available' as const) : b.status,
      assignedPickupPoint: allDone ? null : b.assignedPickupPoint,
      assignedCaseIds: remainingWaitingAtBoat.map((c) => c.id),
      lastUpdatedAt: timestamp,
      eta: allDone ? undefined : b.eta,
    };
  });

  return { cases: updatedCases, boats: updatedBoats };
}

export function sendFamilyUpdate(
  cases: RescueCase[],
  caseId: string,
  sender: string,
  text: string,
  timestamp: string
): RescueCase[] {
  if (!text.trim()) return cases;
  return cases.map((c) => {
    if (c.id !== caseId) return c;
    return {
      ...c,
      familyUpdates: [
        ...c.familyUpdates,
        {
          id: `msg-${Date.now()}-${c.familyUpdates.length}`,
          timestamp,
          sender,
          text: text.trim(),
        },
      ],
    };
  });
}

export interface PickupPointSummary {
  pickupPoint: string;
  assignedBoats: BoatUnit[];
  onTheWayCount: number;
  preparingCount: number;
  arrivedCount: number;
  waitingHouseholds: RescueCase[];
  pickedUpHouseholds: RescueCase[];
}

export function getPickupPointSummary(
  cases: RescueCase[],
  boats: BoatUnit[],
  pickupPoint: string
): PickupPointSummary {
  const matchingCases = cases.filter((c) => c.pickupLandmark === pickupPoint);
  const assignedBoats = boats.filter((b) => b.assignedPickupPoint === pickupPoint);

  return {
    pickupPoint,
    assignedBoats,
    onTheWayCount: assignedBoats.filter((b) => b.status === 'on_the_way').length,
    preparingCount: assignedBoats.filter((b) => b.status === 'preparing').length,
    arrivedCount: assignedBoats.filter((b) => b.status === 'arrived').length,
    waitingHouseholds: matchingCases.filter((c) => c.status !== 'picked_up'),
    pickedUpHouseholds: matchingCases.filter((c) => c.status === 'picked_up'),
  };
}

export function formatFamilyMemberStatus(rescueCase: RescueCase): string {
  switch (rescueCase.status) {
    case 'unverified':
      return 'Location check in progress';
    case 'welfare_check':
      return 'Welfare & location check assigned';
    case 'confirmed':
      return 'Pickup point verified · Waiting for boat assignment';
    case 'assigned':
      return 'Awaiting pickup';
    case 'boat_arrived':
      return 'Boat arrived — awaiting boarding confirmation';
    case 'picked_up':
      return `Person picked up (${rescueCase.pickedUpAt ?? 'Confirmed'})`;
  }
}

export function enqueueLocalDraft(
  drafts: LocalDraftAction[],
  draft: Omit<LocalDraftAction, 'id' | 'createdAt'>,
  timestamp: string
): LocalDraftAction[] {
  return [
    ...drafts,
    {
      ...draft,
      id: `draft-${drafts.length + 1}-${timestamp.replace(/\W+/g, '')}`,
      createdAt: timestamp,
    },
  ];
}

export interface DrillComparisonResult {
  paperVerifyMinutes: number;
  digitalVerifyMinutes: number;
  verifyTimeReductionPct: number;
  paperDuplicateAssignments: number;
  digitalDuplicateAssignments: number;
  paperFalseRescuedCount: number;
  digitalFalseRescuedCount: number;
}

export function computeDrillComparison(
  cases: RescueCase[],
  boats: BoatUnit[],
  baseline: DrillBaseline
): DrillComparisonResult {
  let digitalDuplicates = 0;
  for (const c of cases) {
    const uniqueBoats = new Set(c.assignedBoatIds);
    if (uniqueBoats.size !== c.assignedBoatIds.length) {
      digitalDuplicates += c.assignedBoatIds.length - uniqueBoats.size;
    }
    if (!c.locationVerified && c.urgency !== 'critical' && c.assignedBoatIds.length > 0) {
      digitalDuplicates += 1;
    }
  }

  const falseRescued = cases.filter(
    (c) => c.status === 'picked_up' && !c.pickedUpAt
  ).length;

  const verifiedCount = cases.filter((c) => c.locationVerified).length;
  const digitalVerifyMinutes = verifiedCount > 0 ? 6 : 9;
  const reduction = Math.max(
    0,
    Math.round(((baseline.paperVerifyMinutes - digitalVerifyMinutes) / baseline.paperVerifyMinutes) * 100)
  );

  void boats.length;

  return {
    paperVerifyMinutes: baseline.paperVerifyMinutes,
    digitalVerifyMinutes,
    verifyTimeReductionPct: reduction,
    paperDuplicateAssignments: baseline.paperDuplicateAssignments,
    digitalDuplicateAssignments: digitalDuplicates,
    paperFalseRescuedCount: baseline.paperFalseRescuedCount,
    digitalFalseRescuedCount: falseRescued,
  };
}

export function accountToRole(account: DemoAccountId): DemoRole {
  if (account === 'admin') return 'coordinator';
  if (account === 'guest') return 'guest';
  return 'resident';
}

export function getOwnedCasesForAccount(
  account: DemoAccountId,
  cases: RescueCase[]
): RescueCase[] {
  if (account === 'guest') return [];
  if (account === 'admin') return cases;
  return cases.filter((c) => c.ownerAccountId === account);
}

export interface VisibleBoatView {
  id: string;
  name: string;
  status: BoatStatus;
  position: GeoPoint;
  lastUpdatedAt: string;
  eta?: string;
  assignedPickupPoint: string | null;
  assignedCaseIds: string[];
  // Admin-only fields (undefined for Guest / Resident)
  crewLead?: string;
  crewCount?: number;
  capacityPax?: number;
  supplies?: BoatSupply;
  savedAssignmentNote?: string;
}

export interface VisibleMapData {
  visibleCases: RedactedCaseView[];
  visibleBoats: VisibleBoatView[];
  visiblePps: PPSCenter[];
  visibleOutages: PowerOutageZone[];
  visibleRoads: RoadClosure[];
  visibleSupplyDepots: SupplyDepot[];
  canSeeSupplies: boolean;
  canSeeRescueRequests: boolean;
}

export function getVisibleMapDataForAccount(params: {
  account: DemoAccountId;
  cases: RescueCase[];
  boats: BoatUnit[];
  ppsCenters: PPSCenter[];
  outages: PowerOutageZone[];
  roadClosures: RoadClosure[];
  supplyDepots: SupplyDepot[];
}): VisibleMapData {
  const { account, cases, boats, ppsCenters, outages, roadClosures, supplyDepots } = params;

  if (account === 'guest') {
    return {
      visibleCases: [],
      visibleBoats: [],
      visiblePps: ppsCenters
        .filter((p) => p.status !== 'Standby')
        .map((p) => ({
          ...p,
          availableSupplies: [],
          updatedBy: 'Public Shelter Advisory (Demo)',
        })),
      visibleOutages: outages,
      visibleRoads: roadClosures
        .filter((r) => r.verified)
        .map((r) => ({ ...r, source: 'Public Flood Advisory (Demo)' })),
      visibleSupplyDepots: [],
      canSeeSupplies: false,
      canSeeRescueRequests: false,
    };
  }

  if (account === 'resident') {
    const ownedCases = getOwnedCasesForAccount(account, cases);
    const ownedCaseIds = ownedCases.map((c) => c.id);
    const ownedPickupPoints = new Set(ownedCases.map((c) => c.pickupLandmark));
    const assignedBoatIdSet = new Set(
      ownedCases.flatMap((c) => c.assignedBoatIds)
    );

    const visibleCases = ownedCases.map((c) =>
      redactCaseForRole(c, 'resident', ownedCaseIds)
    );

    const visibleBoats: VisibleBoatView[] = boats
      .filter(
        (b) =>
          assignedBoatIdSet.has(b.id) ||
          (b.assignedPickupPoint !== null && ownedPickupPoints.has(b.assignedPickupPoint))
      )
      .map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        position: b.position,
        lastUpdatedAt: b.lastUpdatedAt,
        eta: b.eta,
        assignedPickupPoint: b.assignedPickupPoint,
        assignedCaseIds: b.assignedCaseIds.filter((id) => ownedCaseIds.includes(id)),
      }));

    return {
      visibleCases,
      visibleBoats,
      visiblePps: ppsCenters
        .filter((p) => p.status !== 'Standby')
        .map((p) => ({
          ...p,
          availableSupplies: [],
          updatedBy: 'Public Shelter Advisory (Demo)',
        })),
      visibleOutages: outages,
      visibleRoads: roadClosures
        .filter((r) => r.verified)
        .map((r) => ({ ...r, source: 'Public Flood Advisory (Demo)' })),
      visibleSupplyDepots: [],
      canSeeSupplies: false,
      canSeeRescueRequests: true,
    };
  }

  // Admin / Rescue Coordinator: full operations map
  return {
    visibleCases: cases.map((c) => redactCaseForRole(c, 'coordinator', [], boats)),
    visibleBoats: boats.map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      position: b.position,
      lastUpdatedAt: b.lastUpdatedAt,
      eta: b.eta,
      assignedPickupPoint: b.assignedPickupPoint,
      assignedCaseIds: b.assignedCaseIds,
      crewLead: b.crewLead,
      crewCount: b.crewCount,
      capacityPax: b.capacityPax,
      supplies: b.supplies,
      savedAssignmentNote: b.savedAssignmentNote,
    })),
    visiblePps: ppsCenters,
    visibleOutages: outages,
    visibleRoads: roadClosures,
    visibleSupplyDepots: supplyDepots,
    canSeeSupplies: true,
    canSeeRescueRequests: true,
  };
}

export interface ResidentRescueSummary {
  hasActiveRequest: boolean;
  activeCase: RescueCase | null;
  assignedBoats: VisibleBoatView[];
  onTheWayCount: number;
  preparingCount: number;
  arrivedCount: number;
  summaryText: string;
}

export function getResidentRescueSummary(
  account: DemoAccountId,
  cases: RescueCase[],
  boats: BoatUnit[]
): ResidentRescueSummary {
  if (account !== 'resident') {
    return {
      hasActiveRequest: false,
      activeCase: null,
      assignedBoats: [],
      onTheWayCount: 0,
      preparingCount: 0,
      arrivedCount: 0,
      summaryText: '',
    };
  }

  const owned = getOwnedCasesForAccount(account, cases);
  const activeCase = owned.find((c) => c.status !== 'picked_up') ?? owned[0] ?? null;

  if (!activeCase) {
    return {
      hasActiveRequest: false,
      activeCase: null,
      assignedBoats: [],
      onTheWayCount: 0,
      preparingCount: 0,
      arrivedCount: 0,
      summaryText: 'No active rescue request.',
    };
  }

  const visibleData = getVisibleMapDataForAccount({
    account,
    cases: [activeCase],
    boats,
    ppsCenters: [],
    outages: [],
    roadClosures: [],
    supplyDepots: [],
  });

  const assignedBoats = visibleData.visibleBoats;
  if (assignedBoats.length === 0) {
    return {
      hasActiveRequest: true,
      activeCase,
      assignedBoats: [],
      onTheWayCount: 0,
      preparingCount: 0,
      arrivedCount: 0,
      summaryText: 'Waiting for a boat.',
    };
  }

  const onTheWay = assignedBoats.filter((b) => b.status === 'on_the_way').length;
  const preparing = assignedBoats.filter((b) => b.status === 'preparing').length;
  const arrived = assignedBoats.filter((b) => b.status === 'arrived').length;

  const boatWord = assignedBoats.length === 1 ? 'boat' : 'boats';
  const parts = [`${assignedBoats.length} ${boatWord} assigned`];
  if (onTheWay > 0) parts.push(`${onTheWay} on the way`);
  if (preparing > 0) parts.push(`${preparing} preparing`);
  if (arrived > 0) parts.push(`${arrived} arrived`);

  return {
    hasActiveRequest: true,
    activeCase,
    assignedBoats,
    onTheWayCount: onTheWay,
    preparingCount: preparing,
    arrivedCount: arrived,
    summaryText: parts.join(' · '),
  };
}

export function updateBoatLocation(
  boats: BoatUnit[],
  boatId: string,
  position: GeoPoint,
  timestamp: string
): BoatUnit[] {
  return boats.map((b) =>
    b.id === boatId
      ? {
          ...b,
          position,
          lastUpdatedAt: timestamp,
        }
      : b
  );
}

export interface ClusterablePoint<T> {
  id: string;
  coordinates: GeoPoint;
  urgent?: boolean;
  item: T;
}

export interface MarkerCluster<T> {
  id: string;
  center: GeoPoint;
  items: ClusterablePoint<T>[];
  hasUrgent: boolean;
}

/**
 * Groups nearby markers at wider zoom levels (zoom <= 13).
 * At zoom >= 14, every marker renders individually without clustering.
 */
export function clusterMarkersByZoom<T>(
  points: ClusterablePoint<T>[],
  zoom: number
): MarkerCluster<T>[] {
  if (zoom >= 14) {
    return points.map((p) => ({
      id: p.id,
      center: p.coordinates,
      items: [p],
      hasUrgent: Boolean(p.urgent),
    }));
  }

  // Grid cell size shrinks cleanly as zoom increases (at zoom 12: ~0.015 deg, zoom 13: ~0.008 deg)
  const threshold = zoom <= 11 ? 0.03 : zoom === 12 ? 0.016 : 0.0085;
  const clusters: MarkerCluster<T>[] = [];

  for (const pt of points) {
    let matched: MarkerCluster<T> | undefined;
    for (const cluster of clusters) {
      const dLat = Math.abs(cluster.center.lat - pt.coordinates.lat);
      const dLng = Math.abs(cluster.center.lng - pt.coordinates.lng);
      if (dLat <= threshold && dLng <= threshold) {
        matched = cluster;
        break;
      }
    }

    if (matched) {
      matched.items.push(pt);
      const count = matched.items.length;
      matched.center = {
        lat: Number(
          (matched.items.reduce((sum, i) => sum + i.coordinates.lat, 0) / count).toFixed(5)
        ),
        lng: Number(
          (matched.items.reduce((sum, i) => sum + i.coordinates.lng, 0) / count).toFixed(5)
        ),
      };
      if (pt.urgent) matched.hasUrgent = true;
    } else {
      clusters.push({
        id: `cluster-${pt.id}`,
        center: pt.coordinates,
        items: [pt],
        hasUrgent: Boolean(pt.urgent),
      });
    }
  }

  return clusters;
}

export function getHazardColor(type: HazardType, severity: HazardSeverity): string {
  if (severity === 'unknown') return '#64748B';
  return HAZARD_PALETTES[type].levels[severity];
}

export function getHazardSeverityLabel(severity: HazardSeverity): string {
  switch (severity) {
    case 'low':
      return 'Low';
    case 'moderate':
      return 'Moderate';
    case 'high':
      return 'High';
    case 'critical':
      return 'Critical';
    case 'unknown':
      return 'Unknown / Outdated';
  }
}

export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;

    const intersect =
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findZonesAtPoint(zones: HazardZone[], point: GeoPoint): HazardZone[] {
  return zones.filter((z) => isPointInPolygon(point, z.polygon));
}

/**
 * Updates a hazard zone's severity & verification reason.
 * Explicitly does NOT automatically issue or activate an evacuation instruction.
 */
export function updateHazardZoneSeverity(
  zones: HazardZone[],
  zoneId: string,
  severity: HazardSeverity,
  reason: string,
  verifiedBy: string,
  timestamp: string
): HazardZone[] {
  const cleanReason = reason.trim() || 'Coordinator field assessment update';
  return zones.map((z) => {
    if (z.id !== zoneId) return z;
    return {
      ...z,
      severity,
      reason: cleanReason,
      verifiedBy,
      lastVerifiedAt: timestamp,
      outdated: severity === 'unknown',
    };
  });
}

/**
 * Marks a road closed and immediately withdraws any approved evacuation route
 * that depends on that road segment.
 */
export function closeRoadSegmentAndWithdrawRoutes(
  roadClosures: RoadClosure[],
  routes: VerifiedEvacuationRoute[],
  notices: AreaNotice[],
  roadId: string,
  reason: string,
  actor: string,
  timestamp: string
): {
  roadClosures: RoadClosure[];
  routes: VerifiedEvacuationRoute[];
  notices: AreaNotice[];
  withdrawnRouteIds: string[];
} {
  const targetRoad = roadClosures.find((r) => r.id === roadId);
  if (!targetRoad) {
    return { roadClosures, routes, notices, withdrawnRouteIds: [] };
  }

  const nextRoads = roadClosures.map((r) =>
    r.id === roadId
      ? {
          ...r,
          closed: true,
          verified: true,
          passableByBoatOnly: true,
          reason: reason.trim() || r.reason,
          reportedAt: timestamp,
          source: actor,
        }
      : r
  );

  const withdrawnRouteIds: string[] = [];
  const nextRoutes = routes.map((route) => {
    if (route.status === 'approved' && route.roadDependencyIds.includes(roadId)) {
      withdrawnRouteIds.push(route.id);
      return {
        ...route,
        status: 'withdrawn' as const,
        withdrawnReason: `Closed road: ${targetRoad.roadName}`,
        lastVerifiedAt: timestamp,
      };
    }
    return route;
  });

  const newNotice: AreaNotice = {
    id: `notice-road-${roadId}-${Date.now()}`,
    title: `${targetRoad.roadName} closed due to flooding`,
    category: 'Route',
    message:
      withdrawnRouteIds.length > 0
        ? `Route withdrawn — updated directions pending. ${reason.trim() || targetRoad.reason}`
        : reason.trim() || targetRoad.reason,
    timestamp,
    source: actor,
    urgent: withdrawnRouteIds.length > 0,
    location: targetRoad.areaName,
    coordinates: targetRoad.coordinates,
  };

  return {
    roadClosures: nextRoads,
    routes: nextRoutes,
    notices: [newNotice, ...notices],
    withdrawnRouteIds,
  };
}

export function reopenRoadSegment(
  roadClosures: RoadClosure[],
  tasks: CommandTask[],
  roadId: string,
  actor: string,
  timestamp: string
): { ok: boolean; error?: string; roadClosures: RoadClosure[] } {
  const linkedPumpTasks = tasks.filter(
    (t) => t.isPumpTask && t.linkedRoadId === roadId
  );
  if (
    linkedPumpTasks.length > 0 &&
    !linkedPumpTasks.some((t) => t.pumpFieldConfirmedToReopen)
  ) {
    return {
      ok: false,
      error:
        'Pumping task requires a separate field confirmation before reopening this road.',
      roadClosures,
    };
  }

  return {
    ok: true,
    roadClosures: roadClosures.map((r) =>
      r.id === roadId
        ? {
            ...r,
            closed: false,
            passableByBoatOnly: false,
            verified: true,
            reason: 'Field team confirmed road drained & safe to reopen',
            reportedAt: timestamp,
            source: actor,
          }
        : r
    ),
  };
}

/**
 * Updates PPS shelter status / arrival acceptance.
 * Closing a shelter or stopping arrivals withdraws any active evacuation route to that PPS
 * and publishes an alert notice.
 */
export function updatePpsShelterStatus(
  ppsCenters: PPSCenter[],
  routes: VerifiedEvacuationRoute[],
  notices: AreaNotice[],
  ppsId: string,
  updates: {
    status: PPSCenter['status'];
    acceptingArrivals: boolean;
    occupancy?: number;
  },
  actor: string,
  timestamp: string
): {
  ppsCenters: PPSCenter[];
  routes: VerifiedEvacuationRoute[];
  notices: AreaNotice[];
  withdrawnRouteIds: string[];
} {
  const targetPps = ppsCenters.find((p) => p.id === ppsId);
  if (!targetPps) {
    return { ppsCenters, routes, notices, withdrawnRouteIds: [] };
  }

  const nextPps = ppsCenters.map((p) =>
    p.id === ppsId
      ? {
          ...p,
          status: updates.status,
          acceptingArrivals: updates.acceptingArrivals,
          occupancy: updates.occupancy ?? p.occupancy,
          updatedAt: timestamp,
          updatedBy: actor,
        }
      : p
  );

  const isClosed = updates.status === 'Closed' || updates.status === 'Standby' || !updates.acceptingArrivals;
  const withdrawnRouteIds: string[] = [];

  const nextRoutes = routes.map((route) => {
    if (isClosed && route.status === 'approved' && route.targetPpsId === ppsId) {
      withdrawnRouteIds.push(route.id);
      return {
        ...route,
        status: 'withdrawn' as const,
        destinationPpsOpenConfirmed: false,
        withdrawnReason: `${targetPps.name} is ${updates.status.toLowerCase()} / not accepting arrivals`,
        lastVerifiedAt: timestamp,
      };
    }
    return route;
  });

  const statusHeadline = isClosed
    ? `${targetPps.name} stopped accepting arrivals (${updates.status})`
    : `${targetPps.name} open and accepting arrivals`;

  const notice: AreaNotice = {
    id: `notice-pps-${ppsId}-${Date.now()}`,
    title: statusHeadline,
    category: 'Shelter',
    message:
      withdrawnRouteIds.length > 0
        ? 'Directions to this shelter withdrawn — updated directions pending.'
        : `Occupancy ${updates.occupancy ?? targetPps.occupancy}/${targetPps.capacity}. Verified by ${actor}.`,
    timestamp,
    source: actor,
    urgent: isClosed,
    location: targetPps.areaName,
    coordinates: targetPps.coordinates,
  };

  return {
    ppsCenters: nextPps,
    routes: nextRoutes,
    notices: [notice, ...notices],
    withdrawnRouteIds,
  };
}

export function approveOrWithdrawRoute(
  routes: VerifiedEvacuationRoute[],
  ppsCenters: PPSCenter[],
  roadClosures: RoadClosure[],
  routeId: string,
  action: 'approve' | 'withdraw',
  confirmation: {
    destinationPpsOpenConfirmed: boolean;
    routeFieldCheckedConfirmed: boolean;
    reason?: string;
  },
  actor: string,
  timestamp: string
): { ok: boolean; error?: string; routes: VerifiedEvacuationRoute[] } {
  const route = routes.find((r) => r.id === routeId);
  if (!route) return { ok: false, error: 'Route not found.', routes };

  if (action === 'withdraw') {
    return {
      ok: true,
      routes: routes.map((r) =>
        r.id === routeId
          ? {
              ...r,
              status: 'withdrawn',
              withdrawnReason: confirmation.reason?.trim() || 'Withdrawn by coordinator',
              lastVerifiedAt: timestamp,
            }
          : r
      ),
    };
  }

  if (!confirmation.destinationPpsOpenConfirmed || !confirmation.routeFieldCheckedConfirmed) {
    return {
      ok: false,
      error:
        'Confirm both that the destination PPS is open and the route has been field-checked before publishing.',
      routes,
    };
  }

  const targetPps = ppsCenters.find((p) => p.id === route.targetPpsId);
  if (!targetPps || !targetPps.acceptingArrivals || targetPps.status === 'Closed' || targetPps.status === 'Standby') {
    return {
      ok: false,
      error: 'Destination PPS must be open and accepting arrivals before publishing this route.',
      routes,
    };
  }

  const blockedDep = roadClosures.find(
    (rc) => route.roadDependencyIds.includes(rc.id) && rc.closed
  );
  if (blockedDep) {
    return {
      ok: false,
      error: `Cannot publish route while "${blockedDep.roadName}" is marked closed.`,
      routes,
    };
  }

  return {
    ok: true,
    routes: routes.map((r) =>
      r.id === routeId
        ? {
            ...r,
            status: 'approved',
            destinationPpsOpenConfirmed: true,
            routeFieldCheckedConfirmed: true,
            verifiedBy: actor,
            lastVerifiedAt: timestamp,
            withdrawnReason: undefined,
          }
        : r
    ),
  };
}

export function advanceCommandTask(
  tasks: CommandTask[],
  taskId: string,
  nextStage: TaskStage,
  crewNote: string,
  actor: string,
  timestamp: string,
  pumpFieldConfirmedToReopen?: boolean
): CommandTask[] {
  return tasks.map((t) => {
    if (t.id !== taskId) return t;
    const noteText =
      crewNote.trim() || `Stage updated to ${nextStage.replace('_', ' ')}`;
    return {
      ...t,
      stage: nextStage,
      pumpFieldConfirmedToReopen:
        pumpFieldConfirmedToReopen !== undefined
          ? pumpFieldConfirmedToReopen
          : t.pumpFieldConfirmedToReopen,
      auditLog: [
        ...t.auditLog,
        { timestamp, actor, note: noteText },
      ],
    };
  });
}

export type AlertFocusTarget =
  | { kind: 'zone'; id: string; coordinates: GeoPoint }
  | { kind: 'pps'; id: string; coordinates: GeoPoint }
  | { kind: 'road'; id: string; coordinates: GeoPoint }
  | { kind: 'route'; id: string; coordinates: GeoPoint }
  | { kind: 'boat'; id: string; coordinates: GeoPoint }
  | { kind: 'case'; id: string; coordinates: GeoPoint }
  | { kind: 'incident'; id: string; coordinates: GeoPoint }
  | { kind: 'outage'; id: string; coordinates: GeoPoint }
  | { kind: 'river'; coordinates: GeoPoint };

export interface RoleAlertItem {
  id: string;
  pinnedUrgent: boolean;
  severityLabel: string;
  severityTone: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  iconKind:
    | 'flood'
    | 'earthquake'
    | 'fire'
    | 'landslide'
    | 'weather'
    | 'shelter'
    | 'road'
    | 'route'
    | 'boat'
    | 'pickup'
    | 'task'
    | 'power';
  headline: string;
  location: string;
  timestamp: string;
  detailLine?: string;
  focusTarget: AlertFocusTarget;
  isPrivateRescue?: boolean;
  actionKind?: 'show_on_map' | 'review_case';
}

export function buildAlertsForAccount(params: {
  account: DemoAccountId;
  cases: RescueCase[];
  boats: BoatUnit[];
  ppsCenters: PPSCenter[];
  roadClosures: RoadClosure[];
  outages: PowerOutageZone[];
  hazardZones: HazardZone[];
  evacRoutes: VerifiedEvacuationRoute[];
  areaInstructions: AreaInstruction[];
  notices: AreaNotice[];
  incidents: CommandIncident[];
}): RoleAlertItem[] {
  const {
    account,
    cases,
    boats,
    ppsCenters,
    roadClosures,
    hazardZones,
    evacRoutes,
    areaInstructions,
    notices,
    incidents,
  } = params;

  const alerts: RoleAlertItem[] = [];

  // 1. Active approved area instructions (visible to Guest, Resident, Admin)
  for (const instr of areaInstructions.filter((i) => i.active)) {
    const zone = hazardZones.find((z) => z.id === instr.zoneId);
    const center = zone?.polygon[0] ?? { lat: 3.0308, lng: 101.5365 };
    alerts.push({
      id: `alert-instr-${instr.id}`,
      pinnedUrgent: instr.urgent,
      severityLabel: zone ? getHazardSeverityLabel(zone.severity) : 'Approved',
      severityTone: zone?.severity === 'critical' ? 'critical' : instr.urgent ? 'high' : 'moderate',
      iconKind: zone?.hazardType ?? 'flood',
      headline: instr.headline,
      location: instr.areaName,
      timestamp: instr.updatedAt,
      detailLine: instr.whatToDo,
      focusTarget: zone
        ? { kind: 'zone', id: zone.id, coordinates: center }
        : { kind: 'river', coordinates: center },
    });
  }

  // 2. Withdrawn or Approved evacuation routes (public route advisories)
  for (const route of evacRoutes) {
    if (route.status === 'withdrawn') {
      alerts.push({
        id: `alert-route-w-${route.id}`,
        pinnedUrgent: true,
        severityLabel: 'Withdrawn',
        severityTone: 'high',
        iconKind: 'route',
        headline: `Route withdrawn — updated directions pending (${route.title})`,
        location: route.pickupPointLabel,
        timestamp: route.lastVerifiedAt,
        detailLine: route.withdrawnReason,
        focusTarget: { kind: 'route', id: route.id, coordinates: route.path[0] },
      });
    } else if (route.status === 'approved') {
      alerts.push({
        id: `alert-route-a-${route.id}`,
        pinnedUrgent: false,
        severityLabel: 'Verified route',
        severityTone: 'info',
        iconKind: 'route',
        headline: route.title,
        location: route.pickupPointLabel,
        timestamp: route.lastVerifiedAt,
        detailLine: `${route.routeType} · ${route.accessibilityInfo}`,
        focusTarget: { kind: 'route', id: route.id, coordinates: route.path[0] },
      });
    }
  }

  // 3. Verified road closures (public)
  for (const road of roadClosures.filter((r) => r.verified && r.closed)) {
    alerts.push({
      id: `alert-road-${road.id}`,
      pinnedUrgent: false,
      severityLabel: 'Closed',
      severityTone: 'high',
      iconKind: 'road',
      headline: `${road.roadName} closed due to flooding`,
      location: road.areaName,
      timestamp: road.reportedAt,
      detailLine: road.reason,
      focusTarget: { kind: 'road', id: road.id, coordinates: road.coordinates },
    });
  }

  // 4. Shelter open / closed alerts
  for (const pps of ppsCenters) {
    if (pps.status === 'Closed' || !pps.acceptingArrivals) {
      if (pps.status === 'Standby') continue;
      alerts.push({
        id: `alert-pps-${pps.id}`,
        pinnedUrgent: true,
        severityLabel: pps.status,
        severityTone: 'critical',
        iconKind: 'shelter',
        headline: `${pps.name} stopped accepting arrivals`,
        location: pps.areaName,
        timestamp: pps.updatedAt,
        focusTarget: { kind: 'pps', id: pps.id, coordinates: pps.coordinates },
      });
    } else {
      alerts.push({
        id: `alert-pps-${pps.id}`,
        pinnedUrgent: false,
        severityLabel: 'Open shelter',
        severityTone: 'low',
        iconKind: 'shelter',
        headline: `${pps.name} open (${pps.occupancy}/${pps.capacity} occupied)`,
        location: pps.areaName,
        timestamp: pps.updatedAt,
        focusTarget: { kind: 'pps', id: pps.id, coordinates: pps.coordinates },
      });
    }
  }

  // 5. Public area notices (Power / River / Shelter updates)
  for (const n of notices.slice(0, 4)) {
    if (n.category === 'Rescue') continue;
    alerts.push({
      id: `alert-notice-${n.id}`,
      pinnedUrgent: Boolean(n.urgent),
      severityLabel: n.category,
      severityTone: n.urgent ? 'high' : 'info',
      iconKind:
        n.category === 'Power'
          ? 'power'
          : n.category === 'Shelter'
          ? 'shelter'
          : n.category === 'Route'
          ? 'route'
          : 'flood',
      headline: n.title,
      location: n.location ?? 'Shah Alam',
      timestamp: n.timestamp,
      detailLine: n.message,
      focusTarget: {
        kind: 'river',
        coordinates: n.coordinates ?? { lat: 3.0185, lng: 101.5295 },
      },
    });
  }

  // 6. Resident-only private pickup & boat alerts (NEVER shown to Guest)
  if (account === 'resident') {
    const owned = getOwnedCasesForAccount('resident', cases);
    for (const c of owned) {
      const assignedBoats = boats.filter(
        (b) => c.assignedBoatIds.includes(b.id) || b.assignedPickupPoint === c.pickupLandmark
      );

      for (const b of assignedBoats) {
        if (b.status === 'on_the_way') {
          alerts.push({
            id: `alert-res-boat-way-${b.id}`,
            pinnedUrgent: true,
            severityLabel: 'On the way',
            severityTone: 'high',
            iconKind: 'boat',
            headline: `${b.name} is on the way to your pickup point`,
            location: c.pickupLandmark,
            timestamp: b.lastUpdatedAt,
            detailLine: b.eta ? `Crew ETA: ${b.eta}` : 'Wait at the confirmed school entrance.',
            focusTarget: { kind: 'boat', id: b.id, coordinates: b.position },
            isPrivateRescue: true,
          });
        } else if (b.status === 'arrived') {
          alerts.push({
            id: `alert-res-boat-arr-${b.id}`,
            pinnedUrgent: true,
            severityLabel: 'Boat arrived',
            severityTone: 'high',
            iconKind: 'boat',
            headline: `${b.name} has arrived at ${c.pickupLandmark}`,
            location: c.pickupLandmark,
            timestamp: b.lastUpdatedAt,
            detailLine: 'Awaiting boarding confirmation.',
            focusTarget: { kind: 'boat', id: b.id, coordinates: b.position },
            isPrivateRescue: true,
          });
        } else if (b.status === 'preparing') {
          alerts.push({
            id: `alert-res-boat-prep-${b.id}`,
            pinnedUrgent: false,
            severityLabel: 'Preparing',
            severityTone: 'moderate',
            iconKind: 'boat',
            headline: `${b.name} is preparing for your pickup`,
            location: c.pickupLandmark,
            timestamp: b.lastUpdatedAt,
            focusTarget: { kind: 'boat', id: b.id, coordinates: b.position },
            isPrivateRescue: true,
          });
        }
      }

      if (c.status === 'picked_up') {
        alerts.push({
          id: `alert-res-picked-${c.id}`,
          pinnedUrgent: true,
          severityLabel: 'Pickup confirmed',
          severityTone: 'low',
          iconKind: 'pickup',
          headline: `Pickup confirmed for ${c.affectedPersonName}`,
          location: c.pickupLandmark,
          timestamp: c.pickedUpAt ?? c.confirmedWhen,
          detailLine: `Confirmed by ${c.pickedUpBy ?? 'Rescue crew'}`,
          focusTarget: { kind: 'case', id: c.id, coordinates: c.coordinates },
          isPrivateRescue: true,
        });
      } else {
        alerts.push({
          id: `alert-res-wait-${c.id}`,
          pinnedUrgent: true,
          severityLabel: 'Your rescue',
          severityTone: c.urgency === 'critical' ? 'critical' : 'high',
          iconKind: 'pickup',
          headline: `Wait at ${c.pickupLandmark} for boat pickup`,
          location: c.areaName,
          timestamp: c.confirmedWhen,
          detailLine: `${c.affectedPersonName} · ${formatFamilyMemberStatus(c)}`,
          focusTarget: { kind: 'case', id: c.id, coordinates: c.coordinates },
          isPrivateRescue: true,
        });
      }
    }
  }

  // 7. Admin-only incidents, private rescue cases, and team tasks (NEVER shown to Guest/Resident)
  if (account === 'admin') {
    for (const c of cases) {
      if (c.status === 'picked_up') continue;
      alerts.push({
        id: `alert-admin-case-${c.id}`,
        pinnedUrgent: c.urgency === 'critical' || !c.locationVerified,
        severityLabel: c.urgency === 'critical' ? 'Urgent' : c.locationVerified ? 'Verified' : 'Unverified',
        severityTone: c.urgency === 'critical' ? 'critical' : !c.locationVerified ? 'high' : 'moderate',
        iconKind: 'pickup',
        headline:
          c.assignedBoatIds.length === 0
            ? `Boat requested at ${c.pickupLandmark}`
            : `${c.affectedPersonName} — ${formatFamilyMemberStatus(c)}`,
        location: `${c.pickupLandmark} (${c.householdCount} pax)`,
        timestamp: c.lastContactTime,
        detailLine: c.reportSource,
        focusTarget: { kind: 'case', id: c.id, coordinates: c.coordinates },
        isPrivateRescue: true,
        actionKind: 'review_case',
      });
    }

    for (const inc of incidents) {
      alerts.push({
        id: `alert-admin-inc-${inc.id}`,
        pinnedUrgent: inc.severity === 'critical' || !inc.verified,
        severityLabel: inc.verified ? getHazardSeverityLabel(inc.severity) : 'Needs check',
        severityTone:
          inc.severity === 'critical'
            ? 'critical'
            : inc.severity === 'high'
            ? 'high'
            : 'moderate',
        iconKind:
          inc.incidentType === 'landslide'
            ? 'landslide'
            : inc.incidentType === 'severe_weather'
            ? 'weather'
            : 'flood',
        headline: inc.title,
        location: inc.areaName,
        timestamp: inc.lastUpdate,
        detailLine: inc.responsibleOfficer,
        focusTarget: { kind: 'incident', id: inc.id, coordinates: inc.coordinates },
        isPrivateRescue: true,
        actionKind: 'review_case',
      });
    }
  }

  // Pin urgent alerts first, keep deterministic ordering
  return alerts.sort((a, b) => {
    if (a.pinnedUrgent !== b.pinnedUrgent) return a.pinnedUrgent ? -1 : 1;
    return 0;
  });
}



