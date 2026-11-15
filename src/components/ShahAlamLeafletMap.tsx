import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  CloudLightning,
  Crosshair,
  Flame,
  Layers,
  LocateFixed,
  MapPin,
  Mountain,
  Navigation,
  Package,
  ShieldCheck,
  UserCheck,
  Waves,
  WifiOff,
  X,
  ZapOff,
} from 'lucide-react';
import rescueBoatImg from '../assets/malaysian-rescue-boat.svg';
import {
  AreaInstruction,
  BoatStatus,
  CommandIncident,
  DemoAccountId,
  GeoPoint,
  HazardSeverity,
  HazardZone,
  LanguageCode,
  PPSCenter,
  PowerOutageZone,
  RefugeArea,
  RescueCase,
  RoadClosure,
  SupplyDepot,
  UrgencyLevel,
  VerifiedEvacuationRoute,
} from '../types/rescue';
import {
  DEMO_AREA_INFO,
  HAZARD_PALETTES,
  SHAH_ALAM_PLACES,
  TERRAIN_BASINS,
  TerrainBasin,
} from '../data/seedData';
import {
  ActionOutcome,
  ClusterablePoint,
  clusterMarkersByZoom,
  findZonesAtPoint,
  getHazardColor,
  getHazardSeverityLabel,
  PickupEligibility,
  RedactedCaseView,
  VisibleBoatView,
  VisibleMapData,
} from '../utils/rescueLogic';
import { formatBoatStatus, formatCaseStatus, TRANSLATIONS } from '../i18n/translations';

export type SelectedMapEntity =
  | { kind: 'boat'; id: string }
  | { kind: 'case'; id: string }
  | { kind: 'pps'; id: string }
  | { kind: 'outage'; id: string }
  | { kind: 'road'; id: string }
  | { kind: 'supply'; id: string }
  | { kind: 'terrain'; id: string }
  | { kind: 'zone'; ids: string[] }
  | { kind: 'route'; id: string }
  | { kind: 'incident'; id: string }
  | { kind: 'refuge'; id: string }
  | { kind: 'river' }
  | null;

export type LayerKey =
  | 'flood'
  | 'earthquake'
  | 'fire'
  | 'pps'
  | 'refuge'
  | 'routes'
  | 'incidents'
  | 'boats'
  | 'cases'
  | 'supplies'
  | 'outages'
  | 'waterLevels'
  | 'terrain';

export function getDefaultLayersForAccount(account: DemoAccountId): Record<LayerKey, boolean> {
  if (account === 'guest') {
    return {
      flood: true,
      earthquake: false,
      fire: false,
      pps: true,
      refuge: true,
      routes: true,
      incidents: false,
      boats: false,
      cases: false,
      supplies: false,
      outages: false,
      waterLevels: false,
      terrain: false,
    };
  }
  if (account === 'resident') {
    return {
      flood: true,
      earthquake: false,
      fire: false,
      pps: true,
      refuge: true,
      routes: true,
      incidents: false,
      boats: true,
      cases: true,
      supplies: false,
      outages: false,
      waterLevels: false,
      terrain: false,
    };
  }
  // Admin: active incidents, rescue cases, boats, hazard & shelters/routes by default; supplies/terrain/outages in Layers
  return {
    flood: true,
    earthquake: false,
    fire: false,
    pps: true,
    refuge: true,
    routes: true,
    incidents: true,
    cases: true,
    boats: true,
    supplies: false,
    outages: false,
    waterLevels: false,
    terrain: false,
  };
}

interface ShahAlamLeafletMapProps {
  account: DemoAccountId;
  lang: LanguageCode;
  visibleData: VisibleMapData;
  hazardZones: HazardZone[];
  refugeAreas: RefugeArea[];
  evacRoutes: VerifiedEvacuationRoute[];
  areaInstructions: AreaInstruction[];
  incidents: CommandIncident[];
  isOnline: boolean;
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  selectedEntity: SelectedMapEntity;
  onSelectEntity: (entity: SelectedMapEntity) => void;
  tappedLocation: GeoPoint | null;
  onTapMapLocation: (point: GeoPoint) => void;
  focusPoint: GeoPoint | null;
  focusZoom?: number;
  pinMoveMode: boolean;
  onTogglePinMoveMode: (active: boolean) => void;
  onMoveSelectedCasePin?: (caseId: string, point: GeoPoint) => void;
  onLocateMe: () => void;
  residentBottomBarText?: string;
  onOpenResidentDetails?: () => void;
  forcedLayerReveal?: Partial<Record<LayerKey, boolean>> | null;
  // Admin-only interactive boat/case/command handlers
  allCasesForAdmin?: RescueCase[];
  onAdminAssignBoat?: (caseId: string, boatId: string) => { ok: boolean; error?: string };
  onAdminAdvanceBoatStatus?: (boatId: string, nextStatus: BoatStatus, eta?: string) => ActionOutcome;
  onAdminUpdateBoatLocation?: (boatId: string, point: GeoPoint) => void;
  onAdminConfirmPickedUp?: (caseId: string, boatId: string) => ActionOutcome;
  getPickupEligibility?: (caseId: string) => PickupEligibility;
  onAdminConfirmPriority?: (caseId: string, urgency: UrgencyLevel, reason: string) => void;
  onOpenCommandCentreIncident?: (incidentId: string) => void;
  onOpenDispatchTab?: () => void;
  // Boats with a status change in the "Waiting to send" queue (2.16)
  queuedBoatIds?: Set<string>;
}

const EMPTY_ID_SET: Set<string> = new Set<string>();

type AdminFeedback = { ok: boolean; msg: string; queued?: boolean };

type ClusterPayload =
  | { kind: 'boat'; boat: VisibleBoatView }
  | { kind: 'caseGroup'; rep: RedactedCaseView; items: RedactedCaseView[] };

function computeSegmentBearingDeg(from: GeoPoint, to: GeoPoint): number {
  const dy = to.lat - from.lat;
  const dx = (to.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180);
  const rad = Math.atan2(dx, dy);
  return (rad * 180) / Math.PI;
}

