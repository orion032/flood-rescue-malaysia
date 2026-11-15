import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  LifeBuoy,
  MapPin,
  Menu,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  DEMO_AREA_INFO,
  INITIAL_AREA_INSTRUCTIONS,
  INITIAL_BOATS,
  INITIAL_CASES,
  INITIAL_COMMAND_INCIDENTS,
  INITIAL_COMMAND_TASKS,
  INITIAL_DRILL_BASELINE,
  INITIAL_EVAC_ROUTES,
  INITIAL_HAZARD_ZONES,
  INITIAL_NOTICES,
  INITIAL_OFFICIAL_WARNINGS,
  INITIAL_OUTAGES,
  INITIAL_PPS_CENTERS,
  INITIAL_REFUGE_AREAS,
  INITIAL_ROAD_CLOSURES,
  INITIAL_SUPPLY_DEPOTS,
  SHAH_ALAM_PLACES,
} from './data/seedData';
import {
  AreaInstruction,
  AreaNotice,
  AssistanceNeed,
  BoatStatus,
  BoatUnit,
  CommandIncident,
  CommandTask,
  DemoAccountId,
  DrillBaseline,
  DrillEvent,
  FloodSubScenario,
  GeoPoint,
  HazardSeverity,
  HazardZone,
  LanguageCode,
  LocalDraftAction,
  OfficialWarning,
  PPSCenter,
  PowerOutageZone,
  RefugeArea,
  RescueCase,
  RoadClosure,
  SupplyDepot,
  TaskStage,
  UrgencyLevel,
  VerifiedEvacuationRoute,
} from './types/rescue';
import {
  accountToRole,
  ActionOutcome,
  AdvanceBoatPayload,
  ConfirmPickupPayload,
  NewCasePayload,
  ReportIssuePayload,
  UpdateLocationPayload,
  applyQueuedActions,
  getQueuedTargets,
  projectQueuedState,
  advanceBoatStatus,
  advanceCommandTask,
  applyFamilyLocationChange,
  approveOrWithdrawRoute,
  assignBoatToCase,
  assignOwnerAndFollowUp,
  buildAlertsForAccount,
  closeRoadSegmentAndWithdrawRoutes,
  confirmCasePriority,
  confirmPersonPickedUp,
  drillEventForAssignment,
  drillEventForPickup,
  enqueueLocalDraft,
  getOwnedCasesForAccount,
  getPickupEligibility,
  getResidentRescueSummary,
  getVisibleMapDataForAccount,
  isAppOnline,
  moveCasePin,
  PickupEligibility,
  reopenRoadSegment,
  RoleAlertItem,
  sendFamilyUpdate,
  updateBoatLocation,
  updateHazardZoneSeverity,
  updatePpsShelterStatus,
  verifyAndMovePickupPin,
} from './utils/rescueLogic';
import { formatBoatSummary, TRANSLATIONS } from './i18n/translations';
import {
  LayerKey,
  SelectedMapEntity,
  ShahAlamLeafletMap,
} from './components/ShahAlamLeafletMap';
import { FamilyTrackerCard } from './components/FamilyTrackerCard';
import { CoordinatorConsole } from './components/CoordinatorConsole';
import { CommandCentrePanel } from './components/CommandCentrePanel';
import { AlertsSection } from './components/AlertsSection';
import { ReportModal, ReportModalMode } from './components/ReportModal';
import { DrillBenchmarkView } from './components/DrillBenchmarkView';
import { WaitingToSendPanel } from './components/WaitingToSendPanel';

type ActiveView = 'map' | 'my_rescue' | 'dispatch' | 'workflow' | 'drill';
type AdminSubTab = 'command_centre' | 'boats_cases';

const STORAGE_KEY = 'flood_rescue_shah_alam_demo_v7';
const STORAGE_KEY_PREFIX = 'flood_rescue_shah_alam_demo_';

interface PersistedState {
  account: DemoAccountId;
  lang: LanguageCode;
  selectedCaseId: string;
  selectedIncidentId: string;
  cases: RescueCase[];
  boats: BoatUnit[];
  ppsCenters: PPSCenter[];
  outages: PowerOutageZone[];
  roadClosures: RoadClosure[];
  supplyDepots: SupplyDepot[];
  notices: AreaNotice[];
  hazardZones: HazardZone[];
  refugeAreas: RefugeArea[];
  evacRoutes: VerifiedEvacuationRoute[];
  officialWarnings: OfficialWarning[];
  incidents: CommandIncident[];
  tasks: CommandTask[];
  areaInstructions: AreaInstruction[];
  drafts: LocalDraftAction[];
  baseline: DrillBaseline;
  drillEvents: DrillEvent[];
}

function formatClockTime(date: Date): string {
  return date
    .toLocaleTimeString('en-MY', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
}

function getFormattedTime(): string {
  return formatClockTime(new Date());
}

// Reads the clock once so the display time and the epoch time always match.
function getNow(): { at: string; atMs: number } {
  const now = new Date();
  return { at: formatClockTime(now), atMs: now.getTime() };
}

function isValidAccountId(val: unknown): val is DemoAccountId {
  return val === 'guest' || val === 'resident' || val === 'admin';
}

function isValidLang(val: unknown): val is LanguageCode {
  return val === 'en' || val === 'bm' || val === 'cn';
}

// Remove saved state from older demo versions so stale fictional personal data is not left behind.
function removeOldSavedStates(): void {
  try {
    const oldKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX) && key !== STORAGE_KEY) {
        oldKeys.push(key);
      }
    }
    oldKeys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore unavailable storage
  }
}

function loadInitialState(): PersistedState {
  removeOldSavedStates();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (Array.isArray(parsed.cases) && Array.isArray(parsed.boats)) {
        return {
          account: isValidAccountId(parsed.account) ? parsed.account : 'guest',
          lang: isValidLang(parsed.lang) ? parsed.lang : 'en',
          selectedCaseId: parsed.selectedCaseId ?? '',
          selectedIncidentId:
            parsed.selectedIncidentId ?? INITIAL_COMMAND_INCIDENTS[0].id,
          cases: parsed.cases,
          boats: parsed.boats,
          ppsCenters: parsed.ppsCenters ?? INITIAL_PPS_CENTERS,
          outages: parsed.outages ?? INITIAL_OUTAGES,
          roadClosures: parsed.roadClosures ?? INITIAL_ROAD_CLOSURES,
          supplyDepots: parsed.supplyDepots ?? INITIAL_SUPPLY_DEPOTS,
          notices: parsed.notices ?? INITIAL_NOTICES,
          hazardZones: parsed.hazardZones ?? INITIAL_HAZARD_ZONES,
          refugeAreas: parsed.refugeAreas ?? INITIAL_REFUGE_AREAS,
          evacRoutes: parsed.evacRoutes ?? INITIAL_EVAC_ROUTES,
          officialWarnings:
            parsed.officialWarnings ?? INITIAL_OFFICIAL_WARNINGS,
          incidents: parsed.incidents ?? INITIAL_COMMAND_INCIDENTS,
          tasks: parsed.tasks ?? INITIAL_COMMAND_TASKS,
          areaInstructions:
            parsed.areaInstructions ?? INITIAL_AREA_INSTRUCTIONS,
          drafts: parsed.drafts ?? [],
          baseline: parsed.baseline ?? INITIAL_DRILL_BASELINE,
          drillEvents: Array.isArray(parsed.drillEvents)
            ? parsed.drillEvents
            : [],
        };
      }
    }
  } catch {
    // Fallback cleanly to deterministic seed data
  }
  return {
    account: 'guest',
    lang: 'en',
    selectedCaseId: '',
    selectedIncidentId: INITIAL_COMMAND_INCIDENTS[0].id,
    cases: INITIAL_CASES,
    boats: INITIAL_BOATS,
    ppsCenters: INITIAL_PPS_CENTERS,
    outages: INITIAL_OUTAGES,
    roadClosures: INITIAL_ROAD_CLOSURES,
    supplyDepots: INITIAL_SUPPLY_DEPOTS,
    notices: INITIAL_NOTICES,
    hazardZones: INITIAL_HAZARD_ZONES,
    refugeAreas: INITIAL_REFUGE_AREAS,
    evacRoutes: INITIAL_EVAC_ROUTES,
    officialWarnings: INITIAL_OFFICIAL_WARNINGS,
    incidents: INITIAL_COMMAND_INCIDENTS,
    tasks: INITIAL_COMMAND_TASKS,
    areaInstructions: INITIAL_AREA_INSTRUCTIONS,
    drafts: [],
    baseline: INITIAL_DRILL_BASELINE,
    drillEvents: [],
  };
}

