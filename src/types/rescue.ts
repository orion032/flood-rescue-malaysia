export type DemoAccountId = 'guest' | 'resident' | 'admin';

export type LanguageCode = 'en' | 'bm' | 'cn';

export type DemoRole = 'guest' | 'resident' | 'coordinator';

export type CaseStatus =
  | 'unverified'
  | 'welfare_check'
  | 'confirmed'
  | 'assigned'
  | 'boat_arrived'
  | 'picked_up';

export type UrgencyLevel = 'critical' | 'high' | 'moderate';

export type BoatStatus = 'available' | 'preparing' | 'on_the_way' | 'arrived';

export type HazardType = 'flood' | 'earthquake' | 'fire';

export type HazardSeverity = 'low' | 'moderate' | 'high' | 'critical' | 'unknown';

export type IncidentType = 'flooding' | 'landslide' | 'severe_weather';

export type FloodSubScenario = 'water_rising' | 'road_waterlogged' | 'stranded_evacuation';

export type TaskStage = 'assigned' | 'acknowledged' | 'on_site' | 'completed';

export type AssistanceNeed =
  | 'Wheelchair boarding assistance'
  | 'Unable to use stairs'
  | 'Text or visual communication'
  | 'Older resident without smartphone'
  | 'Portable oxygen or medical gear'
  | 'Not sure';

export type OkuNeed = AssistanceNeed;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PriorityFacts {
  reportedDanger: string;
  abilityToEvacuate: string;
  timeSinceLastContact: string;
  riverStationTrend: string;
  buildingFloodDepth: string;
  lowLyingTerrain: string;
  roadAccess: string;
}

export interface FamilyMessage {
  id: string;
  timestamp: string;
  sender: string;
  text: string;
}

export interface RescueCase {
  id: string;
  ownerAccountId?: 'resident' | 'other_household';
  requestMode: 'self' | 'family_assisted';
  affectedPersonName: string;
  relationshipLabel: string;
  householdCount: number;
  postcode: string;
  areaName: string;
  lastSeenLocation: string; // Exact address / flat (hidden from public map)
  pickupLandmark: string; // Publicly shareable landmark e.g. SK Taman Sri Muda entrance
  coordinates: GeoPoint;
  publicSectorCoordinates: GeoPoint;
  confirmedByWho: string;
  confirmedWhen: string;
  lastContactTime: string;
  reportedAt: string;
  reportSource: string; // Who reported & via what channel
  reporterName: string;
  reporterLocation: string;
  reporterCallbackPhone: string; // Strictly hidden from public map
  locationVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  caseOwner?: string;
  followUpAction?: string;
  status: CaseStatus;
  urgency: UrgencyLevel;
  priorityConfirmed?: boolean;
  priorityReason?: string;
  priorityConfirmedBy?: string;
  priorityConfirmedAt?: string;
  okuNeeds: AssistanceNeed[];
  assistanceNotes?: string;
  notes: string;
  photoAttached?: boolean;
  assignedBoatIds: string[];
  priorityFacts: PriorityFacts;
  familyUpdates: FamilyMessage[];
  pickedUpAt?: string;
  pickedUpBy?: string;
  syncState: 'synced' | 'local_draft';
}

export interface BoatSupply {
  lifeJackets: number;
  generators: number;
  drinkingWaterCases: number;
  wheelchairRamp: boolean;
}

export interface BoatUnit {
  id: string;
  name: string; // e.g., "Boat 04"
  crewLead: string;
  crewCount: number;
  status: BoatStatus;
  assignedPickupPoint: string | null;
  assignedCaseIds: string[];
  position: GeoPoint;
  lastUpdatedAt: string;
  eta?: string; // Only displayed if crew explicitly entered one
  capacityPax: number;
  supplies: BoatSupply;
  savedAssignmentNote: string;
}

export interface SupplyDepot {
  id: string;
  name: string;
  areaName: string;
  coordinates: GeoPoint;
  lifeJackets: number;
  generators: number;
  drinkingWaterCases: number;
  updatedAt: string;
}

export interface PPSCenter {
  id: string;
  name: string;
  areaName: string;
  postcode: string;
  status: 'Open' | 'Near Capacity' | 'Standby' | 'Closed';
  acceptingArrivals: boolean;
  occupancy: number;
  capacity: number;
  okuAccessible: boolean;
  accessibilityFeatures: string[];
  availableSupplies: string[];
  coordinates: GeoPoint;
  updatedAt: string;
  updatedBy: string;
}

