import React, { useMemo, useState } from 'react';
import {
  Anchor,
  Building2,
  CheckCircle2,
  Crosshair,
  Droplets,
  Lock,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  UserCheck,
  Waves,
  Zap,
} from 'lucide-react';
import {
  BoatStatus,
  BoatUnit,
  DemoAccountId,
  GeoPoint,
  LanguageCode,
  PPSCenter,
  PowerOutageZone,
  RescueCase,
  UrgencyLevel,
} from '../types/rescue';
import { formatBoatStatus, formatCaseStatus, TRANSLATIONS } from '../i18n/translations';

interface CoordinatorConsoleProps {
  account: DemoAccountId;
  lang: LanguageCode;
  onSwitchAccount: (account: DemoAccountId) => void;
  isOnline: boolean;
  cases: RescueCase[];
  boats: BoatUnit[];
  ppsCenters: PPSCenter[];
  outages: PowerOutageZone[];
  selectedCaseId: string;
  onSelectCase: (id: string) => void;
  tappedLocation: GeoPoint | null;
  onVerifyPin: (
    caseId: string,
    landmark: string,
    coords: GeoPoint,
    confirmedByWho: string
  ) => void;
  onAssignOwnerAndFollowUp: (caseId: string, owner: string, followUp: string) => void;
  onConfirmPriority: (caseId: string, urgency: UrgencyLevel, reason: string) => void;
  onAssignBoat: (caseId: string, boatId: string) => { ok: boolean; error?: string };
  onSendFamilyUpdate: (caseId: string, message: string) => void;
  onAdvanceBoatStatus: (boatId: string, nextStatus: BoatStatus, eta?: string) => void;
  onUpdateBoatLocation: (boatId: string, point: GeoPoint) => void;
  onUpdateBoatResources: (
    boatId: string,
    supplies: BoatUnit['supplies'],
    eta: string
  ) => void;
  onConfirmPersonPickedUp: (caseId: string, boatId: string) => void;
  onUpdatePps: (
    ppsId: string,
    occupancy: number,
    status: PPSCenter['status']
  ) => void;
  onUpdateOutage: (
    outageId: string,
    status: PowerOutageZone['status'],
    cause: string,
    etr: string
  ) => void;
}

type CaseFilter = 'all' | 'needs_verification' | 'ready_for_boat' | 'en_route' | 'picked_up';