export const ShahAlamLeafletMap: React.FC<ShahAlamLeafletMapProps> = ({
  account,
  lang,
  visibleData,
  hazardZones,
  refugeAreas,
  evacRoutes,
  areaInstructions,
  incidents,
  isOnline,
  selectedCaseId,
  onSelectCase,
  selectedEntity,
  onSelectEntity,
  tappedLocation,
  onTapMapLocation,
  focusPoint,
  focusZoom = 15,
  pinMoveMode,
  onTogglePinMoveMode,
  onMoveSelectedCasePin,
  onLocateMe,
  residentBottomBarText,
  onOpenResidentDetails,
  forcedLayerReveal,
  allCasesForAdmin = [],
  onAdminAssignBoat,
  onAdminAdvanceBoatStatus,
  onAdminUpdateBoatLocation,
  onAdminConfirmPickedUp,
  getPickupEligibility,
  onAdminConfirmPriority,
  onOpenCommandCentreIncident,
  onOpenDispatchTab,
  queuedBoatIds = EMPTY_ID_SET,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const prevAccountRef = useRef<DemoAccountId | null>(null);

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(() =>
    getDefaultLayersForAccount(account)
  );
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(DEMO_AREA_INFO.defaultZoom);
  const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null);

  // Admin inline boat & priority controls state
  const [boatAssignCaseId, setBoatAssignCaseId] = useState<string>('');
  const [boatEtaInput, setBoatEtaInput] = useState<string>('');
  const [boatMoveModeId, setBoatMoveModeId] = useState<string | null>(null);
  const [adminFeedback, setAdminFeedback] = useState<AdminFeedback | null>(null);

  const t = TRANSLATIONS[lang];

  // Boat location updates need a connection (2.17): cancel an armed move when going offline.
  useEffect(() => {
    if (!isOnline) setBoatMoveModeId(null);
  }, [isOnline]);

  // Apply role-based default layers & reset transient map interaction when account switches
  useEffect(() => {
    setLayers(getDefaultLayersForAccount(account));
    setLayersMenuOpen(false);
    setBoatMoveModeId(null);
    setAdminFeedback(null);
    setBoatAssignCaseId('');
    setBoatEtaInput('');
    setHighlightedRouteId(null);
  }, [account]);

  useEffect(() => {
    if (!forcedLayerReveal) return;
    setLayers((prev) => ({ ...prev, ...forcedLayerReveal }));
  }, [forcedLayerReveal]);

  const activeVisibleHazardZones = useMemo(() => {
    return hazardZones.filter((z) => {
      if (z.hazardType === 'flood') return layers.flood;
      if (z.hazardType === 'earthquake') return layers.earthquake;
      if (z.hazardType === 'fire') return layers.fire;
      return false;
    });
  }, [hazardZones, layers.flood, layers.earthquake, layers.fire]);

  const callbacksRef = useRef({
    onTapMapLocation,
    onSelectCase,
    onSelectEntity,
    onMoveSelectedCasePin,
    onAdminUpdateBoatLocation,
    pinMoveMode,
    boatMoveModeId,
    selectedCaseId,
    account,
    activeVisibleHazardZones,
  });
  callbacksRef.current = {
    onTapMapLocation,
    onSelectCase,
    onSelectEntity,
    onMoveSelectedCasePin,
    onAdminUpdateBoatLocation,
    pinMoveMode,
    boatMoveModeId,
    selectedCaseId,
    account,
    activeVisibleHazardZones,
  };

  const groupedPins = useMemo(() => {
    const groups = new Map<string, RedactedCaseView[]>();
    for (const c of visibleData.visibleCases) {
      const list = groups.get(c.pickupLandmark) ?? [];
      list.push(c);
      groups.set(c.pickupLandmark, list);
    }
    return Array.from(groups.entries()).map(([landmark, items]) => {
      const rep =
        items.find((i) => i.id === selectedCaseId) ??
        items.find((i) => !i.isExactLocationHidden) ??
        items[0];
      return {
        landmark,
        items,
        rep,
        allPickedUp: items.every((i) => i.status === 'picked_up'),
        anyUnverified: items.some((i) => !i.locationVerified),
        anyUrgent: items.some((i) => i.urgency === 'critical' && i.status !== 'picked_up'),
      };
    });
  }, [visibleData.visibleCases, selectedCaseId]);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [DEMO_AREA_INFO.mapCenter.lat, DEMO_AREA_INFO.mapCenter.lng],
      zoom: DEMO_AREA_INFO.defaultZoom,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      updateWhenIdle: true,
      keepBuffer: 2,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    map.on('click', (ev: L.LeafletMouseEvent) => {
      const point = {
        lat: Number(ev.latlng.lat.toFixed(5)),
        lng: Number(ev.latlng.lng.toFixed(5)),
      };
      callbacksRef.current.onTapMapLocation(point);
      setLayersMenuOpen(false);

      if (
        callbacksRef.current.account === 'admin' &&
        callbacksRef.current.boatMoveModeId &&
        callbacksRef.current.onAdminUpdateBoatLocation
      ) {
        callbacksRef.current.onAdminUpdateBoatLocation(
          callbacksRef.current.boatMoveModeId,
          point
        );
        setBoatMoveModeId(null);
        setAdminFeedback({
          ok: true,
          msg: `Boat position updated to (${point.lat}, ${point.lng}).`,
        });
        return;
      }

      if (
        callbacksRef.current.pinMoveMode &&
        callbacksRef.current.onMoveSelectedCasePin &&
        callbacksRef.current.selectedCaseId
      ) {
        callbacksRef.current.onMoveSelectedCasePin(
          callbacksRef.current.selectedCaseId,
          point
        );
        return;
      }

      // Check if tap landed inside one or more visible hazard polygons (supports overlapping zones)
      const hitZones = findZonesAtPoint(
        callbacksRef.current.activeVisibleHazardZones,
        point
      );
      if (hitZones.length > 0) {
        callbacksRef.current.onSelectEntity({
          kind: 'zone',
          ids: hitZones.map((z) => z.id),
        });
        return;
      }

      callbacksRef.current.onSelectEntity(null);
    });

    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    const timer = window.setTimeout(() => map.invalidateSize(), 120);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Center on Resident's confirmed pickup point + assigned boats when entering Resident view
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const prevAccount = prevAccountRef.current;
    prevAccountRef.current = account;

    if (account === 'resident' && prevAccount !== 'resident') {
      const pts: Array<[number, number]> = [];
      for (const c of visibleData.visibleCases) {
        pts.push([c.coordinates.lat, c.coordinates.lng]);
      }
      for (const b of visibleData.visibleBoats) {
        pts.push([b.position.lat, b.position.lng]);
      }
      if (pts.length === 1) {
        map.setView(pts[0], 15);
      } else if (pts.length > 1) {
        const bounds = L.latLngBounds(pts);
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 15 });
      }
    } else if (account === 'admin' && prevAccount !== 'admin') {
      map.setView([DEMO_AREA_INFO.mapCenter.lat, DEMO_AREA_INFO.mapCenter.lng], 13);
    } else if (account === 'guest' && prevAccount !== null && prevAccount !== 'guest') {
      map.setView([DEMO_AREA_INFO.mapCenter.lat, DEMO_AREA_INFO.mapCenter.lng], 13);
    }
  }, [account, visibleData.visibleCases, visibleData.visibleBoats]);

  // Fly to focused point
  useEffect(() => {
    if (!mapInstanceRef.current || !focusPoint) return;
    mapInstanceRef.current.flyTo([focusPoint.lat, focusPoint.lng], focusZoom, {
      duration: 0.5,
    });
  }, [focusPoint, focusZoom]);

  // Fit bounds when user explicitly views a route
  const showRouteOnMap = (routeId: string) => {
    const route = evacRoutes.find((r) => r.id === routeId);
    if (!route || route.status !== 'approved') return;
    setLayers((prev) => ({ ...prev, routes: true }));
    setHighlightedRouteId(route.id);
    onSelectEntity({ kind: 'route', id: route.id });
    if (mapInstanceRef.current && route.path.length > 1) {
      const bounds = L.latLngBounds(route.path.map((p) => [p.lat, p.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  };

  // Rebuild Leaflet vector & marker layers cleanly
  useEffect(() => {
    const group = layerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!group || !map) return;
    group.clearLayers();

    // Ensure SVG diagonal grey hatch pattern exists for unknown/outdated hazard polygons
    const containerEl = map.getContainer();
    const ensureHatchPattern = () => {
      const overlaySvg = containerEl.querySelector('.leaflet-overlay-pane svg');
      if (!overlaySvg) return;
      if (!overlaySvg.querySelector('#hazard-unknown-hatch')) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const defs = document.createElementNS(svgNS, 'defs');
        const pat = document.createElementNS(svgNS, 'pattern');
        pat.setAttribute('id', 'hazard-unknown-hatch');
        pat.setAttribute('width', '8');
        pat.setAttribute('height', '8');
        pat.setAttribute('patternTransform', 'rotate(45 0 0)');
        pat.setAttribute('patternUnits', 'userSpaceOnUse');

        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('width', '8');
        rect.setAttribute('height', '8');
        rect.setAttribute('fill', '#94A3B8');
        rect.setAttribute('fill-opacity', '0.12');

        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', '0');
        line.setAttribute('y1', '0');
        line.setAttribute('x2', '0');
        line.setAttribute('y2', '8');
        line.setAttribute('stroke', '#64748B');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-opacity', '0.5');

        pat.appendChild(rect);
        pat.appendChild(line);
        defs.appendChild(pat);
        overlaySvg.insertBefore(defs, overlaySvg.firstChild);
      }
    };

    // 1. Multi-Hazard Polygons (Flood, Earthquake, Fire + Grey Hatch for Unknown/Outdated)
    for (const zone of activeVisibleHazardZones) {
      const isUnknown = zone.severity === 'unknown' || zone.outdated;
      const fillColor = getHazardColor(zone.hazardType, zone.severity);
      const borderColor = isUnknown ? '#64748B' : fillColor;
      const fillOpacity = isUnknown
        ? 0.45
        : zone.severity === 'critical'
        ? 0.28
        : zone.severity === 'high'
        ? 0.22
        : 0.17;

      const poly = L.polygon(
        zone.polygon.map((p) => [p.lat, p.lng] as [number, number]),
        {
          color: borderColor,
          weight: 1.75,
          dashArray: isUnknown ? '5 4' : undefined,
          fillColor: isUnknown ? 'url(#hazard-unknown-hatch)' : fillColor,
          fillOpacity,
        }
      );

      poly.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        const pt = { lat: ev.latlng.lat, lng: ev.latlng.lng };
        const overlapping = findZonesAtPoint(activeVisibleHazardZones, pt);
        callbacksRef.current.onSelectEntity({
          kind: 'zone',
          ids: overlapping.length > 0 ? overlapping.map((z) => z.id) : [zone.id],
        });
      });
      poly.addTo(group);
    }

    // Apply hatch pattern if any polygon created the overlay SVG
    window.requestAnimationFrame(ensureHatchPattern);

    // 2. Terrain Low-Lying Elevation Basins (Admin Layers toggle)
    if (account === 'admin' && layers.terrain) {
      for (const basin of TERRAIN_BASINS) {
        const poly = L.polygon(basin.polygon, {
          color: '#475569',
          weight: 1.5,
          dashArray: '4 4',
          fillColor: '#64748B',
          fillOpacity: 0.14,
        });
        poly.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          callbacksRef.current.onSelectEntity({ kind: 'terrain', id: basin.id });
        });
        poly.addTo(group);
      }
    }

    // 3. Verified Refuge Areas (pale green fill + dashed green outline ONLY on verified school/refuge compound)
    if (layers.refuge) {
      for (const refuge of refugeAreas) {
        const linkedPps = visibleData.visiblePps.find((p) => p.id === refuge.ppsId);
        if (!linkedPps && account !== 'admin') continue;
        const poly = L.polygon(
          refuge.polygon.map((p) => [p.lat, p.lng] as [number, number]),
          {
            color: '#15803D',
            weight: 2,
            dashArray: '6 5',
            fillColor: '#22C55E',
            fillOpacity: 0.16,
          }
        );
        poly.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          callbacksRef.current.onSelectEntity({ kind: 'refuge', id: refuge.id });
        });
        poly.addTo(group);
      }
    }

    // 4. Water Levels (River Station Gauge)
    if (layers.waterLevels) {
      const riverPlace = SHAH_ALAM_PLACES.find((p) => p.category === 'River Station');
      if (riverPlace) {
        const riverIcon = L.divIcon({
          className: 'custom-leaflet-pin',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          html: `<div style="width:30px;height:30px;border-radius:9999px;background:#0369A1;border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(15,23,42,0.3);display:flex;align-items:center;justify-content:center;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>
          </div>`,
        });
        const marker = L.marker([riverPlace.coordinates.lat, riverPlace.coordinates.lng], {
          icon: riverIcon,
          alt: DEMO_AREA_INFO.riverStationName,
          title: DEMO_AREA_INFO.riverStationName,
        });
        marker.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          callbacksRef.current.onSelectEntity({ kind: 'river' });
        });
        marker.addTo(group);
      }
    }

    // 5. Outage Areas
    if (layers.outages) {
      for (const zone of visibleData.visibleOutages) {
        const isRestored = zone.status === 'Restored';
        const color = isRestored ? '#059669' : '#D97706';
        const circle = L.circle([zone.center.lat, zone.center.lng], {
          radius: zone.radiusMeters,
          color,
          weight: 2,
          dashArray: isRestored ? undefined : '6 5',
          fillColor: color,
          fillOpacity: isRestored ? 0.06 : 0.11,
        });
        circle.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          callbacksRef.current.onSelectEntity({ kind: 'outage', id: zone.id });
        });
        circle.addTo(group);

        const rimLat = zone.center.lat + (zone.radiusMeters / 111320) * 0.65;
        const outageIcon = L.divIcon({
          className: 'custom-leaflet-pin',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `<div style="width:28px;height:28px;border-radius:9999px;background:${color};border:2px solid #FFFFFF;box-shadow:0 2px 5px rgba(15,23,42,0.26);display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>`,
        });
        const labelMarker = L.marker([rimLat, zone.center.lng], {
          icon: outageIcon,
          alt: `${zone.areaName} power status`,
          title: `${zone.areaName} power status`,
        });
        labelMarker.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          callbacksRef.current.onSelectEntity({ kind: 'outage', id: zone.id });
        });
        labelMarker.addTo(group);
      }
    }

    // 6. Verified Closed Roads (always visible when flood/roads are shown)
    if (layers.flood) {
      for (const road of visibleData.visibleRoads.filter((r) => r.closed || account === 'admin')) {
        const roadColor = road.closed ? '#D97706' : '#64748B';
        const roadIcon = L.divIcon({
          className: 'custom-leaflet-pin',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          html: `<div style="width:26px;height:26px;border-radius:6px;background:${roadColor};border:2px solid #FFFFFF;box-shadow:0 2px 5px rgba(15,23,42,0.26);display:flex;align-items:center;justify-content:center;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>`,
        });
        const m = L.marker([road.coordinates.lat, road.coordinates.lng], {
          icon: roadIcon,
          alt: road.roadName,
          title: road.roadName,
        });
        m.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          callbacksRef.current.onSelectEntity({ kind: 'road', id: road.id });
        });
        m.addTo(group);
      }
    }

    // 7. Verified Evacuation Routes (Purple #6D28D9 line with White outline + directional arrows)
    if (layers.routes) {
      const approvedRoutes = evacRoutes.filter((r) => r.status === 'approved');
      for (const route of approvedRoutes) {
        const latLngs = route.path.map((p) => [p.lat, p.lng] as [number, number]);
        const isHighlighted =
          highlightedRouteId === route.id ||
          (selectedEntity?.kind === 'route' && selectedEntity.id === route.id);

        // White outline casing
        const casing = L.polyline(latLngs, {
          color: '#FFFFFF',
          weight: isHighlighted ? 9 : 7.5,
          opacity: 0.96,
          lineCap: 'round',
          lineJoin: 'round',
        });
        casing.addTo(group);

        // High-contrast purple route line (#6D28D9)
        const line = L.polyline(latLngs, {
          color: '#6D28D9',
          weight: isHighlighted ? 5.5 : 4.2,
          opacity: 0.96,
          lineCap: 'round',
          lineJoin: 'round',
        });
        line.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          callbacksRef.current.onSelectEntity({ kind: 'route', id: route.id });
        });
        line.addTo(group);

        // Directional purple arrow markers at segment midpoints
        for (let i = 0; i < route.path.length - 1; i++) {
          const a = route.path[i];
          const b = route.path[i + 1];
          const midLat = (a.lat + b.lat) / 2;
          const midLng = (a.lng + b.lng) / 2;
          const deg = computeSegmentBearingDeg(a, b);
          const arrowIcon = L.divIcon({
            className: 'route-arrow-marker',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            html: `<div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;transform:rotate(${deg}deg);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#6D28D9" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round">
                <polygon points="12 2 20 20 12 15 4 20 12 2" />
              </svg>
            </div>`,
          });
          const arrowMarker = L.marker([midLat, midLng], {
            icon: arrowIcon,
            zIndexOffset: 380,
            title: `Evacuation direction: ${route.title}`,
          });
          arrowMarker.on('click', (ev) => {
            L.DomEvent.stopPropagation(ev);
            callbacksRef.current.onSelectEntity({ kind: 'route', id: route.id });
          });
          arrowMarker.addTo(group);
        }

        // Start point marker
        const startPt = route.path[0];
        if (startPt) {
          const startIcon = L.divIcon({
            className: 'custom-leaflet-pin',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            html: `<div style="width:14px;height:14px;border-radius:9999px;background:#6D28D9;border:2.5px solid #FFFFFF;box-shadow:0 1px 4px rgba(15,23,42,0.35);"></div>`,
          });
          L.marker([startPt.lat, startPt.lng], {
            icon: startIcon,
            zIndexOffset: 375,
            title: `Route start: ${route.startLabel}`,
          }).addTo(group);
        }
      }
    }

    // 8. PPS Evacuation Centres (Green house icon for Open; muted grey/closed icon if Closed)
    if (layers.pps) {
      for (const pps of visibleData.visiblePps) {
        const isOpen = pps.acceptingArrivals && pps.status !== 'Closed' && pps.status !== 'Standby';
        const isSelected = selectedEntity?.kind === 'pps' && selectedEntity.id === pps.id;
        const bg = isSelected
          ? '#0F4C81'
          : isOpen
          ? '#15803D'
          : pps.status === 'Closed'
          ? '#475569'
          : '#64748B';
        const ppsIcon = L.divIcon({
          className: 'custom-leaflet-pin',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          html: `<div style="width:32px;height:32px;border-radius:8px;background:${bg};border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(15,23,42,0.28);display:flex;align-items:center;justify-content:center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9 20v-6h6v6"/></svg>
          </div>`,
        });
        const m = L.marker([pps.coordinates.lat, pps.coordinates.lng], {
          icon: ppsIcon,
          zIndexOffset: 320,
          alt: pps.name,
          title: pps.name,
        });
        m.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          callbacksRef.current.onSelectEntity({ kind: 'pps', id: pps.id });
        });
        m.addTo(group);
      }
    }

    // 9. Command Centre Incidents (Landslide & Severe Weather distinct markers + light shaded area)
    if (account === 'admin' && layers.incidents) {
      for (const inc of incidents) {
        if (inc.affectedBoundary && inc.affectedBoundary.length >= 3) {
          const shade = inc.incidentType === 'landslide' ? '#92400E' : '#475569';
          const bPoly = L.polygon(
            inc.affectedBoundary.map((p) => [p.lat, p.lng] as [number, number]),
            {
              color: shade,
              weight: 1.5,
              dashArray: '4 4',
              fillColor: shade,
              fillOpacity: 0.14,
            }
          );
          bPoly.on('click', (ev) => {
            L.DomEvent.stopPropagation(ev);
            callbacksRef.current.onSelectEntity({ kind: 'incident', id: inc.id });
          });
          bPoly.addTo(group);
        }

        if (inc.incidentType === 'landslide' || inc.incidentType === 'severe_weather') {
          const isLandslide = inc.incidentType === 'landslide';
          const bg = isLandslide ? '#92400E' : '#334155';
          const svg = isLandslide
            ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`
            : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>`;
          const incIcon = L.divIcon({
            className: 'custom-leaflet-pin',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            html: `<div style="width:30px;height:30px;border-radius:8px;background:${bg};border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(15,23,42,0.3);display:flex;align-items:center;justify-content:center;">${svg}</div>`,
          });
          const im = L.marker([inc.coordinates.lat, inc.coordinates.lng], {
            icon: incIcon,
            zIndexOffset: 360,
            title: inc.title,
          });
          im.on('click', (ev) => {
            L.DomEvent.stopPropagation(ev);
            callbacksRef.current.onSelectEntity({ kind: 'incident', id: inc.id });
          });
          im.addTo(group);
        }
      }
    }

    // 10. Supply Depots (Admin only)
    if (visibleData.canSeeSupplies && layers.supplies) {
      for (const depot of visibleData.visibleSupplyDepots) {
        const supplyIcon = L.divIcon({
          className: 'custom-leaflet-pin',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `<div style="width:28px;height:28px;border-radius:7px;background:#B45309;border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(15,23,42,0.28);display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
          </div>`,
        });
        const m = L.marker([depot.coordinates.lat, depot.coordinates.lng], {
          icon: supplyIcon,
          zIndexOffset: 250,
          alt: depot.name,
          title: depot.name,
        });
        m.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          callbacksRef.current.onSelectEntity({ kind: 'supply', id: depot.id });
        });
        m.addTo(group);
      }
    }

    // 11. Clusterable Rescue Boats & Rescue Pickup Pins
    const clusterPoints: ClusterablePoint<ClusterPayload>[] = [];

    if (visibleData.canSeeRescueRequests && layers.cases) {
      for (const grp of groupedPins) {
        clusterPoints.push({
          id: `pin-${grp.rep.id}`,
          coordinates: grp.rep.coordinates,
          urgent: grp.anyUrgent,
          item: { kind: 'caseGroup', rep: grp.rep, items: grp.items },
        });
      }
    }

    if (layers.boats && visibleData.visibleBoats.length > 0) {
      for (const boat of visibleData.visibleBoats) {
        clusterPoints.push({
          id: `boat-${boat.id}`,
          coordinates: boat.position,
          urgent: false,
          item: { kind: 'boat', boat },
        });
      }
    }

    const clusters = clusterMarkersByZoom(clusterPoints, currentZoom);
    // 44x44 icon gives generous invisible mobile tap target around the crisp transparent boat illustration
    const boatIcon = L.icon({
      iconUrl: rescueBoatImg,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      className: 'rescue-boat-marker-icon',
    });

    for (const cluster of clusters) {
      if (cluster.items.length > 1) {
        const bg = cluster.hasUrgent ? '#DC2626' : '#0F4C81';
        const badgeHtml = cluster.hasUrgent
          ? `<div style="min-width:36px;height:36px;padding:0 8px;border-radius:9999px;background:${bg};color:#FFFFFF;border:2.5px solid #FFFFFF;box-shadow:0 3px 8px rgba(15,23,42,0.35);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;gap:3px;"><span>!</span><span>${cluster.items.length}</span></div>`
          : `<div style="min-width:34px;height:34px;padding:0 8px;border-radius:9999px;background:${bg};color:#FFFFFF;border:2.5px solid #FFFFFF;box-shadow:0 3px 8px rgba(15,23,42,0.32);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">${cluster.items.length}</div>`;
        const clusterIcon = L.divIcon({
          className: 'custom-leaflet-pin',
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          html: badgeHtml,
        });
        const cm = L.marker([cluster.center.lat, cluster.center.lng], {
          icon: clusterIcon,
          zIndexOffset: 480,
          alt: `Cluster of ${cluster.items.length} markers`,
          title: `Cluster of ${cluster.items.length} markers`,
        });
        cm.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          const nextZoom = Math.max(map.getZoom() + 2, 14);
          map.flyTo([cluster.center.lat, cluster.center.lng], nextZoom, { duration: 0.45 });
        });
        cm.addTo(group);
        continue;
      }

      const payload = cluster.items[0].item;
      if (payload.kind === 'boat') {
        const boat = payload.boat;
        const m = L.marker([boat.position.lat, boat.position.lng], {
          icon: boatIcon,
          zIndexOffset: 500,
          alt: `${boat.name} marker`,
        });
        m.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          setAdminFeedback(null);
          setBoatEtaInput(boat.eta ?? '');
          callbacksRef.current.onSelectEntity({ kind: 'boat', id: boat.id });
        });
        m.addTo(group);
      } else {
        const { rep, items } = payload;
        const allPickedUp = items.every((i) => i.status === 'picked_up');
        const anyUnverified = items.some((i) => !i.locationVerified);
        const anyUrgent = items.some((i) => i.urgency === 'critical' && i.status !== 'picked_up');
        const isSelected =
          (selectedEntity?.kind === 'case' && items.some((i) => i.id === selectedEntity.id)) ||
          items.some((i) => i.id === selectedCaseId);

        const bg = allPickedUp
          ? '#059669'
          : anyUrgent
          ? '#DC2626'
          : isSelected
          ? '#0F4C81'
          : anyUnverified
          ? '#D97706'
          : '#334155';

        const innerSvg = anyUrgent
          ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`
          : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

        const canDrag = account === 'admin' || account === 'resident';
        const pinIcon = L.divIcon({
          className: 'custom-leaflet-pin',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          html: `<div style="width:34px;height:34px;border-radius:9999px;background:${bg};border:2.5px ${
            anyUnverified ? 'dashed' : 'solid'
          } #FFFFFF;box-shadow:0 2px 8px rgba(15,23,42,0.34);display:flex;align-items:center;justify-content:center;">
            ${innerSvg}
          </div>`,
        });

        const m = L.marker([rep.coordinates.lat, rep.coordinates.lng], {
          icon: pinIcon,
          draggable: canDrag && pinMoveMode,
          zIndexOffset: anyUrgent ? 450 : 400,
          alt: `Pickup point: ${rep.pickupLandmark}`,
          title: `Pickup point: ${rep.pickupLandmark}`,
        });
        m.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          callbacksRef.current.onSelectCase(rep.id);
          callbacksRef.current.onSelectEntity({ kind: 'case', id: rep.id });
        });
        m.on('dragend', () => {
          const pos = m.getLatLng();
          const movedPoint = {
            lat: Number(pos.lat.toFixed(5)),
            lng: Number(pos.lng.toFixed(5)),
          };
          if (callbacksRef.current.onMoveSelectedCasePin) {
            callbacksRef.current.onMoveSelectedCasePin(rep.id, movedPoint);
          }
        });
        m.addTo(group);
      }
    }

    // 12. User-tapped location pin
    if (tappedLocation) {
      const tapIcon = L.divIcon({
        className: 'custom-leaflet-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `<div style="width:28px;height:28px;border-radius:9999px;background:#0F172A;border:2px solid #38BDF8;box-shadow:0 2px 6px rgba(15,23,42,0.32);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>
        </div>`,
      });
      L.marker([tappedLocation.lat, tappedLocation.lng], {
        icon: tapIcon,
        zIndexOffset: 600,
        alt: 'Tapped map pin',
      }).addTo(group);
    }
  }, [
    account,
    layers,
    activeVisibleHazardZones,
    refugeAreas,
    evacRoutes,
    incidents,
    visibleData,
    groupedPins,
    tappedLocation,
    pinMoveMode,
    currentZoom,
    selectedEntity,
    selectedCaseId,
    highlightedRouteId,
  ]);

  const toggleLayer = (key: LayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Resolve selected entity
  const selectedBoat =
    selectedEntity?.kind === 'boat'
      ? visibleData.visibleBoats.find((b) => b.id === selectedEntity.id) ?? null
      : null;

  const selectedCaseGroup =
    selectedEntity?.kind === 'case'
      ? groupedPins.find((g) => g.items.some((i) => i.id === selectedEntity.id)) ?? null
      : null;

  const selectedPps =
    selectedEntity?.kind === 'pps'
      ? visibleData.visiblePps.find((p) => p.id === selectedEntity.id) ?? null
      : null;

  const selectedOutage =
    selectedEntity?.kind === 'outage'
      ? visibleData.visibleOutages.find((o) => o.id === selectedEntity.id) ?? null
      : null;

  const selectedRoad =
    selectedEntity?.kind === 'road'
      ? visibleData.visibleRoads.find((r) => r.id === selectedEntity.id) ?? null
      : null;

  const selectedSupply =
    selectedEntity?.kind === 'supply' && visibleData.canSeeSupplies
      ? visibleData.visibleSupplyDepots.find((s) => s.id === selectedEntity.id) ?? null
      : null;

  const selectedTerrain: TerrainBasin | null =
    selectedEntity?.kind === 'terrain' && account === 'admin'
      ? TERRAIN_BASINS.find((tb) => tb.id === selectedEntity.id) ?? null
      : null;

  const selectedZones: HazardZone[] =
    selectedEntity?.kind === 'zone'
      ? hazardZones.filter((z) => selectedEntity.ids.includes(z.id))
      : [];

  const selectedRoute =
    selectedEntity?.kind === 'route'
      ? evacRoutes.find((r) => r.id === selectedEntity.id) ?? null
      : null;

  const selectedIncident =
    selectedEntity?.kind === 'incident' && account === 'admin'
      ? incidents.find((i) => i.id === selectedEntity.id) ?? null
      : null;

  const selectedRefuge =
    selectedEntity?.kind === 'refuge'
      ? refugeAreas.find((r) => r.id === selectedEntity.id) ?? null
      : null;

  const selectedRiver = selectedEntity?.kind === 'river';

  const hasOpenSheet = Boolean(
    selectedBoat ||
      selectedCaseGroup ||
      selectedPps ||
      selectedOutage ||
      selectedRoad ||
      selectedSupply ||
      selectedTerrain ||
      selectedZones.length > 0 ||
      selectedRoute ||
      selectedIncident ||
      selectedRefuge ||
      selectedRiver
  );

  // Urgent active instruction stays visible even when legend is closed
  const urgentActiveInstruction = areaInstructions.find((i) => i.active && i.urgent) ?? null;

  const layerOptions: Array<{ key: LayerKey; label: string }> =
    account === 'guest'
      ? [
          { key: 'pps', label: 'Open shelters' },
          { key: 'refuge', label: 'Verified refuge areas' },
          { key: 'routes', label: 'Evacuation routes' },
          { key: 'flood', label: 'Flood severity' },
          { key: 'earthquake', label: 'Earthquake layer' },
          { key: 'fire', label: 'Fire layer' },
          { key: 'outages', label: t.layerOutages },
          { key: 'waterLevels', label: t.layerWaterLevels },
        ]
      : account === 'resident'
      ? [
          { key: 'boats', label: t.layerBoats },
          { key: 'cases', label: 'My rescue pin' },
          { key: 'pps', label: 'Open shelters' },
          { key: 'refuge', label: 'Verified refuge areas' },
          { key: 'routes', label: 'Evacuation routes' },
          { key: 'flood', label: 'Flood severity' },
          { key: 'earthquake', label: 'Earthquake layer' },
          { key: 'fire', label: 'Fire layer' },
          { key: 'outages', label: t.layerOutages },
          { key: 'waterLevels', label: t.layerWaterLevels },
        ]
      : [
          { key: 'incidents', label: 'Command incidents' },
          { key: 'cases', label: t.layerRequests },
          { key: 'boats', label: t.layerBoats },
          { key: 'pps', label: t.layerShelters },
          { key: 'refuge', label: 'Verified refuge areas' },
          { key: 'routes', label: 'Evacuation routes' },
          { key: 'flood', label: 'Flood severity' },
          { key: 'earthquake', label: 'Earthquake layer' },
          { key: 'fire', label: 'Fire layer' },
          { key: 'supplies', label: t.layerSupplies },
          { key: 'outages', label: t.layerOutages },
          { key: 'waterLevels', label: t.layerWaterLevels },
          { key: 'terrain', label: t.layerTerrain },
        ];

  const multipleHazardsVisible =
    [layers.flood, layers.earthquake, layers.fire].filter(Boolean).length > 1;

  return (
    <div
      className="relative w-full h-full bg-slate-100 select-none neutral-basemap"
      data-testid="live-map-root"
    >
      {/* Leaflet Interactive Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0"
        aria-label={t.mapHeading}
      />

      {/* Offline / Pin-move subtle banner */}
      {(!isOnline || pinMoveMode || (account === 'admin' && boatMoveModeId)) && (
        <div className="pointer-events-none absolute top-16 left-3 right-3 z-[450] flex justify-center">
          <div className="pointer-events-auto bg-white/95 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 shadow-sm text-xs flex items-center gap-2">
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>{t.offlineMapWarning}</span>
              </>
            ) : boatMoveModeId ? (
              <>
                <Crosshair className="w-3.5 h-3.5 text-[#0F4C81] shrink-0" />
                <span>{t.mapBoatMoveHint}</span>
                <button
                  type="button"
                  onClick={() => setBoatMoveModeId(null)}
                  className="ml-1 font-semibold underline cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5 text-[#0F4C81] shrink-0" />
                <span>{t.pinMoveActiveBtn}</span>
                <button
                  type="button"
                  onClick={() => onTogglePinMoveMode(false)}
                  className="ml-1 font-semibold underline cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Compact Collapsible Legend + Always-Visible Urgent Instruction Strip (Bottom-Left) */}
      <div className="absolute left-3 bottom-3 z-[440] flex flex-col items-start gap-1.5 max-w-[calc(100vw-110px)] sm:max-w-sm pointer-events-none">
        {urgentActiveInstruction && !hasOpenSheet && (
          <button
            type="button"
            onClick={() =>
              onSelectEntity({ kind: 'zone', ids: [urgentActiveInstruction.zoneId] })
            }
            className="pointer-events-auto bg-white/95 hover:bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-sm text-left text-[11px] text-slate-900 flex items-center gap-1.5 cursor-pointer max-w-full"
          >
            <AlertCircle className="w-3.5 h-3.5 text-[#08306B] shrink-0" />
            <span className="truncate font-medium">
              {urgentActiveInstruction.headline}
            </span>
          </button>
        )}

        <div className="pointer-events-auto bg-white/95 border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <button
            type="button"
            aria-expanded={legendOpen}
            onClick={() => setLegendOpen((v) => !v)}
            data-testid="legend-toggle-btn"
            className="min-h-[34px] px-2.5 py-1 text-[11px] font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Risk levels &amp; Legend</span>
            {legendOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {legendOpen && (
            <div
              data-testid="map-legend-body"
              className="px-3 pb-2.5 pt-1 border-t border-slate-100 space-y-2 text-[11px] text-slate-700"
            >
              {layers.flood && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-1">
                    {multipleHazardsVisible && <Waves className="w-3 h-3 text-[#2171B5]" />}
                    <span>Flood severity</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(['low', 'moderate', 'high', 'critical'] as const).map((lvl) => (
                      <span key={lvl} className="inline-flex items-center gap-1">
                        <span
                          className="w-3 h-3 rounded-xs border border-slate-300 inline-block"
                          style={{ backgroundColor: HAZARD_PALETTES.flood.levels[lvl] }}
                        />
                        <span className="capitalize">{lvl}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {layers.earthquake && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-[#A47142]" />
                    <span>Earthquake severity</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(['low', 'moderate', 'high', 'critical'] as const).map((lvl) => (
                      <span key={lvl} className="inline-flex items-center gap-1">
                        <span
                          className="w-3 h-3 rounded-xs border border-slate-300 inline-block"
                          style={{ backgroundColor: HAZARD_PALETTES.earthquake.levels[lvl] }}
                        />
                        <span className="capitalize">{lvl}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {layers.fire && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-[#F4511E]" />
                    <span>Fire severity</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(['low', 'moderate', 'high', 'critical'] as const).map((lvl) => (
                      <span key={lvl} className="inline-flex items-center gap-1">
                        <span
                          className="w-3 h-3 rounded-xs border border-slate-300 inline-block"
                          style={{ backgroundColor: HAZARD_PALETTES.fire.levels[lvl] }}
                        />
                        <span className="capitalize">{lvl}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#15803D] inline-block" />
                  <span>Open shelter (house)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs border border-dashed border-[#15803D] bg-emerald-500/20 inline-block" />
                  <span>Verified refuge area</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-1 rounded bg-[#6D28D9] inline-block" />
                  <span>Verified evacuation route</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-xs border border-slate-400 inline-block"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(100,116,139,0.5) 2px, rgba(100,116,139,0.5) 4px)',
                    }}
                  />
                  <span>Unknown / Outdated</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slim Status Bar for Resident with Active Case */}
      {account === 'resident' && residentBottomBarText && !hasOpenSheet && (
        <div className="pointer-events-none absolute top-2.5 left-3 right-3 sm:top-auto sm:bottom-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[455] flex justify-center">
          <button
            type="button"
            onClick={onOpenResidentDetails}
            data-testid="resident-slim-bar"
            className="pointer-events-auto min-h-[38px] max-w-full px-3.5 py-1.5 bg-white/95 hover:bg-white border border-slate-300 rounded-full shadow-md text-xs font-semibold text-slate-900 flex items-center gap-2 cursor-pointer"
          >
            <span className="text-[#0F4C81] truncate">{residentBottomBarText}</span>
            <span className="text-slate-400 shrink-0">·</span>
            <span className="underline shrink-0">Details</span>
          </button>
        </div>
      )}

      {/* Edge Controls: Layers & Locate Me */}
      <div className="absolute right-3 bottom-24 z-[450] flex flex-col items-end gap-2">
        {layersMenuOpen && (
          <div
            role="dialog"
            aria-label={t.layersLabel}
            data-testid="layers-popover"
            className="w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-2 mb-1 max-h-[55vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-xs font-bold text-slate-900">{t.layersLabel}</span>
              <button
                type="button"
                onClick={() => setLayersMenuOpen(false)}
                aria-label={t.closeLabel}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {layerOptions.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center justify-between gap-2 px-1.5 py-1.5 rounded hover:bg-slate-50 text-xs text-slate-800 cursor-pointer"
                >
                  <span>{opt.label}</span>
                  <input
                    type="checkbox"
                    checked={layers[opt.key]}
                    onChange={() => toggleLayer(opt.key)}
                    className="accent-[#0F4C81] w-4 h-4 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setLayersMenuOpen((v) => !v)}
          aria-expanded={layersMenuOpen}
          aria-label={t.layersLabel}
          data-testid="layers-btn"
          className="min-h-[44px] min-w-[44px] px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl shadow-md inline-flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <Layers className="w-4 h-4 text-[#0F4C81]" />
          <span className="hidden sm:inline">{t.layersLabel}</span>
        </button>

        <button
          type="button"
          onClick={onLocateMe}
          aria-label={t.locateMeLabel}
          data-testid="locate-me-btn"
          className="min-h-[44px] min-w-[44px] px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl shadow-md inline-flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <LocateFixed className="w-4 h-4 text-[#0F4C81]" />
          <span className="hidden sm:inline">{t.locateMeLabel}</span>
        </button>
      </div>

      {/* Tap-to-Open Detail Sheet (Bottom Sheet on Mobile, Side Panel on Desktop) */}
      {hasOpenSheet && (
        <aside
          aria-label="Selected map details"
          data-testid="map-detail-sheet"
          className="absolute z-[500] bottom-0 left-0 right-0 sm:left-auto sm:top-16 sm:right-3 sm:bottom-auto sm:w-96 max-h-[62vh] sm:max-h-[calc(100%-5rem)] bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl shadow-xl overflow-y-auto"
        >
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-slate-300 rounded-full" />
          </div>

          {/* Selected / Overlapping Hazard Zone(s) Detail */}
          {selectedZones.length > 0 && (
            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-medium text-slate-500">
                    {selectedZones.length > 1
                      ? `${selectedZones.length} overlapping hazard assessments (Demo)`
                      : 'Local hazard assessment (Demo)'}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedZones[0].areaName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEntity(null)}
                  aria-label={t.closeLabel}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 divide-y divide-slate-100">
                {selectedZones.map((zone) => {
                  const instr = areaInstructions.find(
                    (i) => i.active && i.zoneId === zone.id
                  );
                  const linkedRoute = evacRoutes.find(
                    (r) => r.zoneId === zone.id && r.status === 'approved'
                  );
                  const withdrawnRoute = evacRoutes.find(
                    (r) => r.zoneId === zone.id && r.status === 'withdrawn'
                  );
                  const residentWaiting = account === 'resident' && visibleData.visibleCases.length > 0;

                  return (
                    <div key={zone.id} className="pt-2.5 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
                          <span
                            className="w-3 h-3 rounded-xs border border-slate-300 inline-block"
                            style={{ backgroundColor: getHazardColor(zone.hazardType, zone.severity) }}
                          />
                          <span>
                            {HAZARD_PALETTES[zone.hazardType].label} ·{' '}
                            {getHazardSeverityLabel(zone.severity)}
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          Verified {zone.lastVerifiedAt}
                        </span>
                      </div>

                      <p className="text-slate-700 leading-relaxed">{zone.reason}</p>

                      {instr ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
                          <div className="font-semibold text-slate-900">
                            Approved Instruction ({instr.updatedAt})
                          </div>
                          <p className="text-slate-700">{instr.whatToDo}</p>
                          <div className="text-slate-600">
                            <span className="font-semibold">Go / wait:</span> {instr.whereToGoOrWait}
                          </div>
                          {residentWaiting ? (
                            <div className="text-[#0F4C81] font-medium">
                              {instr.waitingForRescueNote}
                            </div>
                          ) : (
                            <div className="text-slate-600">{instr.independentTravelNote}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-500">
                          No separate evacuation instruction issued for this area.
                        </div>
                      )}

                      {linkedRoute ? (
                        <button
                          type="button"
                          onClick={() => showRouteOnMap(linkedRoute.id)}
                          data-testid="show-evac-route-btn"
                          className="w-full min-h-[40px] px-3 py-2 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-purple-800 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Show evacuation route</span>
                        </button>
                      ) : withdrawnRoute ? (
                        <div className="text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 font-medium">
                          Route withdrawn — updated directions pending.
                        </div>
                      ) : (
                        <div className="text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
                          No verified route available.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verified Evacuation Route Detail */}
          {selectedRoute && (
            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D28D9]">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Verified evacuation route</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedRoute.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEntity(null)}
                  aria-label={t.closeLabel}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-slate-700 space-y-1">
                <div>
                  <span className="font-semibold">Destination PPS:</span>{' '}
                  {ppsLabelForRoute(visibleData.visiblePps, selectedRoute.targetPpsId)}
                </div>
                <div>
                  <span className="font-semibold">Route type:</span> {selectedRoute.routeType}
                </div>
                <div>
                  <span className="font-semibold">Accessibility:</span>{' '}
                  {selectedRoute.accessibilityInfo}
                </div>
                <div>
                  <span className="font-semibold">Last verified:</span>{' '}
                  {selectedRoute.lastVerifiedAt} ({selectedRoute.verifiedBy})
                </div>
              </div>
              {account === 'resident' && visibleData.visibleCases.length > 0 && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 text-[#0F4C81] font-medium">
                  If waiting for rescue: Wait at the confirmed school entrance ({visibleData.visibleCases[0].pickupLandmark}).
                </div>
              )}
            </div>
          )}

          {/* Verified Refuge Area Detail */}
          {selectedRefuge && (
            <div className="p-4 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-[#15803D]">
                    Verified refuge compound (Demo)
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedRefuge.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEntity(null)}
                  aria-label={t.closeLabel}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-600">
                Verified by {selectedRefuge.verifiedBy} at {selectedRefuge.verifiedAt}. Surrounding streets remain shaded by flood severity.
              </p>
            </div>
          )}

          {/* Command Incident Detail (Admin) */}
          {selectedIncident && account === 'admin' && (
            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-[#0F4C81] capitalize">
                    {selectedIncident.incidentType.replace('_', ' ')} ·{' '}
                    {getHazardSeverityLabel(selectedIncident.severity)}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedIncident.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEntity(null)}
                  aria-label={t.closeLabel}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-700">{selectedIncident.reportedConditions}</p>
              <div className="text-slate-600 space-y-0.5">
                <div>
                  <span className="font-semibold">Source:</span> {selectedIncident.source}
                </div>
                <div>
                  <span className="font-semibold">Last update:</span> {selectedIncident.lastUpdate}
                </div>
                <div>
                  <span className="font-semibold">Affected area:</span> {selectedIncident.areaName}
                </div>
                <div>
                  <span className="font-semibold">Responsible officer:</span>{' '}
                  {selectedIncident.responsibleOfficer}
                </div>
              </div>
              {onOpenCommandCentreIncident && (
                <button
                  type="button"
                  onClick={() => onOpenCommandCentreIncident(selectedIncident.id)}
                  className="w-full min-h-[40px] px-3 py-2 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-sky-900 rounded-lg cursor-pointer"
                >
                  Open in Command Centre
                </button>
              )}
            </div>
          )}

          {/* Boat Detail Card */}
          {selectedBoat && (
            <BoatDetailCard
              account={account}
              lang={lang}
              isOnline={isOnline}
              isStatusQueued={queuedBoatIds.has(selectedBoat.id)}
              boat={selectedBoat}
              allCasesForAdmin={allCasesForAdmin}
              boatAssignCaseId={boatAssignCaseId}
              setBoatAssignCaseId={setBoatAssignCaseId}
              boatEtaInput={boatEtaInput}
              setBoatEtaInput={setBoatEtaInput}
              adminFeedback={adminFeedback}
              setAdminFeedback={setAdminFeedback}
              onClose={() => onSelectEntity(null)}
              onAdminAssignBoat={onAdminAssignBoat}
              onAdminAdvanceBoatStatus={onAdminAdvanceBoatStatus}
              onStartMoveBoat={(id) => setBoatMoveModeId(id)}
              onOpenDispatchTab={onOpenDispatchTab}
            />
          )}

          {/* Case / Pickup Point Detail Card */}
          {selectedCaseGroup && (
            <CaseDetailCard
              account={account}
              lang={lang}
              isOnline={isOnline}
              group={selectedCaseGroup}
              pinMoveMode={pinMoveMode}
              onTogglePinMoveMode={onTogglePinMoveMode}
              onClose={() => onSelectEntity(null)}
              onAdminConfirmPickedUp={onAdminConfirmPickedUp}
              getPickupEligibility={getPickupEligibility}
              onAdminConfirmPriority={onAdminConfirmPriority}
              onOpenDispatchTab={onOpenDispatchTab}
            />
          )}

          {/* PPS Shelter Detail Card */}
          {selectedPps && (
            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Building2
                      className={`w-3.5 h-3.5 ${
                        selectedPps.acceptingArrivals && selectedPps.status !== 'Closed'
                          ? 'text-[#15803D]'
                          : 'text-slate-500'
                      }`}
                    />
                    <span>
                      {selectedPps.acceptingArrivals && selectedPps.status !== 'Closed'
                        ? 'Open · Accepting arrivals'
                        : `${selectedPps.status} · Not accepting arrivals`}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{selectedPps.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEntity(null)}
                  aria-label={t.closeLabel}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-slate-700 space-y-1">
                <div>
                  {selectedPps.areaName} ({selectedPps.postcode}) · {selectedPps.occupancy}/
                  {selectedPps.capacity} pax
                </div>
                <div>
                  <span className="font-semibold">{t.accessibilityLabel}:</span>{' '}
                  {selectedPps.accessibilityFeatures.join(', ')}
                </div>
                <div>
                  <span className="font-semibold">Last verified:</span> {selectedPps.updatedAt} (
                  {selectedPps.updatedBy})
                </div>
              </div>

              {(() => {
                const approvedToPps = evacRoutes.find(
                  (r) => r.targetPpsId === selectedPps.id && r.status === 'approved'
                );
                const withdrawnToPps = evacRoutes.find(
                  (r) => r.targetPpsId === selectedPps.id && r.status === 'withdrawn'
                );
                if (
                  approvedToPps &&
                  selectedPps.acceptingArrivals &&
                  selectedPps.status !== 'Closed'
                ) {
                  return (
                    <button
                      type="button"
                      onClick={() => showRouteOnMap(approvedToPps.id)}
                      data-testid="pps-view-directions-btn"
                      className="w-full min-h-[40px] px-3 py-2 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-purple-800 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>View directions</span>
                    </button>
                  );
                }
                if (withdrawnToPps || !selectedPps.acceptingArrivals || selectedPps.status === 'Closed') {
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-amber-900 font-medium">
                      Access route under review (directions withdrawn).
                    </div>
                  );
                }
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-600">
                    Access route under review.
                  </div>
                );
              })()}
            </div>
          )}

          {/* Power Outage Detail Card */}
          {selectedOutage && (
            <div className="p-4 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                    <ZapOff className="w-3.5 h-3.5" />
                    <span>{selectedOutage.status}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedOutage.areaName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEntity(null)}
                  aria-label={t.closeLabel}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-slate-700 space-y-1">
                <div>
                  <span className="font-semibold">{t.causeLabel}:</span>{' '}
                  {selectedOutage.confirmedCause}
                </div>
                <div>
                  <span className="font-semibold">{t.estRestoreLabel}:</span>{' '}
                  {selectedOutage.estimatedRestoration}
                </div>
                <div className="text-slate-500">
                  {selectedOutage.updatedAt} · {selectedOutage.source}
                </div>
              </div>
            </div>
          )}

          {/* Road Closure Detail Card */}
          {selectedRoad && (
            <div className="p-4 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{selectedRoad.closed ? 'Road closed' : 'Road open / monitored'}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedRoad.roadName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEntity(null)}
                  aria-label={t.closeLabel}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-700">{selectedRoad.reason}</p>
              <div className="text-slate-500">
                {selectedRoad.areaName} · {selectedRoad.reportedAt} · {selectedRoad.source}
              </div>
            </div>
          )}

          {/* Supply Depot Detail Card (Admin) */}
          {selectedSupply && (
            <div className="p-4 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                    <Package className="w-3.5 h-3.5" />
                    <span>{t.legendSupply}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedSupply.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEntity(null)}
                  aria-label={t.closeLabel}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-slate-700 tabular-nums">
                {selectedSupply.lifeJackets} life jackets · {selectedSupply.generators} generators ·{' '}
                {selectedSupply.drinkingWaterCases} water cases
              </div>
              <div className="text-slate-500">{selectedSupply.updatedAt}</div>
            </div>
          )}

          {/* Terrain Basin Detail Card (Admin) */}
          {selectedTerrain && (
            <div className="p-4 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <Mountain className="w-3.5 h-3.5" />
                    <span>{t.layerTerrain}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedTerrain.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEntity(null)}
                  aria-label={t.closeLabel}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-700">{selectedTerrain.elevationNote}</p>
            </div>
          )}

          {/* River Station Gauge Detail Card */}
          {selectedRiver && (
            <div className="p-4 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-sky-800 font-semibold">
                    <Waves className="w-3.5 h-3.5" />
                    <span>{t.layerWaterLevels} (Official Telemetry Demo)</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {DEMO_AREA_INFO.riverStationName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEntity(null)}
                  aria-label={t.closeLabel}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-slate-800 font-medium tabular-nums">
                {DEMO_AREA_INFO.riverLevelMeters} m ({DEMO_AREA_INFO.riverTrend}) · Danger
                threshold: {DEMO_AREA_INFO.riverDangerMeters} m
              </div>
              <p className="text-slate-600">
                Prompts coordinator review of nearby areas. Does not automatically trigger an evacuation order.
              </p>
            </div>
          )}
        </aside>
      )}
    </div>
  );
};

function ppsLabelForRoute(ppsCenters: PPSCenter[], targetPpsId: string): string {
  const match = ppsCenters.find((p) => p.id === targetPpsId);
  if (!match) return targetPpsId;
  return `${match.name} (${match.status})`;
}

interface BoatDetailCardProps {
  account: DemoAccountId;
  lang: LanguageCode;
  isOnline: boolean;
  isStatusQueued: boolean;
  boat: VisibleBoatView;
  allCasesForAdmin: RescueCase[];
  boatAssignCaseId: string;
  setBoatAssignCaseId: (v: string) => void;
  boatEtaInput: string;
  setBoatEtaInput: (v: string) => void;
  adminFeedback: AdminFeedback | null;
  setAdminFeedback: (v: AdminFeedback | null) => void;
  onClose: () => void;
  onAdminAssignBoat?: (caseId: string, boatId: string) => { ok: boolean; error?: string };
  onAdminAdvanceBoatStatus?: (boatId: string, nextStatus: BoatStatus, eta?: string) => ActionOutcome;
  onStartMoveBoat: (boatId: string) => void;
  onOpenDispatchTab?: () => void;
}

const BoatDetailCard: React.FC<BoatDetailCardProps> = ({
  account,
  lang,
  isOnline,
  isStatusQueued,
  boat,
  allCasesForAdmin,
  boatAssignCaseId,
  setBoatAssignCaseId,
  boatEtaInput,
  setBoatEtaInput,
  adminFeedback,
  setAdminFeedback,
  onClose,
  onAdminAssignBoat,
  onAdminAdvanceBoatStatus,
  onStartMoveBoat,
  onOpenDispatchTab,
}) => {
  const t = TRANSLATIONS[lang];
  const candidateCases = allCasesForAdmin.filter((c) => c.status !== 'picked_up');
  const chosenCaseId = boatAssignCaseId || candidateCases[0]?.id || '';

  return (
    <div className="p-4 space-y-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <img src={rescueBoatImg} alt={boat.name} className="w-9 h-9 object-contain" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">{boat.name}</h3>
            <div className="text-slate-600">{formatBoatStatus(lang, boat.status)}</div>
            {isStatusQueued && (
              <span className="mt-0.5 inline-flex items-center text-[11px] font-semibold text-[#0F4C81] bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                {t.waitingToSendLabel}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closeLabel}
          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-slate-700 space-y-1">
        <div>
          <span className="font-semibold">{t.lastUpdateLabel}:</span>{' '}
          <span className="tabular-nums">{boat.lastUpdatedAt}</span>
        </div>
        {boat.eta && (
          <div>
            <span className="font-semibold">{t.crewEtaLabel}:</span>{' '}
            <span className="tabular-nums">{boat.eta}</span>
          </div>
        )}
        {boat.assignedPickupPoint && (
          <div>
            <span className="font-semibold">{t.assignedPickupLabel}:</span>{' '}
            {boat.assignedPickupPoint}
          </div>
        )}
        {account === 'admin' && boat.crewLead && (
          <div>
            <span className="font-semibold">{t.crewLeadLabel}:</span> {boat.crewLead}
          </div>
        )}
        {account === 'admin' && boat.supplies && (
          <div className="tabular-nums">
            <span className="font-semibold">{t.suppliesLabel}:</span> {boat.supplies.lifeJackets}{' '}
            jackets · {boat.supplies.generators} gen · {boat.supplies.drinkingWaterCases} water
            {boat.supplies.wheelchairRamp ? ' · Wheelchair ramp' : ''}
          </div>
        )}
      </div>

      {account === 'admin' && (
        <div className="pt-2.5 border-t border-slate-200 space-y-2.5">
          <div className="font-semibold text-slate-800">{t.adminBoatControls}</div>

          {onAdminAssignBoat && candidateCases.length > 0 && (
            <div className="flex gap-1.5">
              <select
                value={chosenCaseId}
                onChange={(e) => setBoatAssignCaseId(e.target.value)}
                aria-label="Select rescue case"
                className="flex-1 min-w-0 h-9 px-2 text-xs bg-white border border-slate-300 rounded-lg"
              >
                {candidateCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.affectedPersonName} — {c.pickupLandmark}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!isOnline}
                title={!isOnline ? t.needsConnectionMsg : undefined}
                onClick={() => {
                  if (!chosenCaseId || !isOnline) return;
                  const res = onAdminAssignBoat(chosenCaseId, boat.id);
                  setAdminFeedback(
                    res.ok
                      ? { ok: true, msg: `${boat.name} assigned.` }
                      : { ok: false, msg: res.error ?? 'Could not assign boat.' }
                  );
                }}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
                  isOnline
                    ? 'text-white bg-[#0F4C81] hover:bg-sky-900 cursor-pointer'
                    : 'text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed'
                }`}
              >
                {t.assignBtn}
              </button>
            </div>
          )}

          {onAdminAdvanceBoatStatus && (
            <div className="space-y-2">
              <input
                type="text"
                value={boatEtaInput}
                onChange={(e) => setBoatEtaInput(e.target.value)}
                placeholder={t.etaPlaceholder}
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ['preparing', formatBoatStatus(lang, 'preparing')],
                    ['on_the_way', formatBoatStatus(lang, 'on_the_way')],
                    ['arrived', formatBoatStatus(lang, 'arrived')],
                    ['available', formatBoatStatus(lang, 'available')],
                  ] as [BoatStatus, string][]
                ).map(([statusKey, label]) => (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => {
                      const outcome = onAdminAdvanceBoatStatus(boat.id, statusKey, boatEtaInput);
                      setAdminFeedback(
                        !outcome.ok
                          ? { ok: false, msg: outcome.error ?? 'Could not update boat status.' }
                          : outcome.queued
                            ? {
                                ok: true,
                                queued: true,
                                msg: `${boat.name}: ${label} · ${t.waitingToSendLabel}`,
                              }
                            : { ok: true, msg: `${boat.name} — ${label}.` }
                      );
                    }}
                    className={`min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                      boat.status === statusKey
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!isOnline}
            title={!isOnline ? t.needsConnectionMsg : undefined}
            onClick={() => {
              if (!isOnline) return;
              onStartMoveBoat(boat.id);
            }}
            className={`w-full min-h-[36px] px-2.5 py-1.5 text-xs font-medium border rounded-lg inline-flex items-center justify-center gap-1.5 ${
              isOnline
                ? 'text-slate-800 bg-white border-slate-300 hover:bg-slate-100 cursor-pointer'
                : 'text-slate-500 bg-slate-100 border-slate-200 cursor-not-allowed'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{t.updateBoatLocBtn}</span>
          </button>

          {!isOnline && (
            <div className="text-amber-800">
              {t.assignBtn} · {t.updateBoatLocBtn}: {t.needsConnectionMsg}
            </div>
          )}

          {adminFeedback && (
            <div
              className={`px-2.5 py-1.5 rounded-lg border ${
                !adminFeedback.ok
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : adminFeedback.queued
                    ? 'bg-sky-50 border-sky-200 text-[#0F4C81]'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {adminFeedback.msg}
            </div>
          )}

          {onOpenDispatchTab && (
            <button
              type="button"
              onClick={onOpenDispatchTab}
              className="w-full min-h-[36px] text-xs font-semibold text-[#0F4C81] hover:underline cursor-pointer"
            >
              {t.openAdminPanelBtn}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface CaseDetailCardProps {
  account: DemoAccountId;
  lang: LanguageCode;
  isOnline: boolean;
  group: {
    landmark: string;
    items: RedactedCaseView[];
    rep: RedactedCaseView;
  };
  pinMoveMode: boolean;
  onTogglePinMoveMode: (active: boolean) => void;
  onClose: () => void;
  onAdminConfirmPickedUp?: (caseId: string, boatId: string) => ActionOutcome;
  getPickupEligibility?: (caseId: string) => PickupEligibility;
  onAdminConfirmPriority?: (caseId: string, urgency: UrgencyLevel, reason: string) => void;
  onOpenDispatchTab?: () => void;
}

type PickupFeedback = { tone: 'ok' | 'queued' | 'error'; msg: string };

const CaseDetailCard: React.FC<CaseDetailCardProps> = ({
  account,
  lang,
  isOnline,
  group,
  pinMoveMode,
  onTogglePinMoveMode,
  onClose,
  onAdminConfirmPickedUp,
  getPickupEligibility,
  onAdminConfirmPriority,
  onOpenDispatchTab,
}) => {
  const t = TRANSLATIONS[lang];
  const rep = group.rep;
  const [urgencyDraft, setUrgencyDraft] = useState<UrgencyLevel>(rep.urgency);
  const [reasonDraft, setReasonDraft] = useState<string>(rep.priorityReason ?? '');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  // Per-case pickup chooser state, keyed by case id (a pickup point can hold several cases).
  const [pickupBoatChoice, setPickupBoatChoice] = useState<Record<string, string>>({});
  const [pickupFeedback, setPickupFeedback] = useState<Record<string, PickupFeedback>>({});

  useEffect(() => {
    setUrgencyDraft(rep.urgency);
    setReasonDraft(rep.priorityReason ?? '');
    setSavedNotice(null);
  }, [rep.id, rep.urgency, rep.priorityReason]);

  useEffect(() => {
    setPickupBoatChoice({});
    setPickupFeedback({});
  }, [group.landmark]);

  return (
    <div className="p-4 space-y-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500">
              {rep.areaName} · {rep.postcode}
            </span>
            {rep.urgency === 'critical' && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                <AlertCircle className="w-3 h-3" /> {t.urgentLabel}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5 inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#0F4C81] shrink-0" />
            <span>{group.landmark}</span>
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closeLabel}
          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 divide-y divide-slate-100">
        {group.items.map((item) => {
          // Pickup chooser (2.6, 2.7): only boats assigned to this case and marked arrived.
          const pickup =
            account === 'admin' &&
            onAdminConfirmPickedUp &&
            getPickupEligibility &&
            item.status !== 'picked_up'
              ? getPickupEligibility(item.id)
              : null;
          const arrivedBoats = pickup?.arrivedBoats ?? [];
          const chosenBoatId = pickupBoatChoice[item.id];
          const selectedPickupBoat =
            arrivedBoats.find((b) => b.id === chosenBoatId) ?? arrivedBoats[0] ?? null;
          const feedback = account === 'admin' ? pickupFeedback[item.id] : undefined;

          return (
            <div key={item.id} className="pt-2.5 first:pt-0 space-y-1.5">
              <div className="text-slate-700 space-y-1">
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  {formatCaseStatus(lang, item.status)}
                </div>
                <div>
                  <span className="font-semibold">Person:</span> {item.displayName}
                </div>

                {account === 'resident' && item.status !== 'picked_up' && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1.5 text-[#0F4C81] font-medium">
                    Wait at the confirmed school entrance ({group.landmark}) for boat pickup.
                  </div>
                )}

                {account === 'admin' && (
                  <>
                    <div>
                      <span className="font-semibold">{t.reportSourceLabel}:</span>{' '}
                      {item.reportSource}
                    </div>
                    <div>
                      <span className="font-semibold">{t.lastContactLabel}:</span>{' '}
                      {item.lastContactTime}
                    </div>
                    <div>
                      <span className="font-semibold">{t.currentDangerLabel}:</span>{' '}
                      {item.currentDanger}
                    </div>
                    <div>
                      <span className="font-semibold">{t.abilityToEvacuateLabel}:</span>{' '}
                      {item.abilityToEvacuate}
                    </div>
                    {item.assignedCrewNames && item.assignedCrewNames.length > 0 && (
                      <div>
                        <span className="font-semibold">{t.assignedCrewLabel}:</span>{' '}
                        {item.assignedCrewNames.join(' · ')}
                      </div>
                    )}
                    {item.caseOwner && !item.locationVerified && (
                      <div className="text-amber-800">
                        <span className="font-semibold">Follow-up owner:</span> {item.caseOwner}
                        {item.followUpAction ? ` — ${item.followUpAction}` : ''}
                      </div>
                    )}
                  </>
                )}

                {!item.isExactLocationHidden && (
                  <div>
                    <span className="font-semibold">Last seen:</span> {item.displayAddress}
                  </div>
                )}
                {!item.isCallbackHidden && (
                  <div>
                    <span className="font-semibold">Phone:</span>{' '}
                    <span className="tabular-nums">{item.displayCallbackPhone}</span>
                  </div>
                )}
                {item.okuNeeds.length > 0 && (
                  <div>
                    <span className="font-semibold">Assistance needed:</span>{' '}
                    {item.okuNeeds.join(' · ')}
                  </div>
                )}
              </div>

              {(account === 'admin' || account === 'resident') && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onTogglePinMoveMode(!pinMoveMode)}
                    className="min-h-[36px] px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>{pinMoveMode ? t.pinMoveActiveBtn : t.movePinBtn}</span>
                  </button>
                  {pickup && arrivedBoats.length > 1 && (
                    <select
                      value={selectedPickupBoat?.id ?? ''}
                      onChange={(e) =>
                        setPickupBoatChoice((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      aria-label="Select arrived boat"
                      className="min-w-0 h-9 px-2 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      {arrivedBoats.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {pickup && onAdminConfirmPickedUp && (
                    <button
                      type="button"
                      disabled={!selectedPickupBoat}
                      onClick={() => {
                        if (!selectedPickupBoat) return;
                        const outcome = onAdminConfirmPickedUp(item.id, selectedPickupBoat.id);
                        const next: PickupFeedback = !outcome.ok
                          ? { tone: 'error', msg: outcome.error ?? 'Could not confirm pickup.' }
                          : outcome.queued
                            ? { tone: 'queued', msg: 'Pickup confirmation waiting to send.' }
                            : { tone: 'ok', msg: `Pickup confirmed with ${selectedPickupBoat.name}.` };
                        setPickupFeedback((prev) => ({ ...prev, [item.id]: next }));
                      }}
                      className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg inline-flex items-center gap-1 ${
                        selectedPickupBoat
                          ? 'text-white bg-emerald-700 hover:bg-emerald-800 cursor-pointer'
                          : 'text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>
                        {arrivedBoats.length === 1
                          ? `${t.personPickedUpBtn} · ${arrivedBoats[0].name}`
                          : t.personPickedUpBtn}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {pickup?.blocker && (
                <div className="text-amber-800">{pickup.blocker}</div>
              )}

              {feedback && (
                <div
                  className={`px-2.5 py-1.5 rounded-lg border ${
                    feedback.tone === 'ok'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : feedback.tone === 'queued'
                        ? 'bg-sky-50 border-sky-200 text-[#0F4C81]'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  {feedback.msg}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {account === 'admin' && onAdminConfirmPriority && (
        <div className="pt-2.5 border-t border-slate-200 space-y-2">
          <div className="font-semibold text-slate-800">Confirm priority &amp; record reason</div>
          <div className="flex gap-1.5">
            <select
              value={urgencyDraft}
              onChange={(e) => setUrgencyDraft(e.target.value as UrgencyLevel)}
              aria-label="Priority level"
              className="h-9 px-2 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="critical">{t.urgentLabel}</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
            </select>
            <input
              type="text"
              value={reasonDraft}
              onChange={(e) => setReasonDraft(e.target.value)}
              placeholder={t.priorityReasonPlaceholder}
              aria-label="Priority reason"
              className="flex-1 min-w-0 h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!isOnline}
              title={!isOnline ? t.needsConnectionMsg : undefined}
              onClick={() => {
                if (!isOnline) return;
                onAdminConfirmPriority(rep.id, urgencyDraft, reasonDraft);
                setSavedNotice('Priority confirmed.');
              }}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg ${
                isOnline
                  ? 'text-white bg-[#0F4C81] hover:bg-sky-900 cursor-pointer'
                  : 'text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed'
              }`}
            >
              {t.confirmPriorityBtn}
            </button>
            {onOpenDispatchTab && (
              <button
                type="button"
                onClick={onOpenDispatchTab}
                className="min-h-[36px] px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#0F4C81]" />
                <span>{t.openAdminPanelBtn}</span>
              </button>
            )}
          </div>
          {!isOnline && <div className="text-amber-800">{t.needsConnectionMsg}</div>}
          {savedNotice && <div className="text-emerald-800 font-medium">{savedNotice}</div>}
        </div>
      )}
    </div>
  );
};