export interface RefugeArea {
  id: string;
  name: string;
  ppsId: string;
  polygon: GeoPoint[];
  verifiedBy: string;
  verifiedAt: string;
}

export interface HazardZone {
  id: string;
  name: string;
  areaName: string;
  postcode: string;
  hazardType: HazardType;
  severity: HazardSeverity;
  reason: string;
  lastVerifiedAt: string;
  verifiedBy: string;
  polygon: GeoPoint[];
  linkedRouteId?: string;
  outdated?: boolean;
}

export interface VerifiedEvacuationRoute {
  id: string;
  title: string;
  zoneId: string;
  targetPpsId: string;
  startLabel: string;
  pickupPointLabel: string;
  routeType: 'Walking' | 'Light vehicle' | 'Boat ferry';
  accessibilityInfo: string;
  path: GeoPoint[];
  status: 'approved' | 'withdrawn' | 'pending_review';
  roadDependencyIds: string[];
  destinationPpsOpenConfirmed: boolean;
  routeFieldCheckedConfirmed: boolean;
  verifiedBy: string;
  lastVerifiedAt: string;
  withdrawnReason?: string;
}

export interface OfficialWarning {
  id: string;
  title: string;
  hazardType: HazardType | 'weather';
  level: string;
  reading: string;
  source: string;
  issuedAt: string;
  nextUpdateAt: string;
  note: string;
}

export interface CommandIncident {
  id: string;
  title: string;
  incidentType: IncidentType;
  floodScenario?: FloodSubScenario;
  severity: HazardSeverity;
  areaName: string;
  postcode: string;
  coordinates: GeoPoint;
  affectedBoundary?: GeoPoint[];
  reportedConditions: string;
  source: string;
  lastUpdate: string;
  lastVerifiedAt?: string;
  verified: boolean;
  responsibleOfficer: string;
  procedureSteps: string[];
  linkedZoneId?: string;
  linkedCaseIds?: string[];
  linkedRoadId?: string;
  linkedPpsId?: string;
}

export interface TaskAuditEntry {
  timestamp: string;
  actor: string;
  note: string;
}

export interface CommandTask {
  id: string;
  incidentId: string;
  title: string;
  location: string;
  namedTeam: string;
  requiredEquipment: string;
  nextUpdateTime: string;
  stage: TaskStage;
  isPumpTask?: boolean;
  pumpFieldConfirmedToReopen?: boolean;
  linkedRoadId?: string;
  authorisedBy: string;
  authorisedAt: string;
  auditLog: TaskAuditEntry[];
}

export interface AreaInstruction {
  id: string;
  zoneId: string;
  areaName: string;
  headline: string;
  whatToDo: string;
  whereToGoOrWait: string;
  waitingForRescueNote: string;
  independentTravelNote: string;
  updatedAt: string;
  howToRequestHelp: string;
  approvedBy: string;
  active: boolean;
  urgent: boolean;
}

export interface PowerOutageZone {
  id: string;
  areaName: string;
  postcode: string;
  status: 'Outage Confirmed' | 'Crew Dispatched' | 'Restored' | 'Not yet confirmed';
  confirmedCause: string; // May be "Not yet confirmed"
  estimatedRestoration: string; // May be "Not yet confirmed"
  affectedHouseholds: number | null;
  center: GeoPoint;
  radiusMeters: number;
  updatedAt: string;
  source: string;
}

export interface RoadClosure {
  id: string;
  roadName: string;
  areaName: string;
  postcode: string;
  reason: string;
  passableByBoatOnly: boolean;
  verified: boolean;
  closed: boolean;
  coordinates: GeoPoint;
  reportedAt: string;
  source: string;
}

export interface AreaNotice {
  id: string;
  title: string;
  category: 'Shelter' | 'Power' | 'River' | 'Rescue' | 'Route';
  message: string;
  timestamp: string;
  source: string;
  urgent?: boolean;
  location?: string;
  coordinates?: GeoPoint;
}

export interface LocalDraftAction {
  id: string;
  createdAt: string;
  actorRole: DemoRole;
  summary: string;
  payloadType:
    | 'new_case'
    | 'update_location'
    | 'advance_boat'
    | 'confirm_pickup'
    | 'report_issue';
  payload: Record<string, unknown>;
}

export interface ShahAlamPlace {
  id: string;
  name: string;
  category: 'Neighbourhood' | 'School / Landmark' | 'PPS Shelter' | 'River Station';
  postcode: string;
  coordinates: GeoPoint;
}

export interface DrillBaseline {
  paperVerifyMinutes: number;
  paperDuplicateAssignments: number;
  paperFalseRescuedCount: number;
}