export const CoordinatorConsole: React.FC<CoordinatorConsoleProps> = ({
  account,
  lang,
  onSwitchAccount,
  isOnline,
  cases,
  boats,
  ppsCenters,
  outages,
  selectedCaseId,
  onSelectCase,
  tappedLocation,
  onVerifyPin,
  onAssignOwnerAndFollowUp,
  onConfirmPriority,
  onAssignBoat,
  onSendFamilyUpdate,
  onAdvanceBoatStatus,
  onUpdateBoatLocation,
  onUpdateBoatResources,
  onConfirmPersonPickedUp,
  onUpdatePps,
  onUpdateOutage,
}) => {
  const t = TRANSLATIONS[lang];
  const [filter, setFilter] = useState<CaseFilter>('all');
  const [dispatchBoatChoice, setDispatchBoatChoice] = useState<string>('boat-12');
  const [dispatchFeedback, setDispatchFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pinLandmarkDraft, setPinLandmarkDraft] = useState<string>('');
  const [pinConfirmerDraft, setPinConfirmerDraft] = useState<string>('');
  const [ownerDraft, setOwnerDraft] = useState<string>('Volunteer Scout Unit B');
  const [followUpDraft, setFollowUpDraft] = useState<string>('');
  const [priorityDraft, setPriorityDraft] = useState<UrgencyLevel>('high');
  const [priorityReasonDraft, setPriorityReasonDraft] = useState<string>('');
  const [familyMsgDraft, setFamilyMsgDraft] = useState<string>('');
  const [etaDrafts, setEtaDrafts] = useState<Record<string, string>>({});
  const [outageEtrDrafts, setOutageEtrDrafts] = useState<Record<string, string>>({});

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (filter === 'needs_verification') return !c.locationVerified;
      if (filter === 'ready_for_boat') return c.locationVerified && c.status === 'confirmed';
      if (filter === 'en_route') return c.status === 'assigned' || c.status === 'boat_arrived';
      if (filter === 'picked_up') return c.status === 'picked_up';
      return true;
    });
  }, [cases, filter]);

  const activeCase = cases.find((c) => c.id === selectedCaseId) ?? filteredCases[0] ?? cases[0];

  const statusBadgeText = (status: RescueCase['status']) => formatCaseStatus(lang, status);

  if (account !== 'admin') {
    return (
      <section className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
        <div className="w-11 h-11 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-slate-700" />
        </div>
        <div className="max-w-lg mx-auto space-y-1.5">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.adminProtectedTitle}
          </h2>
          <p className="text-sm text-slate-600">
            {t.adminProtectedDesc}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSwitchAccount('admin')}
          className="min-h-[44px] px-5 py-2.5 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-sky-900 rounded-md whitespace-nowrap cursor-pointer"
        >
          {t.switchToAdminBtn}
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Triage, Priority Facts, Pin Verification & Dispatch */}
      <section
        aria-label={t.adminConsoleTitle}
        className="bg-white border border-slate-200 rounded-lg overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t.adminConsoleTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.adminConsoleSub}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md" role="tablist">
            {(
              [
                ['all', 'All Cases'],
                ['needs_verification', 'Unverified'],
                ['ready_for_boat', 'Ready'],
                ['en_route', 'En Route / Arrived'],
                ['picked_up', 'Picked Up'],
              ] as [CaseFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`min-h-[36px] px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Case List */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 divide-y divide-slate-100">
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No rescue cases match this filter.
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = activeCase?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectCase(c.id);
                      setPinLandmarkDraft(c.pickupLandmark);
                      setPinConfirmerDraft('');
                      setOwnerDraft(c.caseOwner ?? 'Volunteer Scout Unit B');
                      setFollowUpDraft(c.followUpAction ?? '');
                      setPriorityDraft(c.urgency);
                      setPriorityReasonDraft(c.priorityReason ?? '');
                      setDispatchFeedback(null);
                    }}
                    className={`w-full text-left px-5 py-3.5 transition-colors cursor-pointer block ${
                      isSelected ? 'bg-sky-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
                        {c.urgency === 'critical' && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                            <ShieldAlert className="w-3 h-3" /> {t.urgentLabel}
                          </span>
                        )}
                        <span>{c.affectedPersonName} · {c.householdCount} pax</span>
                      </span>
                      <span
                        className={`text-xs font-medium whitespace-nowrap ${
                          c.status === 'picked_up'
                            ? 'text-emerald-800'
                            : !c.locationVerified
                            ? 'text-amber-800'
                            : 'text-[#0F4C81]'
                        }`}
                      >
                        {statusBadgeText(c.status)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2">
                      <span>{c.pickupLandmark}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{c.reporterCallbackPhone}</span>
                    </div>

                    {c.okuNeeds.length > 0 && (
                      <div className="text-xs text-slate-700 font-medium mt-1">
                        Assistance: {c.okuNeeds.join(' · ')}
                      </div>
                    )}
                    {c.syncState === 'local_draft' && (
                      <div className="text-xs text-amber-800 font-semibold mt-1">
                        Local draft (not sent)
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Case Details, Priority Facts & Coordinator Actions */}
          <div className="lg:col-span-7 p-5 space-y-4 bg-white">
            {activeCase ? (
              <>
                <div className="border-b border-slate-100 pb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500">
                      Case {activeCase.id.toUpperCase()} · Reported {activeCase.reportedAt} · Demo data
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                      {activeCase.affectedPersonName}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">{activeCase.notes}</p>
                  </div>
                  {activeCase.urgency === 'critical' ? (
                    <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded inline-flex items-center gap-1 whitespace-nowrap">
                      <ShieldAlert className="w-3.5 h-3.5" /> {t.urgentLabel}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded capitalize whitespace-nowrap">
                      Priority: {activeCase.urgency}
                    </span>
                  )}
                </div>

                {/* Report Source, Contact & Pin Summary */}
                <div className="text-xs space-y-1.5 bg-slate-50 border border-slate-200 rounded-md p-3">
                  <div className="text-slate-800">
                    <span className="font-semibold">{t.reportSourceLabel}:</span>{' '}
                    {activeCase.reportSource}
                  </div>
                  <div className="text-slate-800">
                    <span className="font-semibold">{t.lastContactLabel}:</span>{' '}
                    {activeCase.lastContactTime}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-slate-800">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-semibold">Reporter contact (private):</span>
                    <span className="font-mono tabular-nums">{activeCase.reporterCallbackPhone}</span>
                    <span className="text-slate-500">
                      — {activeCase.reporterName} ({activeCase.reporterLocation})
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Last seen location:</span>{' '}
                      {activeCase.lastSeenLocation}
                    </div>
                  </div>
                  <div className="text-slate-700">
                    <span className="font-semibold text-slate-900">Pickup point:</span>{' '}
                    {activeCase.pickupLandmark} · Confirmed by {activeCase.confirmedByWho} (
                    {activeCase.confirmedWhen})
                  </div>
                </div>

                {/* Current Danger, Evacuation Ability & Coordinator Priority Confirmation */}
                <div className="border border-slate-200 rounded-md p-3.5 space-y-3">
                  <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Waves className="w-4 h-4 text-[#0F4C81]" />
                    <span>Triage Facts &amp; Coordinator Priority Confirmation</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{t.currentDangerLabel}:</span>{' '}
                      <span className="text-slate-600">{activeCase.priorityFacts.reportedDanger}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">{t.abilityToEvacuateLabel}:</span>{' '}
                      <span className="text-slate-600">{activeCase.priorityFacts.abilityToEvacuate}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Time since last contact:</span>{' '}
                      <span className="text-slate-600">{activeCase.priorityFacts.timeSinceLastContact}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Low-lying terrain &amp; road:</span>{' '}
                      <span className="text-slate-600">
                        {activeCase.priorityFacts.lowLyingTerrain} · {activeCase.priorityFacts.roadAccess}
                      </span>
                    </div>
                    <div className="sm:col-span-2 pt-1.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 bg-sky-50 border border-sky-200 rounded">
                        <div className="font-semibold text-sky-950">River Station Reading</div>
                        <div className="text-sky-900 mt-0.5">{activeCase.priorityFacts.riverStationTrend}</div>
                      </div>
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                        <div className="font-semibold text-amber-950">Reported Building Flood Depth</div>
                        <div className="text-amber-900 mt-0.5">{activeCase.priorityFacts.buildingFloodDepth}</div>
                      </div>
                    </div>
                  </div>

                  {/* Coordinator confirms priority + short reason */}
                  <div className="pt-2.5 border-t border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900">Coordinator priority decision</span>
                      <span className="text-[11px] text-slate-600">
                        {activeCase.priorityConfirmed
                          ? `Confirmed by ${activeCase.priorityConfirmedBy ?? 'Coordinator'} (${activeCase.priorityConfirmedAt ?? ''})`
                          : 'Awaiting coordinator confirmation'}
                      </span>
                    </div>
                    {activeCase.priorityReason && (
                      <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                        <span className="font-semibold">Recorded reason:</span> {activeCase.priorityReason}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="Confirm case priority level"
                        value={priorityDraft}
                        onChange={(e) => setPriorityDraft(e.target.value as UrgencyLevel)}
                        className="min-h-[36px] text-xs px-2.5 py-1 bg-white border border-slate-300 rounded"
                      >
                        <option value="critical">Urgent (Critical)</option>
                        <option value="high">High</option>
                        <option value="moderate">Moderate</option>
                      </select>
                      <input
                        type="text"
                        aria-label="Priority confirmation reason"
                        value={priorityReasonDraft}
                        onChange={(e) => setPriorityReasonDraft(e.target.value)}
                        placeholder={t.priorityReasonPlaceholder}
                        className="flex-1 min-w-[180px] min-h-[36px] text-xs px-2.5 py-1 bg-white border border-slate-300 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onConfirmPriority(
                            activeCase.id,
                            priorityDraft,
                            priorityReasonDraft || 'Coordinator reviewed danger and mobility'
                          );
                          setDispatchFeedback({
                            ok: true,
                            msg: `Priority confirmed as ${priorityDraft === 'critical' ? 'Urgent' : priorityDraft}.`,
                          });
                        }}
                        className="min-h-[36px] px-3 py-1 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-sky-900 rounded cursor-pointer whitespace-nowrap"
                      >
                        {t.confirmPriorityBtn}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Verify / Update Pickup Pin (Always available to Coordinator) */}
                <div className="border border-slate-200 rounded-md p-3.5 space-y-2.5 bg-slate-50/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-[#0F4C81]" />
                      <span>Verify or Change Pickup Point</span>
                    </span>
                    {!activeCase.locationVerified && (
                      <span className="text-xs font-medium text-amber-800 inline-flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Unverified location
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      aria-label="Pickup landmark name"
                      value={pinLandmarkDraft || activeCase.pickupLandmark}
                      onChange={(e) => setPinLandmarkDraft(e.target.value)}
                      placeholder="Specific pickup point (e.g. school entrance)"
                      className="text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-md"
                    />
                    <input
                      type="text"
                      aria-label="Confirmed by who"
                      value={pinConfirmerDraft}
                      onChange={(e) => setPinConfirmerDraft(e.target.value)}
                      placeholder="Who confirmed? (e.g. Neighbour phone)"
                      className="text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const landmark = (pinLandmarkDraft || activeCase.pickupLandmark).replace(
                          /^Unconfirmed —\s*/i,
                          ''
                        );
                        onVerifyPin(
                          activeCase.id,
                          landmark,
                          tappedLocation ?? activeCase.coordinates,
                          pinConfirmerDraft || 'Coordinator verified'
                        );
                        setDispatchFeedback({
                          ok: true,
                          msg: `Pickup pin verified at "${landmark}".`,
                        });
                      }}
                      className="min-h-[40px] px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      Verify / Update Pickup Pin{tappedLocation ? ' (Use Tapped Map Pin)' : ''}
                    </button>
                    {tappedLocation && (
                      <span className="text-[11px] font-mono text-slate-600">
                        Map tap ready: {tappedLocation.lat}, {tappedLocation.lng}
                      </span>
                    )}
                  </div>

                  {/* Unverified case owner & follow-up action */}
                  {!activeCase.locationVerified && (
                    <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        aria-label="Case owner"
                        value={ownerDraft}
                        onChange={(e) => setOwnerDraft(e.target.value)}
                        placeholder="Owner (e.g. Scout Unit B)"
                        className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md"
                      />
                      <input
                        type="text"
                        aria-label="Follow-up action"
                        value={followUpDraft}
                        onChange={(e) => setFollowUpDraft(e.target.value)}
                        placeholder="Follow-up action"
                        className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onAssignOwnerAndFollowUp(
                            activeCase.id,
                            ownerDraft,
                            followUpDraft || 'Verify location via callback / local scout'
                          );
                          setDispatchFeedback({
                            ok: true,
                            msg: `Assigned owner "${ownerDraft}" with follow-up action.`,
                          });
                        }}
                        className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-amber-950 bg-amber-50 border border-amber-400 hover:bg-amber-100 rounded-md whitespace-nowrap cursor-pointer"
                      >
                        Set Owner &amp; Follow-Up
                      </button>
                    </div>
                  )}
                </div>

                {/* Assign Multiple Boats (with two-destination lock & urgent unverified allowance) */}
                {activeCase.status !== 'picked_up' && (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <label htmlFor="assign-boat-select" className="block text-xs font-semibold text-slate-800">
                      Assign Boat to Pickup Point (Multiple boats allowed per point; 1 destination per boat)
                    </label>
                    {!activeCase.locationVerified && activeCase.urgency === 'critical' && (
                      <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                        Urgent unverified case: You can dispatch an available boat now while {activeCase.caseOwner || 'the follow-up owner'} continues confirming the exact pin.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        id="assign-boat-select"
                        value={dispatchBoatChoice}
                        onChange={(e) => setDispatchBoatChoice(e.target.value)}
                        className="flex-1 min-w-[200px] min-h-[42px] text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-md"
                      >
                        {boats.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.status.replace(/_/g, ' ')})
                            {b.assignedPickupPoint ? ` → ${b.assignedPickupPoint}` : ' (Available)'}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const res = onAssignBoat(activeCase.id, dispatchBoatChoice);
                          setDispatchFeedback({
                            ok: res.ok,
                            msg: res.ok
                              ? `Assigned ${
                                  boats.find((b) => b.id === dispatchBoatChoice)?.name ?? 'boat'
                                } to ${activeCase.pickupLandmark}.`
                              : res.error ?? 'Could not assign boat.',
                          });
                        }}
                        className="min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-sky-900 rounded-md whitespace-nowrap cursor-pointer"
                      >
                        {t.assignBtn}
                      </button>
                    </div>
                  </div>
                )}

                {/* Separate "Person Picked Up" Confirmation Action */}
                {(activeCase.status === 'assigned' || activeCase.status === 'boat_arrived') && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-md flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-700">
                      <strong>Confirm boarding individually:</strong> Confirming this person picked up leaves any other waiting households at the same entrance open.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const boatId = activeCase.assignedBoatIds[0] ?? boats[0].id;
                        onConfirmPersonPickedUp(activeCase.id, boatId);
                        setDispatchFeedback({
                          ok: true,
                          msg: isOnline
                            ? `Person picked up confirmed for ${activeCase.affectedPersonName}.`
                            : 'Pickup confirmation saved as local draft (offline).',
                        });
                      }}
                      className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{t.personPickedUpBtn}</span>
                    </button>
                  </div>
                )}

                {activeCase.status === 'picked_up' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      Person picked up confirmed at {activeCase.pickedUpAt} by{' '}
                      {activeCase.pickedUpBy ?? 'Crew'}.
                    </span>
                  </div>
                )}

                {/* Send Update to Reporting Family */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <label htmlFor="send-family-msg" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#0F4C81]" />
                    <span>Send Update to Reporting Family</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id="send-family-msg"
                      type="text"
                      value={familyMsgDraft}
                      onChange={(e) => setFamilyMsgDraft(e.target.value)}
                      placeholder="e.g. Wheelchair ramp crew is 10 mins from school entrance."
                      className="flex-1 min-w-[200px] text-xs px-3 py-2 border border-slate-300 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!familyMsgDraft.trim()) return;
                        onSendFamilyUpdate(activeCase.id, familyMsgDraft.trim());
                        setFamilyMsgDraft('');
                        setDispatchFeedback({
                          ok: true,
                          msg: 'Update sent to reporting family feed.',
                        });
                      }}
                      className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Update</span>
                    </button>
                  </div>
                </div>

                {dispatchFeedback && (
                  <div
                    role="status"
                    className={`px-3 py-2 rounded-md text-xs border ${
                      dispatchFeedback.ok
                        ? 'bg-sky-50 border-sky-200 text-sky-950'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    {dispatchFeedback.msg}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-500 py-8 text-center">
                Select a case to inspect priority facts and dispatch boats.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Boats, Crews, Supplies & Optional ETA */}
      <section aria-label="Boats, Crews and Supplies" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            Boats, Crews &amp; Supplies (Demo Vessels · Last Reported Position)
          </h2>
          <span className="text-xs text-slate-500">
            ETA is shown to families only if entered by crew below
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boats.map((boat) => {
            const etaValue = etaDrafts[boat.id] ?? boat.eta ?? '';
            return (
              <article
                key={boat.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-500">{boat.crewLead}</div>
                      <h3 className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
                        <Anchor className="w-4 h-4 text-[#0F4C81]" />
                        <span>{boat.name}</span>
                      </h3>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-slate-700">
                      {boat.lastUpdatedAt}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 space-y-1">
                    <p>
                      <span className="font-semibold text-slate-900">Status:</span>{' '}
                      <span className="capitalize">{boat.status.replace(/_/g, ' ')}</span>
                      {boat.eta ? ` · ETA ${boat.eta}` : ''}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Destination:</span>{' '}
                      {boat.assignedPickupPoint ?? 'Staging (Available)'}
                    </p>
                    <p className="font-mono tabular-nums text-[11px] text-slate-500">
                      Position: {boat.position.lat}, {boat.position.lng}
                    </p>
                  </div>

                  {/* Editable Supplies & Optional ETA */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-500">Life jackets</label>
                      <input
                        type="number"
                        min={0}
                        aria-label={`${boat.name} life jackets`}
                        value={boat.supplies.lifeJackets}
                        onChange={(e) =>
                          onUpdateBoatResources(
                            boat.id,
                            { ...boat.supplies, lifeJackets: Math.max(0, Number(e.target.value)) },
                            etaValue
                          )
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500">Generators</label>
                      <input
                        type="number"
                        min={0}
                        aria-label={`${boat.name} generators`}
                        value={boat.supplies.generators}
                        onChange={(e) =>
                          onUpdateBoatResources(
                            boat.id,
                            { ...boat.supplies, generators: Math.max(0, Number(e.target.value)) },
                            etaValue
                          )
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 flex items-center gap-0.5">
                        <Droplets className="w-3 h-3 text-sky-700" /> Water
                      </label>
                      <input
                        type="number"
                        min={0}
                        aria-label={`${boat.name} drinking water cases`}
                        value={boat.supplies.drinkingWaterCases}
                        onChange={(e) =>
                          onUpdateBoatResources(
                            boat.id,
                            {
                              ...boat.supplies,
                              drinkingWaterCases: Math.max(0, Number(e.target.value)),
                            },
                            etaValue
                          )
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      aria-label={`${boat.name} crew ETA`}
                      value={etaValue}
                      onChange={(e) =>
                        setEtaDrafts((prev) => ({ ...prev, [boat.id]: e.target.value }))
                      }
                      placeholder="Optional crew ETA (e.g. 2:50 PM)"
                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateBoatResources(boat.id, boat.supplies, etaValue)}
                      className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      Save ETA
                    </button>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
                    <div className="font-semibold text-slate-900 mb-0.5">Saved Assignment</div>
                    <p>{boat.savedAssignmentNote}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={boat.status === 'preparing'}
                      onClick={() => onAdvanceBoatStatus(boat.id, 'preparing', etaValue)}
                      className="min-h-[36px] px-2.5 py-1 text-xs font-medium rounded border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-45 whitespace-nowrap cursor-pointer"
                    >
                      {formatBoatStatus(lang, 'preparing')}
                    </button>
                    <button
                      type="button"
                      disabled={boat.status === 'on_the_way'}
                      onClick={() => onAdvanceBoatStatus(boat.id, 'on_the_way', etaValue)}
                      className="min-h-[36px] px-2.5 py-1 text-xs font-medium rounded border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-45 whitespace-nowrap cursor-pointer"
                    >
                      {formatBoatStatus(lang, 'on_the_way')}
                    </button>
                    <button
                      type="button"
                      disabled={boat.status === 'arrived'}
                      onClick={() => onAdvanceBoatStatus(boat.id, 'arrived')}
                      className="min-h-[36px] px-2.5 py-1 text-xs font-medium rounded bg-[#0F4C81] text-white hover:bg-sky-900 disabled:opacity-45 whitespace-nowrap cursor-pointer"
                    >
                      {formatBoatStatus(lang, 'arrived')}
                    </button>
                    <button
                      type="button"
                      disabled={boat.status === 'available'}
                      onClick={() => onAdvanceBoatStatus(boat.id, 'available')}
                      className="min-h-[36px] px-2.5 py-1 text-xs font-medium rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-45 whitespace-nowrap cursor-pointer"
                    >
                      {formatBoatStatus(lang, 'available')}
                    </button>
                  </div>

                  {tappedLocation && (
                    <button
                      type="button"
                      onClick={() => onUpdateBoatLocation(boat.id, tappedLocation)}
                      className="w-full min-h-[36px] px-2.5 py-1 text-xs font-medium rounded border border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>
                        Move {boat.name} to tapped pin ({tappedLocation.lat}, {tappedLocation.lng})
                      </span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Section 3: Publish Shelter (PPS) & Utility (Power) Updates */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Building2 className="w-4 h-4 text-emerald-800" />
            <h3 className="text-sm font-semibold text-slate-900">
              Publish Evacuation Centre (PPS) Status &amp; Capacity (Demo)
            </h3>
          </div>
          <div className="space-y-3">
            {ppsCenters.map((pps) => (
              <div
                key={pps.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900">{pps.name}</div>
                  <div className="text-slate-500 mt-0.5">
                    {pps.status} · {pps.occupancy}/{pps.capacity} · {pps.updatedAt}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePps(pps.id, Math.min(pps.capacity, pps.occupancy + 5), 'Open')
                    }
                    className="min-h-[36px] px-2.5 py-1 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    +5 Intake
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePps(
                        pps.id,
                        pps.occupancy,
                        pps.status === 'Open' ? 'Near Capacity' : 'Open'
                      )
                    }
                    className="min-h-[36px] px-2.5 py-1 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    Toggle Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Zap className="w-4 h-4 text-amber-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              Publish Power Outage &amp; Restoration Updates (Demo)
            </h3>
          </div>
          <div className="space-y-3">
            {outages.map((zone) => {
              const etrVal = outageEtrDrafts[zone.id] ?? zone.estimatedRestoration;
              return (
                <div
                  key={zone.id}
                  className="space-y-2 py-2 border-b border-slate-100 last:border-b-0 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{zone.areaName}</span>
                    <span className="text-slate-600">{zone.status}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      aria-label={`ETR for ${zone.areaName}`}
                      value={etrVal}
                      onChange={(e) =>
                        setOutageEtrDrafts((prev) => ({ ...prev, [zone.id]: e.target.value }))
                      }
                      className="flex-1 min-w-[160px] px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateOutage(
                          zone.id,
                          'Crew Dispatched',
                          zone.confirmedCause,
                          etrVal || 'Not yet confirmed'
                        )
                      }
                      className="min-h-[36px] px-2.5 py-1 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      Update ETR
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateOutage(
                          zone.id,
                          'Restored',
                          zone.confirmedCause,
                          'Power restored (Demo)'
                        )
                      }
                      className="min-h-[36px] px-2.5 py-1 text-xs font-medium bg-emerald-800 text-white rounded hover:bg-emerald-900 cursor-pointer"
                    >
                      Mark Restored
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
