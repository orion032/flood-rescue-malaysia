import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Crosshair,
  LifeBuoy,
  Lock,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { AssistanceNeed, GeoPoint, LanguageCode } from '../types/rescue';
import { SHAH_ALAM_PLACES } from '../data/seedData';
import { TRANSLATIONS } from '../i18n/translations';

export type ReportModalMode = 'issue' | 'self_rescue' | 'family_rescue';

interface ReportModalProps {
  isOpen: boolean;
  lang: LanguageCode;
  initialMode: ReportModalMode;
  isOnline: boolean;
  tappedLocation: GeoPoint | null;
  onClose: () => void;
  onSubmitRescueCase: (payload: {
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
  }) => void;
  onSubmitLocalIssue: (payload: {
    issueKind: 'road' | 'outage';
    postcode: string;
    areaName: string;
    locationName: string;
    details: string;
    coordinates: GeoPoint;
  }) => void;
}

const ASSISTANCE_OPTIONS: AssistanceNeed[] = [
  'Wheelchair boarding assistance',
  'Unable to use stairs',
  'Text or visual communication',
  'Older resident without smartphone',
  'Portable oxygen or medical gear',
  'Not sure',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  lang,
  initialMode,
  isOnline,
  tappedLocation,
  onClose,
  onSubmitRescueCase,
  onSubmitLocalIssue,
}) => {
  const t = TRANSLATIONS[lang];
  const [mode, setMode] = useState<ReportModalMode>(initialMode);
  const [issueKind, setIssueKind] = useState<'road' | 'outage'>('road');

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  // Affected person fields (never uses reporter GPS)
  const [affectedName, setAffectedName] = useState('');
  const [relationship, setRelationship] = useState('Relative');
  const [householdCount, setHouseholdCount] = useState(1);
  const [selectedPlaceId, setSelectedPlaceId] = useState(SHAH_ALAM_PLACES[0].id);
  const [useMapTapCoords, setUseMapTapCoords] = useState(false);
  const [lastSeenLocation, setLastSeenLocation] = useState('');
  const [pickupLandmark, setPickupLandmark] = useState('');
  const [confirmedByWho, setConfirmedByWho] = useState('');
  const [confirmedWhen, setConfirmedWhen] = useState('');
  const [lastContactTime, setLastContactTime] = useState('');
  const [reportedDanger, setReportedDanger] = useState('');
  const [dangerNotSure, setDangerNotSure] = useState(false);
  const [okuNeeds, setOkuNeeds] = useState<AssistanceNeed[]>([]);
  const [notes, setNotes] = useState('');
  const [photoAttached, setPhotoAttached] = useState(false);

  // Separate reporter contact
  const [reporterName, setReporterName] = useState('');
  const [reporterLocation, setReporterLocation] = useState('');
  const [reporterCallbackPhone, setReporterCallbackPhone] = useState('');

  // Local issue fields
  const [issueLocation, setIssueLocation] = useState('');
  const [issueDetails, setIssueDetails] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedPlace =
    SHAH_ALAM_PLACES.find((p) => p.id === selectedPlaceId) ?? SHAH_ALAM_PLACES[0];

  const chosenCoordinates: GeoPoint =
    useMapTapCoords && tappedLocation ? tappedLocation : selectedPlace.coordinates;

  const toggleAssistance = (need: AssistanceNeed) => {
    setOkuNeeds((prev) =>
      prev.includes(need) ? prev.filter((item) => item !== need) : [...prev, need]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (mode === 'issue') {
      if (!issueLocation.trim() || !issueDetails.trim()) {
        setValidationError('Please enter the street or area name and describe the local issue.');
        return;
      }
      onSubmitLocalIssue({
        issueKind,
        postcode: selectedPlace.postcode,
        areaName: selectedPlace.name,
        locationName: issueLocation.trim(),
        details: issueDetails.trim(),
        coordinates: chosenCoordinates,
      });
      onClose();
      return;
    }

    if (mode === 'self_rescue') {
      if (!affectedName.trim() || !lastSeenLocation.trim() || !reporterCallbackPhone.trim()) {
        setValidationError(
          'Please enter your name, current location/address, and a contact phone number.'
        );
        return;
      }
      const finalDanger = dangerNotSure
        ? 'Not sure (reported remotely)'
        : reportedDanger.trim() || notes.trim() || 'Not specified';

      onSubmitRescueCase({
        requestMode: 'self',
        affectedPersonName: affectedName.trim(),
        relationshipLabel: 'Self-requested resident',
        householdCount: Math.max(1, Number(householdCount) || 1),
        postcode: selectedPlace.postcode,
        areaName: selectedPlace.name,
        lastSeenLocation: lastSeenLocation.trim(),
        pickupLandmark: pickupLandmark.trim() || selectedPlace.name,
        coordinates: chosenCoordinates,
        confirmedByWho: 'Affected resident directly',
        confirmedWhen: 'Just reported',
        lastContactTime: 'Just reported',
        reportSource: 'Self-reported via web map',
        reportedDanger: finalDanger,
        reporterName: affectedName.trim(),
        reporterLocation: selectedPlace.name,
        reporterCallbackPhone: reporterCallbackPhone.trim(),
        okuNeeds,
        notes: notes.trim() || finalDanger,
        photoAttached,
      });
      onClose();
      return;
    }

    // family_rescue
    if (
      !affectedName.trim() ||
      !lastSeenLocation.trim() ||
      !reporterName.trim() ||
      !reporterCallbackPhone.trim()
    ) {
      setValidationError(
        'Please enter the affected person name, where they were last seen, your name, and your separate callback number.'
      );
      return;
    }

    const finalDanger = dangerNotSure
      ? 'Not sure (reported remotely)'
      : reportedDanger.trim() || notes.trim() || 'Not sure';

    onSubmitRescueCase({
      requestMode: 'family_assisted',
      affectedPersonName: affectedName.trim(),
      relationshipLabel: relationship.trim() || 'Relative',
      householdCount: Math.max(1, Number(householdCount) || 1),
      postcode: selectedPlace.postcode,
      areaName: selectedPlace.name,
      lastSeenLocation: lastSeenLocation.trim(),
      pickupLandmark: pickupLandmark.trim() || `Unconfirmed — near ${selectedPlace.name}`,
      coordinates: chosenCoordinates,
      confirmedByWho: confirmedByWho.trim() || 'Not yet confirmed',
      confirmedWhen: confirmedWhen.trim() || 'Not yet confirmed',
      lastContactTime: lastContactTime.trim() || 'Not yet confirmed',
      reportSource: `Family report (${reporterLocation.trim() || 'Remote relative'})`,
      reportedDanger: finalDanger,
      reporterName: reporterName.trim(),
      reporterLocation: reporterLocation.trim() || 'Other town (Remote relative)',
      reporterCallbackPhone: reporterCallbackPhone.trim(),
      okuNeeds,
      notes:
        notes.trim() ||
        'Family-assisted request submitted without affected person needing a phone or account.',
      photoAttached,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-[1000] bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 id="report-modal-title" className="text-base font-semibold text-slate-900">
              {mode === 'issue'
                ? t.quickActionIssueTitle
                : mode === 'self_rescue'
                ? t.quickActionSelfTitle
                : t.quickActionFamilyTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isOnline
                ? t.demoEmergencyNote
                : t.offlineMapWarning}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeLabel}
            className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Action Mode Switcher */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-2"
            role="group"
            aria-label="Choose request type"
          >
            <button
              type="button"
              onClick={() => {
                setMode('issue');
                setValidationError(null);
              }}
              className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-md border inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'issue'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t.quickActionIssueTitle}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('self_rescue');
                setValidationError(null);
              }}
              className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-md border inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'self_rescue'
                  ? 'bg-[#0F4C81] text-white border-[#0F4C81]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <LifeBuoy className="w-4 h-4 shrink-0" />
              <span>{t.quickActionSelfTitle}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('family_rescue');
                setValidationError(null);
              }}
              className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-md border inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'family_rescue'
                  ? 'bg-[#0F4C81] text-white border-[#0F4C81]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>{t.quickActionFamilyTitle}</span>
            </button>
          </div>

          {validationError && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900">
              {validationError}
            </div>
          )}

          {/* Location Picker (Shah Alam Demo Area or Map Tap — NEVER Reporter GPS) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="shah-alam-place" className="text-xs font-semibold text-slate-900">
                {mode === 'family_rescue'
                  ? "Affected person's Shah Alam area (reporter GPS is never used)"
                  : 'Shah Alam demo area'}
              </label>
              <span className="text-[11px] text-slate-500">Demo area only</span>
            </div>
            <select
              id="shah-alam-place"
              value={selectedPlaceId}
              onChange={(e) => setSelectedPlaceId(e.target.value)}
              className="w-full min-h-[40px] text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-md"
            >
              {SHAH_ALAM_PLACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.postcode}) — {p.category}
                </option>
              ))}
            </select>
            {tappedLocation ? (
              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={useMapTapCoords}
                  onChange={(e) => setUseMapTapCoords(e.target.checked)}
                />
                <Crosshair className="w-3.5 h-3.5 text-[#0F4C81]" />
                <span>
                  Use your tapped map pin ({tappedLocation.lat}, {tappedLocation.lng})
                </span>
              </label>
            ) : (
              <p className="text-[11px] text-slate-500">
                Tip: You can close this form, tap anywhere on the Shah Alam map to drop a pin, and re-open to attach exact coordinates.
              </p>
            )}
          </div>

          {mode === 'issue' ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIssueKind('road')}
                  className={`flex-1 min-h-[40px] text-xs font-medium rounded border cursor-pointer ${
                    issueKind === 'road'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Blocked Road
                </button>
                <button
                  type="button"
                  onClick={() => setIssueKind('outage')}
                  className={`flex-1 min-h-[40px] text-xs font-medium rounded border cursor-pointer ${
                    issueKind === 'outage'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Power Outage
                </button>
              </div>
              <div>
                <label htmlFor="issue-location" className="block text-xs text-slate-700 mb-1">
                  Road, junction, or block name *
                </label>
                <input
                  id="issue-location"
                  type="text"
                  value={issueLocation}
                  onChange={(e) => setIssueLocation(e.target.value)}
                  placeholder="e.g. Jalan Kemuning 25/101"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="issue-details" className="block text-xs text-slate-700 mb-1">
                  Observed water depth, blockage, or power issue *
                </label>
                <textarea
                  id="issue-details"
                  rows={3}
                  value={issueDetails}
                  onChange={(e) => setIssueDetails(e.target.value)}
                  placeholder="e.g. 1.0 m water across junction; cars cannot pass"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Person Needing Rescue */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-900 border-b border-slate-100 pb-1.5">
                  1. Person Needing Rescue (No phone or account required)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="affected-name" className="block text-xs text-slate-700 mb-1">
                      {mode === 'self_rescue' ? 'Your name *' : 'Affected person name *'}
                    </label>
                    <input
                      id="affected-name"
                      type="text"
                      value={affectedName}
                      onChange={(e) => setAffectedName(e.target.value)}
                      placeholder="e.g. Encik Muthu (Fictional)"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="household-count" className="block text-xs text-slate-700 mb-1">
                      People waiting
                    </label>
                    <input
                      id="household-count"
                      type="number"
                      min={1}
                      max={30}
                      value={householdCount}
                      onChange={(e) => setHouseholdCount(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="last-seen-loc" className="block text-xs text-slate-700 mb-1">
                      Where were they last seen? (Private address) *
                    </label>
                    <input
                      id="last-seen-loc"
                      type="text"
                      value={lastSeenLocation}
                      onChange={(e) => setLastSeenLocation(e.target.value)}
                      placeholder="e.g. Unit 01-03, Flat Block B"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="pickup-landmark" className="block text-xs text-slate-700 mb-1">
                      Specific pickup point (e.g., school entrance)
                    </label>
                    <input
                      id="pickup-landmark"
                      type="text"
                      value={pickupLandmark}
                      onChange={(e) => setPickupLandmark(e.target.value)}
                      placeholder="e.g. SK Taman Sri Muda Covered Entrance"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                {mode === 'family_rescue' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="confirmed-who" className="block text-xs text-slate-700 mb-1">
                        Who confirmed this location?
                      </label>
                      <input
                        id="confirmed-who"
                        type="text"
                        value={confirmedByWho}
                        onChange={(e) => setConfirmedByWho(e.target.value)}
                        placeholder="e.g. Neighbour / Guard"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="confirmed-when" className="block text-xs text-slate-700 mb-1">
                        When was it confirmed?
                      </label>
                      <input
                        id="confirmed-when"
                        type="text"
                        value={confirmedWhen}
                        onChange={(e) => setConfirmedWhen(e.target.value)}
                        placeholder="e.g. 2:15 PM"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="last-contact-time" className="block text-xs text-slate-700 mb-1">
                        Last contact time
                      </label>
                      <input
                        id="last-contact-time"
                        type="text"
                        value={lastContactTime}
                        onChange={(e) => setLastContactTime(e.target.value)}
                        placeholder="e.g. 1:50 PM"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                )}

                {/* Evacuation assistance (2 questions + Not sure, no OKU card/ID/medical upload, does not auto-raise priority) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {t.evacuationAssistanceTitle}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {t.noDocNeededNote}
                    </p>
                  </div>

                  {/* Question 1 */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="danger-now-input" className="text-xs font-medium text-slate-800">
                        {t.dangerQuestion}
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dangerNotSure}
                          onChange={(e) => setDangerNotSure(e.target.checked)}
                        />
                        <span>{t.notSureOption}</span>
                      </label>
                    </div>
                    <input
                      id="danger-now-input"
                      type="text"
                      disabled={dangerNotSure}
                      value={dangerNotSure ? 'Not sure (reported remotely)' : reportedDanger}
                      onChange={(e) => setReportedDanger(e.target.value)}
                      placeholder="e.g. Water rising near porch, power out, phone battery low"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  {/* Question 2 */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-800">
                      {t.helpNeededQuestion}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ASSISTANCE_OPTIONS.map((need) => (
                        <label
                          key={need}
                          className="flex items-center gap-2 text-xs text-slate-700 p-2.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={okuNeeds.includes(need)}
                            onChange={() => toggleAssistance(need)}
                          />
                          <span>{need}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="case-notes" className="block text-xs text-slate-700 mb-1">
                    Extra landmark or access notes (optional)
                  </label>
                  <textarea
                    id="case-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Waiting under covered school gate; gate unlocked."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={photoAttached}
                    onChange={(e) => setPhotoAttached(e.target.checked)}
                  />
                  <span>Attach landmark photo (optional demo flag)</span>
                </label>
              </div>

              {/* Separate Reporter Contact */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-slate-900">
                    2. {mode === 'self_rescue' ? 'Your Contact Number' : 'Reporter Contact (Kept Separate)'}
                  </h3>
                  <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Hidden from public map
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {mode === 'family_rescue' && (
                    <>
                      <div>
                        <label htmlFor="reporter-name" className="block text-xs text-slate-700 mb-1">
                          Your name *
                        </label>
                        <input
                          id="reporter-name"
                          type="text"
                          value={reporterName}
                          onChange={(e) => setReporterName(e.target.value)}
                          placeholder="e.g. Farah (Daughter)"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label htmlFor="reporter-relationship" className="block text-xs text-slate-700 mb-1">
                          Relationship
                        </label>
                        <input
                          id="reporter-relationship"
                          type="text"
                          value={relationship}
                          onChange={(e) => setRelationship(e.target.value)}
                          placeholder="e.g. Your mother"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                        />
                      </div>
                    </>
                  )}
                  <div className={mode === 'self_rescue' ? 'sm:col-span-2' : ''}>
                    <label htmlFor="reporter-phone" className="block text-xs text-slate-700 mb-1">
                      Callback phone number *
                    </label>
                    <input
                      id="reporter-phone"
                      type="tel"
                      value={reporterCallbackPhone}
                      onChange={(e) => setReporterCallbackPhone(e.target.value)}
                      placeholder="+60 12-555 0192 (Demo)"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                </div>
                {mode === 'family_rescue' && (
                  <div>
                    <label htmlFor="reporter-town" className="block text-xs text-slate-700 mb-1">
                      Your current town (optional — separate from relative&apos;s location)
                    </label>
                    <input
                      id="reporter-town"
                      type="text"
                      value={reporterLocation}
                      onChange={(e) => setReporterLocation(e.target.value)}
                      placeholder="e.g. Ipoh, Perak"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-600 shrink-0" />
            <span>
              Demo notice: This prototype does not contact real emergency services (999 / JBPM / APM). In a real emergency, call 999.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-sky-900 rounded-md cursor-pointer"
              >
                {isOnline ? t.requestRescueBtn : 'Save Local Draft (Offline)'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};