// Tracks the real browser connection. Starts from navigator.onLine (true when
// navigator is unavailable) and follows the window online/offline events.
function useBrowserOnline(): boolean {
  const [browserOnline, setBrowserOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return browserOnline;
}

export default function App() {
  const [initial] = useState<PersistedState>(loadInitialState);
  const [activeView, setActiveView] = useState<ActiveView>('map');
  const [adminSubTab, setAdminSubTab] =
    useState<AdminSubTab>('command_centre');
  const [account, setAccount] = useState<DemoAccountId>(initial.account);
  const [lang, setLang] = useState<LanguageCode>(initial.lang);
  const browserOnline = useBrowserOnline();
  const [demoOffline, setDemoOffline] = useState<boolean>(false);
  const isOnline = isAppOnline(browserOnline, demoOffline);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [focusRequest, setFocusRequest] = useState<{
    point: GeoPoint;
    zoom: number;
  } | null>(null);
  const [forcedLayerReveal, setForcedLayerReveal] = useState<Partial<
    Record<LayerKey, boolean>
  > | null>(null);
  const [tappedLocation, setTappedLocation] = useState<GeoPoint | null>(null);
  const [pinMoveMode, setPinMoveMode] = useState<boolean>(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    initial.selectedCaseId
  );
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    initial.selectedIncidentId
  );
  const [selectedMapEntity, setSelectedMapEntity] =
    useState<SelectedMapEntity>(null);
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportModalMode, setReportModalMode] =
    useState<ReportModalMode>('family_rescue');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [cases, setCases] = useState<RescueCase[]>(initial.cases);
  const [boats, setBoats] = useState<BoatUnit[]>(initial.boats);
  const [ppsCenters, setPpsCenters] = useState<PPSCenter[]>(initial.ppsCenters);
  const [outages, setOutages] = useState<PowerOutageZone[]>(initial.outages);
  const [roadClosures, setRoadClosures] = useState<RoadClosure[]>(
    initial.roadClosures
  );
  const [supplyDepots, setSupplyDepots] = useState<SupplyDepot[]>(
    initial.supplyDepots
  );
  const [notices, setNotices] = useState<AreaNotice[]>(initial.notices);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>(
    initial.hazardZones
  );
  const [refugeAreas, setRefugeAreas] = useState<RefugeArea[]>(
    initial.refugeAreas
  );
  const [evacRoutes, setEvacRoutes] = useState<VerifiedEvacuationRoute[]>(
    initial.evacRoutes
  );
  const [officialWarnings, setOfficialWarnings] = useState<OfficialWarning[]>(
    initial.officialWarnings
  );
  const [incidents, setIncidents] = useState<CommandIncident[]>(
    initial.incidents
  );
  const [tasks, setTasks] = useState<CommandTask[]>(initial.tasks);
  const [areaInstructions, setAreaInstructions] = useState<AreaInstruction[]>(
    initial.areaInstructions
  );
  const [drafts, setDrafts] = useState<LocalDraftAction[]>(initial.drafts);
  const [baseline, setBaseline] = useState<DrillBaseline>(initial.baseline);
  const [drillEvents, setDrillEvents] = useState<DrillEvent[]>(
    initial.drillEvents
  );

  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const mapSectionRef = useRef<HTMLElement | null>(null);
  const role = accountToRole(account);
  const t = TRANSLATIONS[lang];

  // Toast when the real browser connection changes (skips the first render).
  const prevBrowserOnlineRef = useRef<boolean>(browserOnline);
  useEffect(() => {
    if (prevBrowserOnlineRef.current === browserOnline) return;
    prevBrowserOnlineRef.current = browserOnline;
    setToastMessage(
      browserOnline
        ? `Connection restored · ${drafts.length} waiting to send.`
        : 'No network connection. New actions wait to send.'
    );
    // Only react to connection changes; drafts.length is read at that moment.
  }, [browserOnline]);

  useEffect(() => {
    try {
      const state: PersistedState = {
        account,
        lang,
        selectedCaseId,
        selectedIncidentId,
        cases,
        boats,
        ppsCenters,
        outages,
        roadClosures,
        supplyDepots,
        notices,
        hazardZones,
        refugeAreas,
        evacRoutes,
        officialWarnings,
        incidents,
        tasks,
        areaInstructions,
        drafts,
        baseline,
        drillEvents,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    account,
    lang,
    selectedCaseId,
    selectedIncidentId,
    cases,
    boats,
    ppsCenters,
    outages,
    roadClosures,
    supplyDepots,
    notices,
    hazardZones,
    refugeAreas,
    evacRoutes,
    officialWarnings,
    incidents,
    tasks,
    areaInstructions,
    drafts,
    baseline,
    drillEvents,
  ]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const handleOutside = (ev: MouseEvent) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(ev.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const visibleMapData = useMemo(
    () =>
      getVisibleMapDataForAccount({
        account,
        cases,
        boats,
        ppsCenters,
        outages,
        roadClosures,
        supplyDepots,
      }),
    [account, cases, boats, ppsCenters, outages, roadClosures, supplyDepots]
  );

  const residentSummary = useMemo(
    () => getResidentRescueSummary(account, cases, boats),
    [account, cases, boats]
  );

  const roleAlerts = useMemo(
    () =>
      buildAlertsForAccount({
        account,
        cases,
        boats,
        ppsCenters,
        roadClosures,
        outages,
        hazardZones,
        evacRoutes,
        areaInstructions,
        notices,
        incidents,
      }),
    [
      account,
      cases,
      boats,
      ppsCenters,
      roadClosures,
      outages,
      hazardZones,
      evacRoutes,
      areaInstructions,
      notices,
      incidents,
    ]
  );

  // Case and boat ids referenced by queued items, for "Waiting to send" badges.
  const queuedTargets = useMemo(() => getQueuedTargets(drafts), [drafts]);

  // Rescue requests the resident made offline that have not been sent yet.
  const residentQueuedRequestCount = useMemo(
    () =>
      drafts.filter(
        (d) => d.payloadType === 'new_case' && d.actorRole === 'resident'
      ).length,
    [drafts]
  );

  const residentBottomBarText = useMemo(() => {
    if (account !== 'resident') return undefined;
    if (!residentSummary.hasActiveRequest || !residentSummary.activeCase) {
      if (residentQueuedRequestCount > 0) {
        return `${residentQueuedRequestCount} request(s) waiting to send`;
      }
      return `${t.noActiveRescue} · Tap to request rescue`;
    }
    const landmark = residentSummary.activeCase.pickupLandmark;
    if (residentSummary.assignedBoats.length === 0) {
      return `${landmark} · Waiting for a boat`;
    }
    const summary = formatBoatSummary(
      lang,
      residentSummary.assignedBoats.length,
      residentSummary.onTheWayCount,
      residentSummary.preparingCount,
      residentSummary.arrivedCount
    );
    return `${landmark} · ${summary}`;
  }, [account, residentSummary, residentQueuedRequestCount, lang, t.noActiveRescue]);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const places = SHAH_ALAM_PLACES.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.category} · ${p.postcode}`,
      coordinates: p.coordinates,
    }));
    const shelters = visibleMapData.visiblePps.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.status} · ${p.occupancy}/${p.capacity}`,
      coordinates: p.coordinates,
    }));
    const combined = [...shelters, ...places];
    if (!q) return combined.slice(0, 6);
    return combined
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [searchQuery, visibleMapData.visiblePps]);

  const handleAccountSwitch = (nextAccount: DemoAccountId) => {
    // Close any open detail card, clear temporary pin, and refresh map + alerts immediately
    setSelectedMapEntity(null);
    setPinMoveMode(false);
    setTappedLocation(null);
    setMenuOpen(false);
    setSearchQuery('');
    setSearchFocused(false);
    setForcedLayerReveal(null);
    setAccount(nextAccount);

    if (nextAccount === 'guest') {
      setSelectedCaseId('');
      if (activeView === 'dispatch' || activeView === 'my_rescue') {
        setActiveView('map');
      }
    } else if (nextAccount === 'resident') {
      const owned = getOwnedCasesForAccount('resident', cases);
      setSelectedCaseId(owned[0]?.id ?? '');
      if (activeView === 'dispatch') setActiveView('map');
    } else {
      setSelectedCaseId(cases[0]?.id ?? '');
      if (activeView === 'my_rescue') setActiveView('map');
    }
  };

  const handleSelectSuggestion = (coords: GeoPoint, label: string) => {
    setFocusRequest({ point: { ...coords }, zoom: 15 });
    setSearchQuery(label.split('(')[0].trim());
    setSearchFocused(false);
    setActiveView('map');
  };

  const handleLocateMe = () => {
    if (account === 'resident' && residentSummary.activeCase) {
      setFocusRequest({
        point: { ...residentSummary.activeCase.coordinates },
        zoom: 15,
      });
      return;
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const inShahAlam =
            lat >= 2.95 && lat <= 3.15 && lng >= 101.42 && lng <= 101.62;
          setFocusRequest({
            point: inShahAlam ? { lat, lng } : { ...DEMO_AREA_INFO.mapCenter },
            zoom: inShahAlam ? 15 : 14,
          });
          if (!inShahAlam) {
            setToastMessage('Centered on Shah Alam demo area.');
          }
        },
        () => {
          setFocusRequest({ point: { ...DEMO_AREA_INFO.mapCenter }, zoom: 14 });
          setToastMessage('Centered on Shah Alam demo area.');
        },
        { timeout: 2500 }
      );
    } else {
      setFocusRequest({ point: { ...DEMO_AREA_INFO.mapCenter }, zoom: 14 });
    }
  };

  const handleShowAlertOnMap = (alert: RoleAlertItem) => {
    setActiveView('map');
    const target = alert.focusTarget;
    setFocusRequest({
      point: { ...target.coordinates },
      zoom: target.kind === 'zone' ? 14 : 15,
    });

    if (target.kind === 'zone') {
      const z = hazardZones.find((hz) => hz.id === target.id);
      if (z) {
        setForcedLayerReveal({ [z.hazardType]: true });
      }
      setSelectedMapEntity({ kind: 'zone', ids: [target.id] });
    } else if (target.kind === 'pps') {
      setForcedLayerReveal({ pps: true });
      setSelectedMapEntity({ kind: 'pps', id: target.id });
    } else if (target.kind === 'road') {
      setForcedLayerReveal({ flood: true });
      setSelectedMapEntity({ kind: 'road', id: target.id });
    } else if (target.kind === 'route') {
      setForcedLayerReveal({ routes: true });
      setSelectedMapEntity({ kind: 'route', id: target.id });
    } else if (target.kind === 'boat') {
      setForcedLayerReveal({ boats: true });
      setSelectedMapEntity({ kind: 'boat', id: target.id });
    } else if (target.kind === 'case') {
      setForcedLayerReveal({ cases: true });
      setSelectedCaseId(target.id);
      setSelectedMapEntity({ kind: 'case', id: target.id });
    } else if (target.kind === 'incident') {
      setForcedLayerReveal({ incidents: true });
      setSelectedIncidentId(target.id);
      setSelectedMapEntity({ kind: 'incident', id: target.id });
    } else if (target.kind === 'outage') {
      setForcedLayerReveal({ outages: true });
      setSelectedMapEntity({ kind: 'outage', id: target.id });
    } else if (target.kind === 'river') {
      setForcedLayerReveal({ waterLevels: true });
      setSelectedMapEntity({ kind: 'river' });
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const handleReviewCaseFromAlert = (alert: RoleAlertItem) => {
    if (account !== 'admin') return;
    const target = alert.focusTarget;
    if (target.kind === 'incident') {
      setSelectedIncidentId(target.id);
      setAdminSubTab('command_centre');
      setActiveView('dispatch');
      return;
    }
    if (target.kind === 'case') {
      setSelectedCaseId(target.id);
      const linkedInc = incidents.find((i) =>
        i.linkedCaseIds?.includes(target.id)
      );
      if (linkedInc) {
        setSelectedIncidentId(linkedInc.id);
      }
      setAdminSubTab('boats_cases');
      setActiveView('dispatch');
    }
  };

  // Sends the queue against the real shared state, oldest first (D4). Items
  // that fail a rule stay in the queue with their reason and are never
  // dropped without an explicit user action.
  const syncLocalDrafts = () => {
    if (!isOnline || drafts.length === 0) return;
    const res = applyQueuedActions(
      { cases, boats, roadClosures, outages },
      drafts,
      getNow()
    );
    setCases(res.state.cases);
    setBoats(res.state.boats);
    setRoadClosures(res.state.roadClosures);
    setOutages(res.state.outages);
    setDrafts(res.remaining);
    if (res.events.length > 0) {
      setDrillEvents((prev) => [...prev, ...res.events]);
    }
    const sent = res.sentIds.length;
    setToastMessage(
      res.remaining.length > 0
        ? `Sent ${sent}. ${res.remaining.length} not sent, see reasons.`
        : `Sent ${sent}.`
    );
  };

  // Removes a rejected queue item. Only items that failed to send (and so
  // carry an error) can be removed, and only from an explicit user action.
  const discardQueuedItem = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id || !d.error));
  };

  const handleToggleConnectivity = () => {
    const nextDemoOffline = !demoOffline;
    setDemoOffline(nextDemoOffline);
    setMenuOpen(false);
    if (nextDemoOffline) {
      setToastMessage('Offline mode active: new actions are waiting to send.');
    } else if (!browserOnline) {
      setToastMessage(
        `No network connection · ${drafts.length} waiting to send.`
      );
    } else if (drafts.length > 0) {
      setToastMessage(`Online restored · ${drafts.length} waiting to send.`);
    }
  };

  const handleResetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAccount('guest');
    setActiveView('map');
    setAdminSubTab('command_centre');
    setMenuOpen(false);
    setCases(INITIAL_CASES);
    setBoats(INITIAL_BOATS);
    setPpsCenters(INITIAL_PPS_CENTERS);
    setOutages(INITIAL_OUTAGES);
    setRoadClosures(INITIAL_ROAD_CLOSURES);
    setSupplyDepots(INITIAL_SUPPLY_DEPOTS);
    setNotices(INITIAL_NOTICES);
    setHazardZones(INITIAL_HAZARD_ZONES);
    setRefugeAreas(INITIAL_REFUGE_AREAS);
    setEvacRoutes(INITIAL_EVAC_ROUTES);
    setOfficialWarnings(INITIAL_OFFICIAL_WARNINGS);
    setIncidents(INITIAL_COMMAND_INCIDENTS);
    setTasks(INITIAL_COMMAND_TASKS);
    setAreaInstructions(INITIAL_AREA_INSTRUCTIONS);
    setDrafts([]);
    setBaseline(INITIAL_DRILL_BASELINE);
    setDrillEvents([]);
    setSelectedCaseId('');
    setSelectedIncidentId(INITIAL_COMMAND_INCIDENTS[0].id);
    setSelectedMapEntity(null);
    setForcedLayerReveal(null);
    setDemoOffline(false);
    setSearchQuery('');
    setTappedLocation(null);
    setPinMoveMode(false);
    setFocusRequest({
      point: { ...DEMO_AREA_INFO.mapCenter },
      zoom: DEMO_AREA_INFO.defaultZoom,
    });
    setToastMessage('Demo reset to Shah Alam public view.');
  };

  const openReportDialog = (mode: ReportModalMode) => {
    setMenuOpen(false);
    setReportModalMode(mode);
    setReportModalOpen(true);
  };

  // Desk-only writes need the shared system: while offline they are blocked
  // with a "needs a connection" message and nothing is saved (D2).
  const blockedOffline = (): boolean => {
    if (isOnline) return false;
    setToastMessage(t.needsConnectionMsg);
    return true;
  };

  // Pin & Case Handlers
  const handleMoveSelectedCasePin = (caseId: string, point: GeoPoint) => {
    if (!isOnline) {
      // Crew-side: kept as Waiting to send; shared cases change only when sent (D7).
      const { at, atMs } = getNow();
      const target = cases.find((c) => c.id === caseId);
      const payload: UpdateLocationPayload = {
        caseId,
        mode: 'pin_move',
        pickupLandmark: target?.pickupLandmark ?? '',
        confirmedBy: target?.confirmedByWho ?? '',
        coords: point,
      };
      setDrafts((prev) =>
        enqueueLocalDraft(
          prev,
          {
            actorRole: role,
            summary: `Pickup pin move for ${target?.affectedPersonName ?? caseId} (${point.lat}, ${point.lng})`,
            payloadType: 'update_location',
            payload,
          },
          at,
          atMs
        )
      );
      setPinMoveMode(false);
      setToastMessage(
        `Pin move waiting to send (${point.lat}, ${point.lng}).`
      );
      return;
    }
    const ts = getFormattedTime();
    setCases((prev) => moveCasePin(prev, caseId, point, ts));
    setPinMoveMode(false);
    setToastMessage(`Pickup pin moved (${point.lat}, ${point.lng}).`);
  };

  const handleReportLocationChange = (
    caseId: string,
    newLandmark: string,
    confirmedBy: string,
    coords?: GeoPoint
  ) => {
    if (!isOnline) {
      // Crew-side: no optimistic change; applied with this time when sent (D7).
      const { at, atMs } = getNow();
      const payload: UpdateLocationPayload = {
        caseId,
        mode: 'family_change',
        pickupLandmark: newLandmark,
        confirmedBy,
        coords,
      };
      setDrafts((prev) =>
        enqueueLocalDraft(
          prev,
          {
            actorRole: role,
            summary: `Pickup point change to "${newLandmark}"`,
            payloadType: 'update_location',
            payload,
          },
          at,
          atMs
        )
      );
      setToastMessage(`Pickup point change to "${newLandmark}" is waiting to send.`);
      return;
    }

    const ts = getFormattedTime();
    setCases((prev) =>
      applyFamilyLocationChange(prev, caseId, newLandmark, confirmedBy, coords, ts)
    );
  };

  const handleVerifyPin = (
    caseId: string,
    landmark: string,
    coords: GeoPoint,
    confirmedByWho: string
  ) => {
    if (blockedOffline()) return;
    const { at: ts, atMs } = getNow();
    const res = verifyAndMovePickupPin(cases, boats, caseId, {
      pickupLandmark: landmark,
      coordinates: coords,
      verifiedBy: 'Rescue Coordinator (Demo)',
      timestamp: ts,
      confirmedByWho,
      atMs,
    });
    setCases(res.cases);
    setBoats(res.boats);
  };

  const handleAssignOwnerAndFollowUp = (
    caseId: string,
    owner: string,
    followUp: string
  ) => {
    if (blockedOffline()) return;
    setCases((prev) =>
      assignOwnerAndFollowUp(prev, caseId, owner, followUp)
    );
  };

  const handleConfirmPriority = (
    caseId: string,
    urgency: UrgencyLevel,
    reason: string
  ) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    setCases((prev) =>
      confirmCasePriority(
        prev,
        caseId,
        urgency,
        reason,
        'Rescue Coordinator (Demo)',
        ts
      )
    );
  };

  const handleAssignBoat = (caseId: string, boatId: string) => {
    if (blockedOffline()) {
      return { ok: false, error: t.needsConnectionMsg };
    }
    const { at: ts, atMs } = getNow();
    const res = assignBoatToCase(cases, boats, caseId, boatId, ts);
    setDrillEvents((prev) => [
      ...prev,
      drillEventForAssignment(res, atMs, caseId, boatId),
    ]);
    if (res.ok) {
      setCases(res.cases);
      setBoats(res.boats);
    }
    return { ok: res.ok, error: res.error };
  };

  const handleSendFamilyUpdate = (caseId: string, message: string) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    setCases((prev) =>
      sendFamilyUpdate(prev, caseId, 'Rescue Coordinator (Demo)', message, ts)
    );
  };

  const handleAdvanceBoatStatus = (
    boatId: string,
    nextStatus: BoatStatus,
    eta?: string
  ): ActionOutcome => {
    if (!isOnline) {
      const { at, atMs } = getNow();
      const boat = boats.find((b) => b.id === boatId);
      const boatName = boat?.name ?? boatId;
      const statusLabel = nextStatus.replace(/_/g, ' ');
      const payload: AdvanceBoatPayload = { boatId, nextStatus, eta };
      setDrafts((prev) =>
        enqueueLocalDraft(
          prev,
          {
            actorRole: role,
            summary: `${boatName} marked ${statusLabel}`,
            payloadType: 'advance_boat',
            payload,
          },
          at,
          atMs
        )
      );
      setToastMessage(`${boatName} marked ${statusLabel} · Waiting to send.`);
      return { ok: true, queued: true };
    }
    const ts = getFormattedTime();
    const res = advanceBoatStatus(boats, cases, boatId, nextStatus, ts, eta);
    setBoats(res.boats);
    setCases(res.cases);
    return { ok: true };
  };

  const handleUpdateBoatLocation = (boatId: string, point: GeoPoint) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    setBoats((prev) => updateBoatLocation(prev, boatId, point, ts));
  };

  const handleUpdateBoatResources = (
    boatId: string,
    supplies: BoatUnit['supplies'],
    eta: string
  ) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    setBoats((prev) =>
      prev.map((b) =>
        b.id === boatId
          ? {
              ...b,
              supplies,
              eta: eta.trim() || undefined,
              lastUpdatedAt: ts,
            }
          : b
      )
    );
  };

  // Offline, a queued "arrived" counts toward pickup eligibility (D5). The
  // projected state is only used for this check and is never shown as the
  // current status; online, the real shared state is used.
  const pickupEligibilityFor = (caseId: string): PickupEligibility => {
    if (isOnline) return getPickupEligibility(cases, boats, caseId);
    const projected = projectQueuedState(
      { cases, boats, roadClosures, outages },
      drafts
    );
    return getPickupEligibility(projected.cases, projected.boats, caseId);
  };

  const handleConfirmPersonPickedUp = (
    caseId: string,
    boatId: string
  ): ActionOutcome => {
    const { at: ts, atMs } = getNow();

    if (!isOnline) {
      // Check against the real state plus still-valid queued items (D5), so a
      // queued "arrived" counts. The send step re-checks against the real state.
      const projected = projectQueuedState(
        { cases, boats, roadClosures, outages },
        drafts
      );
      const check = confirmPersonPickedUp(
        projected.cases,
        projected.boats,
        caseId,
        boatId,
        ts
      );
      if (!check.ok) {
        const error = check.error ?? 'Pickup could not be confirmed.';
        setDrillEvents((prev) => [
          ...prev,
          drillEventForPickup(check, atMs, caseId, boatId),
        ]);
        setToastMessage(error);
        return { ok: false, error };
      }
      const target = projected.cases.find((c) => c.id === caseId);
      const payload: ConfirmPickupPayload = { caseId, boatId };
      setDrafts((prev) =>
        enqueueLocalDraft(
          prev,
          {
            actorRole: role,
            summary: `Person picked up: ${target?.affectedPersonName ?? caseId}`,
            payloadType: 'confirm_pickup',
            payload,
          },
          ts,
          atMs
        )
      );
      setToastMessage('Pickup confirmation waiting to send.');
      return { ok: true, queued: true };
    }

    const res = confirmPersonPickedUp(cases, boats, caseId, boatId, ts);
    setDrillEvents((prev) => [
      ...prev,
      drillEventForPickup(res, atMs, caseId, boatId),
    ]);
    if (!res.ok) {
      const error = res.error ?? 'Pickup could not be confirmed.';
      setToastMessage(error);
      return { ok: false, error };
    }
    setCases(res.cases);
    setBoats(res.boats);
    return { ok: true };
  };

  const handleUpdatePps = (
    ppsId: string,
    occupancy: number,
    status: PPSCenter['status']
  ) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    const acceptingArrivals = status !== 'Closed' && status !== 'Standby';
    const res = updatePpsShelterStatus(
      ppsCenters,
      evacRoutes,
      notices,
      ppsId,
      { status, acceptingArrivals, occupancy },
      'Coordinator Demo',
      `${ts} (Demo)`
    );
    setPpsCenters(res.ppsCenters);
    setEvacRoutes(res.routes);
    setNotices(res.notices);
  };

  // Government Command Centre Handlers
  const handleVerifyIncident = (incidentId: string) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              verified: true,
              lastVerifiedAt: `${ts} (Demo)`,
              lastUpdate: `${ts} (Demo)`,
            }
          : inc
      )
    );
  };

  const handleUpdateIncidentSteps = (
    incidentId: string,
    steps: string[],
    floodScenario?: FloodSubScenario
  ) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              procedureSteps: steps,
              floodScenario: floodScenario ?? inc.floodScenario,
              lastUpdate: `${ts} (Demo)`,
            }
          : inc
      )
    );
  };

  const handleCreateTask = (payload: {
    incidentId: string;
    title: string;
    location: string;
    namedTeam: string;
    requiredEquipment: string;
    nextUpdateTime: string;
    isPumpTask?: boolean;
    linkedRoadId?: string;
  }) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    const newTask: CommandTask = {
      id: `task-${Date.now().toString().slice(-4)}`,
      incidentId: payload.incidentId,
      title: payload.title,
      location: payload.location,
      namedTeam: payload.namedTeam,
      requiredEquipment: payload.requiredEquipment,
      nextUpdateTime: payload.nextUpdateTime,
      stage: 'assigned',
      isPumpTask: payload.isPumpTask,
      pumpFieldConfirmedToReopen: false,
      linkedRoadId: payload.linkedRoadId,
      authorisedBy: 'District Rescue Coordinator (Demo)',
      authorisedAt: ts,
      auditLog: [
        {
          timestamp: ts,
          actor: 'District Rescue Coordinator',
          note: `Assigned ${payload.namedTeam} (${payload.requiredEquipment}) at ${payload.location}. Next update ${payload.nextUpdateTime}.`,
        },
      ],
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleAdvanceTask = (
    taskId: string,
    nextStage: TaskStage,
    crewNote: string,
    confirmPumpReopen?: boolean
  ) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    setTasks((prev) =>
      advanceCommandTask(
        prev,
        taskId,
        nextStage,
        crewNote,
        'Field Crew / Coordinator (Demo)',
        ts,
        confirmPumpReopen
      )
    );
  };

  const handleUpdateZoneSeverity = (
    zoneId: string,
    severity: HazardSeverity,
    reason: string
  ) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    setHazardZones((prev) =>
      updateHazardZoneSeverity(
        prev,
        zoneId,
        severity,
        reason,
        'District Rescue Coordinator (Demo)',
        `${ts} (Demo)`
      )
    );
  };

  const handlePublishInstruction = (payload: {
    zoneId: string;
    areaName: string;
    headline: string;
    whatToDo: string;
    whereToGoOrWait: string;
    waitingForRescueNote: string;
    independentTravelNote: string;
    urgent: boolean;
  }) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    setAreaInstructions((prev) => {
      const existing = prev.find((i) => i.zoneId === payload.zoneId);
      if (existing) {
        return prev.map((i) =>
          i.zoneId === payload.zoneId
            ? {
                ...i,
                ...payload,
                updatedAt: `${ts} (Demo)`,
                approvedBy: 'District Rescue Coordinator (Demo)',
                active: true,
              }
            : i
        );
      }
      return [
        {
          id: `instr-${Date.now().toString().slice(-4)}`,
          ...payload,
          updatedAt: `${ts} (Demo)`,
          howToRequestHelp:
            'Tap Request rescue or Menu -> Help someone else',
          approvedBy: 'District Rescue Coordinator (Demo)',
          active: true,
        },
        ...prev,
      ];
    });
  };

  const handleCloseRoadSegment = (roadId: string, reason: string) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    const res = closeRoadSegmentAndWithdrawRoutes(
      roadClosures,
      evacRoutes,
      notices,
      roadId,
      reason,
      'District Rescue Coordinator (Demo)',
      `${ts} (Demo)`
    );
    setRoadClosures(res.roadClosures);
    setEvacRoutes(res.routes);
    setNotices(res.notices);
  };

  const handleReopenRoadSegment = (roadId: string) => {
    if (blockedOffline()) {
      return { ok: false, error: t.needsConnectionMsg };
    }
    const ts = getFormattedTime();
    const res = reopenRoadSegment(
      roadClosures,
      tasks,
      roadId,
      'District Rescue Coordinator (Demo)',
      `${ts} (Demo)`
    );
    if (res.ok) {
      setRoadClosures(res.roadClosures);
    }
    return { ok: res.ok, error: res.error };
  };

  const handleApproveOrWithdrawRoute = (
    routeId: string,
    action: 'approve' | 'withdraw',
    confirm: {
      destinationPpsOpenConfirmed: boolean;
      routeFieldCheckedConfirmed: boolean;
      reason?: string;
    }
  ) => {
    if (blockedOffline()) {
      return { ok: false, error: t.needsConnectionMsg };
    }
    const ts = getFormattedTime();
    const res = approveOrWithdrawRoute(
      evacRoutes,
      ppsCenters,
      roadClosures,
      routeId,
      action,
      confirm,
      'District Rescue Coordinator (Demo)',
      `${ts} (Demo)`
    );
    if (res.ok) {
      setEvacRoutes(res.routes);
    }
    return { ok: res.ok, error: res.error };
  };

  const handleCommandPpsStatus = (
    ppsId: string,
    status: PPSCenter['status'],
    acceptingArrivals: boolean
  ) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    const res = updatePpsShelterStatus(
      ppsCenters,
      evacRoutes,
      notices,
      ppsId,
      { status, acceptingArrivals },
      'District Rescue Coordinator (Demo)',
      `${ts} (Demo)`
    );
    setPpsCenters(res.ppsCenters);
    setEvacRoutes(res.routes);
    setNotices(res.notices);
  };

  const handleUpdateOutage = (
    outageId: string,
    status: PowerOutageZone['status'],
    cause: string,
    etr: string
  ) => {
    if (blockedOffline()) return;
    const ts = getFormattedTime();
    setOutages((prev) =>
      prev.map((o) =>
        o.id === outageId
          ? {
              ...o,
              status,
              confirmedCause: cause || 'Not yet confirmed',
              estimatedRestoration: etr || 'Not yet confirmed',
              updatedAt: `${ts} (Demo)`,
              source: 'Utility Liaison Demo',
            }
          : o
      )
    );
  };

  const handleSubmitRescueCase = (payload: {
    requestMode: 'self' | 'family_assisted';
    affectedPersonName: string;
    relationshipLabel: string;
    householdCount: number;
    postcode: string;
    areaName: string;
    lastSeenLocation: string;
    pickupLandmark: string;
    coordinates: GeoPoint;
    confirmedByWho: string;
    confirmedWhen: string;
    lastContactTime: string;
    reportSource: string;
    reportedDanger: string;
    reporterName: string;
    reporterLocation: string;
    reporterCallbackPhone: string;
    okuNeeds: AssistanceNeed[];
    notes: string;
    photoAttached: boolean;
  }) => {
    const { at: ts, atMs } = getNow();
    const newId = `case-${Date.now().toString().slice(-4)}`;
    const isVerified = !payload.pickupLandmark
      .toLowerCase()
      .includes('unconfirmed');
    const targetOwner: RescueCase['ownerAccountId'] =
      account === 'admin' ? 'other_household' : 'resident';

    const newCase: RescueCase = {
      id: newId,
      ownerAccountId: targetOwner,
      requestMode: payload.requestMode,
      affectedPersonName: payload.affectedPersonName,
      relationshipLabel: payload.relationshipLabel,
      householdCount: payload.householdCount,
      postcode: payload.postcode,
      areaName: payload.areaName,
      lastSeenLocation: payload.lastSeenLocation,
      pickupLandmark: payload.pickupLandmark,
      coordinates: payload.coordinates,
      publicSectorCoordinates: {
        lat: Number((payload.coordinates.lat + 0.0008).toFixed(5)),
        lng: Number((payload.coordinates.lng - 0.0008).toFixed(5)),
      },
      confirmedByWho: payload.confirmedByWho,
      confirmedWhen: payload.confirmedWhen,
      lastContactTime: payload.lastContactTime,
      reportedAt: ts,
      // Online submissions start the drill clock now; a queued request gets
      // reportedAtMs from the queue item's time when it is sent.
      ...(isOnline ? { reportedAtMs: atMs } : {}),
      reportSource: payload.reportSource,
      reporterName: payload.reporterName,
      reporterLocation: payload.reporterLocation,
      reporterCallbackPhone: payload.reporterCallbackPhone,
      locationVerified: isVerified,
      caseOwner: isVerified ? 'Rescue Coordinator' : 'Needs Owner Assignment',
      followUpAction: isVerified
        ? undefined
        : 'Confirm pickup pin via callback',
      status: isVerified ? 'confirmed' : 'unverified',
      urgency: 'moderate',
      priorityConfirmed: false,
      okuNeeds: payload.okuNeeds,
      notes: payload.notes,
      photoAttached: payload.photoAttached,
      assignedBoatIds: [],
      priorityFacts: {
        reportedDanger: payload.reportedDanger,
        abilityToEvacuate:
          payload.okuNeeds.length > 0
            ? payload.okuNeeds.join(', ')
            : 'Not specified',
        timeSinceLastContact: payload.lastContactTime,
        riverStationTrend: `${DEMO_AREA_INFO.riverStationName}: ${DEMO_AREA_INFO.riverLevelMeters} m`,
        buildingFloodDepth: 'Not yet confirmed at building',
        lowLyingTerrain: `Shah Alam (${payload.areaName})`,
        roadAccess: 'Checking nearby road closures',
      },
      familyUpdates: isOnline
        ? [
            {
              id: `init-${newId}`,
              timestamp: ts,
              sender: 'System Demo',
              text: 'Demo request received. Coordinator will review danger and pickup location.',
            },
          ]
        : [
            {
              // Replaced by the "made offline / sent at" update when the queue is sent.
              id: `init-${newId}`,
              timestamp: ts,
              sender: 'This device',
              text: 'Waiting to send. Not yet sent or delivered.',
            },
          ],
      syncState: 'synced',
    };

    if (account === 'guest') {
      setAccount('resident');
    }
    setSelectedMapEntity(null);
    setActiveView('map');
    setFocusRequest({ point: { ...payload.coordinates }, zoom: 15 });

    if (!isOnline) {
      // Held in the queue only: not in cases, map data or alerts until sent (D6).
      const queued: NewCasePayload = { rescueCase: newCase };
      setDrafts((prev) =>
        enqueueLocalDraft(
          prev,
          {
            actorRole: role,
            summary: `Rescue request for ${payload.affectedPersonName}`,
            payloadType: 'new_case',
            payload: queued,
          },
          ts,
          atMs
        )
      );
      setToastMessage(
        `Rescue request for ${payload.affectedPersonName} is waiting to send.`
      );
      return;
    }

    setCases((prev) => [newCase, ...prev]);
    setSelectedCaseId(newId);
    setToastMessage(
      `Rescue request created for ${payload.affectedPersonName}.`
    );
  };

  const handleSubmitLocalIssue = (payload: {
    issueKind: 'road' | 'outage';
    postcode: string;
    areaName: string;
    locationName: string;
    details: string;
    coordinates: GeoPoint;
  }) => {
    const { at: ts, atMs } = getNow();
    const issue: ReportIssuePayload =
      payload.issueKind === 'road'
        ? {
            issueKind: 'road',
            roadClosure: {
              id: `road-${Date.now()}`,
              roadName: payload.locationName,
              areaName: payload.areaName,
              postcode: payload.postcode,
              reason: `${payload.details} (Demo report)`,
              passableByBoatOnly: true,
              verified: false,
              closed: true,
              coordinates: payload.coordinates,
              reportedAt: `${ts} (Demo)`,
              source: 'Resident Report (Pending verification)',
            },
          }
        : {
            issueKind: 'outage',
            outage: {
              id: `outage-${Date.now()}`,
              areaName: `${payload.locationName} (${payload.areaName})`,
              postcode: payload.postcode,
              status: 'Not yet confirmed',
              confirmedCause: 'Not yet confirmed',
              estimatedRestoration: 'Not yet confirmed',
              affectedHouseholds: null,
              center: payload.coordinates,
              radiusMeters: 300,
              updatedAt: `${ts} (Demo)`,
              source: 'Resident Report (Pending utility verification)',
            },
          };

    if (!isOnline) {
      // Held in the queue only: not on the map or in alerts until sent (D6).
      setDrafts((prev) =>
        enqueueLocalDraft(
          prev,
          {
            actorRole: role,
            summary: `Local issue (${payload.issueKind}): ${payload.locationName}`,
            payloadType: 'report_issue',
            payload: issue,
          },
          ts,
          atMs
        )
      );
      setToastMessage(
        `Local issue (${payload.issueKind}): ${payload.locationName} is waiting to send.`
      );
      return;
    }

    if (issue.issueKind === 'road') {
      const roadClosure = issue.roadClosure;
      setRoadClosures((prev) => [roadClosure, ...prev]);
    } else {
      const outage = issue.outage;
      setOutages((prev) => [outage, ...prev]);
    }
    setToastMessage(
      `Posted to Shah Alam demo map: ${payload.locationName}.`
    );
  };

  const handleTriggerDemoScenario = (
    scenario:
      | 'continuity'
      | 'rapid_response'
      | 'data_protection'
      | 'community_support'
  ) => {
    if (scenario === 'continuity') {
      setDemoOffline(true);
      setActiveView('map');
      setToastMessage('Offline mode active: saved cases remain readable.');
    } else if (scenario === 'rapid_response') {
      handleAccountSwitch('admin');
      setDemoOffline(false);
      setSelectedCaseId('case-devi');
      setAdminSubTab('boats_cases');
      setActiveView('dispatch');
    } else if (scenario === 'data_protection') {
      handleAccountSwitch('guest');
      setActiveView('map');
    } else if (scenario === 'community_support') {
      handleAccountSwitch('resident');
      setActiveView('map');
      openReportDialog('family_rescue');
    }
  };

  const workflowCounts = useMemo(() => {
    return {
      total: cases.length,
      uncertain: cases.filter((c) => !c.locationVerified).length,
      confirmed: cases.filter(
        (c) => c.locationVerified && c.status === 'confirmed'
      ).length,
      assigned: cases.filter((c) => c.status === 'assigned').length,
      arrived: cases.filter((c) => c.status === 'boat_arrived').length,
      pickedUp: cases.filter((c) => c.status === 'picked_up').length,
    };
  }, [cases]);

  const modeOptions: Array<{ id: DemoAccountId; label: string }> = [
    { id: 'guest', label: 'Guest' },
    { id: 'resident', label: 'Resident' },
    { id: 'admin', label: 'Admin' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {activeView === 'map' ? (
        <div className="flex flex-col min-h-screen">
          {/* 1. TOP SECTION — Always-visible Mode Switcher + Search + Menu */}
          <header className="sticky top-0 z-[550] bg-white border-b border-slate-200 px-3 sm:px-5 py-2.5">
            <div className="max-w-6xl mx-auto flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              {/* Row 1 on Mobile / Left on Desktop: Brand + Demo Mode + [Guest | Resident | Admin] Switcher */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                      {t.brandTitle}
                    </h1>
                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                      Demo mode
                    </span>
                  </div>
                </div>

                <div
                  role="group"
                  aria-label="Demo mode account switcher"
                  data-testid="mode-switcher"
                  className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 shrink-0"
                >
                  {modeOptions.map((opt) => {
                    const active = account === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`mode-btn-${opt.id}`}
                        aria-pressed={active}
                        onClick={() => handleAccountSwitch(opt.id)}
                        className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[#0F4C81] text-white shadow-xs'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2 on Mobile / Right on Desktop: Search + Admin Command Centre button + Menu */}
              <div className="flex items-center gap-1.5 sm:gap-2 relative min-w-0 md:flex-1 md:max-w-lg md:justify-end">
                <div ref={searchWrapperRef} className="relative flex-1 min-w-0">
                  <div className="h-10 bg-slate-50 border border-slate-200 rounded-lg flex items-center px-2.5 gap-2 focus-within:bg-white focus-within:border-[#0F4C81]">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="search"
                      aria-label={t.searchPlaceholder}
                      value={searchQuery}
                      onFocus={() => setSearchFocused(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchFocused(true);
                      }}
                      placeholder={t.searchPlaceholder}
                      className="w-full min-w-0 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        aria-label={t.closeLabel}
                        onClick={() => setSearchQuery('')}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {searchFocused && searchSuggestions.length > 0 && (
                    <ul
                      role="listbox"
                      aria-label="Search suggestions"
                      className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-xl divide-y divide-slate-100 max-h-64 overflow-y-auto z-[700]"
                    >
                      {searchSuggestions.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() =>
                              handleSelectSuggestion(
                                item.coordinates,
                                item.title
                              )
                            }
                            className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                          >
                            <MapPin className="w-4 h-4 text-[#0F4C81] shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 truncate">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {item.subtitle}
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {account === 'admin' && (
                  <button
                    type="button"
                    data-testid="open-command-centre-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      setAdminSubTab('command_centre');
                      setActiveView('dispatch');
                    }}
                    className="h-10 px-2.5 sm:px-3 bg-[#0F4C81] hover:bg-sky-900 text-white rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Command Centre</span>
                    <span className="sm:hidden">Command</span>
                  </button>
                )}

                <button
                  type="button"
                  aria-label={t.menuLabel}
                  aria-expanded={menuOpen}
                  data-testid="map-menu-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="h-10 w-10 sm:w-auto sm:px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg inline-flex items-center justify-center gap-1.5 text-xs font-medium shrink-0 cursor-pointer"
                >
                  <Menu className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.menuLabel}</span>
                </button>

                {menuOpen && (
                  <div
                    role="dialog"
                    aria-label={t.menuLabel}
                    data-testid="map-menu-popover"
                    className="absolute right-0 top-12 w-72 bg-white border border-slate-200 rounded-lg shadow-2xl p-3 space-y-3 z-[750]"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-900">
                        {t.brandTitle}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        aria-label={t.closeLabel}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-600">
                        {t.languageLabel}
                      </span>
                      <div
                        role="group"
                        aria-label={t.languageLabel}
                        className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5"
                      >
                        {(
                          [
                            ['en', 'EN'],
                            ['bm', 'BM'],
                            ['cn', 'CN'],
                          ] as [LanguageCode, string][]
                        ).map(([code, shortLabel]) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => setLang(code)}
                            aria-pressed={lang === code}
                            className={`min-h-[28px] px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer ${
                              lang === code
                                ? 'bg-[#0F4C81] text-white'
                                : 'text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            {shortLabel}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={() => openReportDialog('issue')}
                        className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>{t.quickActionIssueTitle}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openReportDialog('self_rescue')}
                        className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer"
                      >
                        <LifeBuoy className="w-4 h-4 text-[#0F4C81] shrink-0" />
                        <span>{t.quickActionSelfTitle}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openReportDialog('family_rescue')}
                        className="w-full text-left px-2.5 py-2 text-xs font-semibold text-[#0F4C81] hover:bg-sky-50 rounded-lg flex items-center gap-2 cursor-pointer"
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        <span>{t.quickActionFamilyTitle}</span>
                      </button>
                    </div>

                    <div className="space-y-1 border-t border-slate-100 pt-2">
                      {account === 'resident' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setActiveView('my_rescue');
                          }}
                          className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer"
                        >
                          {t.myRescueTitle}
                        </button>
                      )}
                      {account === 'admin' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              setAdminSubTab('command_centre');
                              setActiveView('dispatch');
                            }}
                            className="w-full text-left px-2.5 py-2 text-xs font-semibold text-[#0F4C81] hover:bg-sky-50 rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Government Command Centre</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              setAdminSubTab('boats_cases');
                              setActiveView('dispatch');
                            }}
                            className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <LifeBuoy className="w-4 h-4 text-slate-700" />
                            <span>Boat Dispatch &amp; Cases</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setActiveView('workflow');
                        }}
                        className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        {t.navHowItWorks}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setActiveView('drill');
                        }}
                        className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        {t.navDrill}
                      </button>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={handleToggleConnectivity}
                        className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer"
                      >
                        {isOnline ? (
                          <Wifi className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-amber-800" />
                        )}
                        <span>{isOnline ? t.onlineBtn : t.offlineBtn}</span>
                      </button>

                      {!browserOnline && (
                        <p
                          role="status"
                          className="px-2.5 text-[11px] font-medium text-amber-900"
                        >
                          {t.browserOfflineNote}
                        </p>
                      )}

                      {drafts.length > 0 && (
                        <WaitingToSendPanel
                          lang={lang}
                          items={drafts}
                          isOnline={isOnline}
                          onSend={syncLocalDrafts}
                          onDiscard={discardQueuedItem}
                        />
                      )}

                      <button
                        type="button"
                        onClick={handleResetDemo}
                        className="w-full text-left px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>{t.resetDemoBtn}</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 leading-snug">
                      {t.demoEmergencyNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* 2. MIDDLE SECTION — Live Map (~half viewport on mobile so Alerts shows immediately below) */}
          <main className="flex-1 flex flex-col">
            <section
              ref={mapSectionRef}
              aria-label="Live Flood Rescue Map"
              data-testid="live-map-section"
              className="relative w-full h-[52dvh] min-h-[350px] lg:h-[58dvh] bg-slate-100"
            >
              <ShahAlamLeafletMap
                account={account}
                lang={lang}
                visibleData={visibleMapData}
                hazardZones={hazardZones}
                refugeAreas={refugeAreas}
                evacRoutes={evacRoutes}
                areaInstructions={areaInstructions}
                incidents={incidents}
                isOnline={isOnline}
                queuedBoatIds={queuedTargets.boatIds}
                selectedCaseId={selectedCaseId}
                onSelectCase={setSelectedCaseId}
                selectedEntity={selectedMapEntity}
                onSelectEntity={setSelectedMapEntity}
                tappedLocation={tappedLocation}
                onTapMapLocation={setTappedLocation}
                focusPoint={focusRequest?.point ?? null}
                focusZoom={focusRequest?.zoom ?? 15}
                pinMoveMode={pinMoveMode}
                onTogglePinMoveMode={setPinMoveMode}
                onMoveSelectedCasePin={handleMoveSelectedCasePin}
                onLocateMe={handleLocateMe}
                residentBottomBarText={residentBottomBarText}
                onOpenResidentDetails={() => {
                  if (
                    residentSummary.hasActiveRequest ||
                    residentQueuedRequestCount > 0
                  ) {
                    setActiveView('my_rescue');
                  } else {
                    openReportDialog('family_rescue');
                  }
                }}
                forcedLayerReveal={forcedLayerReveal}
                allCasesForAdmin={account === 'admin' ? cases : []}
                onAdminAssignBoat={handleAssignBoat}
                onAdminAdvanceBoatStatus={handleAdvanceBoatStatus}
                onAdminUpdateBoatLocation={handleUpdateBoatLocation}
                onAdminConfirmPickedUp={handleConfirmPersonPickedUp}
                getPickupEligibility={pickupEligibilityFor}
                onAdminConfirmPriority={handleConfirmPriority}
                onOpenCommandCentreIncident={(incidentId) => {
                  setSelectedIncidentId(incidentId);
                  setAdminSubTab('command_centre');
                  setActiveView('dispatch');
                }}
                onOpenDispatchTab={() => {
                  setAdminSubTab('boats_cases');
                  setActiveView('dispatch');
                }}
              />

              {toastMessage && (
                <div
                  role="status"
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-[620] pointer-events-auto bg-slate-900 text-white text-xs px-3.5 py-2 rounded-lg shadow-lg max-w-md text-center"
                >
                  {toastMessage}
                </div>
              )}
            </section>

            {/* 3. BELOW MAP — Scrollable Role-Filtered Alerts Section */}
            <AlertsSection
              account={account}
              alerts={roleAlerts}
              onShowOnMap={handleShowAlertOnMap}
              onReviewCase={handleReviewCaseFromAlert}
            />
          </main>
        </div>
      ) : (
        /* Secondary Views (Admin Command Centre & Dispatch / My Rescue / How It Works / Drill Check) */
        <div className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20">
            <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-testid="back-to-map-btn"
                  onClick={() => setActiveView('map')}
                  className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.navMap}</span>
                </button>
                <span className="text-sm font-bold text-slate-900 truncate">
                  {activeView === 'dispatch'
                    ? adminSubTab === 'command_centre'
                      ? 'Government Command Centre'
                      : t.navDispatch
                    : activeView === 'my_rescue'
                    ? t.myRescueTitle
                    : activeView === 'workflow'
                    ? t.navHowItWorks
                    : t.navDrill}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Demo mode
                </span>
                <div
                  role="group"
                  aria-label="Demo mode account switcher"
                  className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5"
                >
                  {modeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={account === opt.id}
                      onClick={() => handleAccountSwitch(opt.id)}
                      className={`min-h-[34px] px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                        account === opt.id
                          ? 'bg-[#0F4C81] text-white'
                          : 'text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
            {activeView === 'my_rescue' && (
              <FamilyTrackerCard
                account={account}
                lang={lang}
                cases={cases}
                boats={boats}
                residentSummary={residentSummary}
                selectedCaseId={selectedCaseId}
                onSelectCase={setSelectedCaseId}
                isOnline={isOnline}
                waitingItems={drafts.filter(
                  (d) => d.actorRole !== 'coordinator'
                )}
                queuedCaseIds={queuedTargets.caseIds}
                tappedLocation={tappedLocation}
                onReportLocationChange={handleReportLocationChange}
                onRequestRescue={() => openReportDialog('family_rescue')}
                onSwitchAccount={handleAccountSwitch}
              />
            )}

            {activeView === 'dispatch' && (
              <div className="space-y-4">
                <div
                  role="tablist"
                  aria-label="Admin workspace tabs"
                  className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-1 gap-1"
                >
                  <button
                    type="button"
                    role="tab"
                    data-testid="admin-tab-command"
                    aria-selected={adminSubTab === 'command_centre'}
                    onClick={() => setAdminSubTab('command_centre')}
                    className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                      adminSubTab === 'command_centre'
                        ? 'bg-[#0F4C81] text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Government Command Centre
                  </button>
                  <button
                    type="button"
                    role="tab"
                    data-testid="admin-tab-boats"
                    aria-selected={adminSubTab === 'boats_cases'}
                    onClick={() => setAdminSubTab('boats_cases')}
                    className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                      adminSubTab === 'boats_cases'
                        ? 'bg-[#0F4C81] text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Boat Dispatch &amp; Pickup Cases
                  </button>
                </div>

                {adminSubTab === 'command_centre' ? (
                  <CommandCentrePanel
                    account={account}
                    onSwitchAccount={handleAccountSwitch}
                    isOnline={isOnline}
                    incidents={incidents}
                    selectedIncidentId={selectedIncidentId}
                    onSelectIncident={setSelectedIncidentId}
                    tasks={tasks}
                    officialWarnings={officialWarnings}
                    hazardZones={hazardZones}
                    routes={evacRoutes}
                    roadClosures={roadClosures}
                    ppsCenters={ppsCenters}
                    areaInstructions={areaInstructions}
                    cases={cases}
                    boats={boats}
                    onVerifyIncident={handleVerifyIncident}
                    onUpdateIncidentSteps={handleUpdateIncidentSteps}
                    onCreateTask={handleCreateTask}
                    onAdvanceTask={handleAdvanceTask}
                    onUpdateZoneSeverity={handleUpdateZoneSeverity}
                    onPublishInstruction={handlePublishInstruction}
                    onCloseRoadSegment={handleCloseRoadSegment}
                    onReopenRoadSegment={handleReopenRoadSegment}
                    onApproveOrWithdrawRoute={handleApproveOrWithdrawRoute}
                    onUpdatePpsStatus={handleCommandPpsStatus}
                    onShowIncidentOnMap={(inc) => {
                      setActiveView('map');
                      setFocusRequest({ point: { ...inc.coordinates }, zoom: 14 });
                      setForcedLayerReveal({ incidents: true, flood: true });
                      setSelectedMapEntity({ kind: 'incident', id: inc.id });
                    }}
                    onShowRouteOnMap={(routeId) => {
                      const route = evacRoutes.find((r) => r.id === routeId);
                      setActiveView('map');
                      if (route && route.path[0]) {
                        setFocusRequest({ point: { ...route.path[0] }, zoom: 15 });
                      }
                      setForcedLayerReveal({ routes: true });
                      setSelectedMapEntity({ kind: 'route', id: routeId });
                    }}
                  />
                ) : (
                  <CoordinatorConsole
                    account={account}
                    lang={lang}
                    onSwitchAccount={handleAccountSwitch}
                    isOnline={isOnline}
                    queuedCaseIds={queuedTargets.caseIds}
                    queuedBoatIds={queuedTargets.boatIds}
                    cases={cases}
                    boats={boats}
                    ppsCenters={ppsCenters}
                    outages={outages}
                    selectedCaseId={selectedCaseId}
                    onSelectCase={setSelectedCaseId}
                    tappedLocation={tappedLocation}
                    onVerifyPin={handleVerifyPin}
                    onAssignOwnerAndFollowUp={handleAssignOwnerAndFollowUp}
                    onConfirmPriority={handleConfirmPriority}
                    onAssignBoat={handleAssignBoat}
                    onSendFamilyUpdate={handleSendFamilyUpdate}
                    onAdvanceBoatStatus={handleAdvanceBoatStatus}
                    onUpdateBoatLocation={handleUpdateBoatLocation}
                    onUpdateBoatResources={handleUpdateBoatResources}
                    onConfirmPersonPickedUp={handleConfirmPersonPickedUp}
                    getPickupEligibility={pickupEligibilityFor}
                    onUpdatePps={handleUpdatePps}
                    onUpdateOutage={handleUpdateOutage}
                  />
                )}
              </div>
            )}

            {activeView === 'workflow' && (
              <section
                aria-label={t.workflowHeading}
                className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
              >
                <div className="max-w-3xl space-y-1">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {t.workflowHeading}
                  </h2>
                  <p className="text-sm text-slate-600">{t.workflowSub}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {[
                    {
                      step: '01. Separate Report',
                      count: workflowCounts.total,
                      desc: 'Family reports the person’s location separately from their own contact.',
                    },
                    {
                      step: '02. Check Spot',
                      count: workflowCounts.uncertain,
                      desc: 'Unclear spots get a helper assigned; urgent cases can still dispatch while checking.',
                    },
                    {
                      step: '03. Boats Assigned',
                      count: workflowCounts.confirmed + workflowCounts.assigned,
                      desc: 'Multiple boats can help one pickup spot; one boat goes to one spot at a time.',
                    },
                    {
                      step: '04. Boat Arrived',
                      count: workflowCounts.arrived,
                      desc: 'Arrival updates the family, while the case stays open until boarding.',
                    },
                    {
                      step: '05. Person Picked Up',
                      count: workflowCounts.pickedUp,
                      desc: 'Each waiting household is checked off individually when safely on board.',
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/70 flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#0F4C81]">
                          {item.step}
                        </div>
                        <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                          {item.count}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.desc}
                      </p>
                      {item.step.startsWith('05') && (
                        <div className="text-[11px] text-emerald-800 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>No false rescued status</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeView === 'drill' && (
              <DrillBenchmarkView
                lang={lang}
                cases={cases}
                drillEvents={drillEvents}
                baseline={baseline}
                onUpdateBaseline={setBaseline}
                onTriggerDemoScenario={handleTriggerDemoScenario}
                currentRole={role}
                isOnline={isOnline}
              />
            )}
          </main>
        </div>
      )}

      <ReportModal
        isOpen={reportModalOpen}
        lang={lang}
        initialMode={reportModalMode}
        isOnline={isOnline}
        tappedLocation={tappedLocation}
        onClose={() => setReportModalOpen(false)}
        onSubmitRescueCase={handleSubmitRescueCase}
        onSubmitLocalIssue={handleSubmitLocalIssue}
      />
    </div>
  );
}
