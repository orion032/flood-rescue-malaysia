import React, { useState } from 'react';
import {
  Anchor,
  CheckCircle2,
  Clock,
  Crosshair,
  LifeBuoy,
  Lock,
  MapPin,
  MessageSquare,
  Send,
  Users,
  WifiOff,
} from 'lucide-react';
import { BoatUnit, DemoAccountId, GeoPoint, LanguageCode, RescueCase } from '../types/rescue';
import {
  formatFamilyMemberStatus,
  getOwnedCasesForAccount,
  ResidentRescueSummary,
} from '../utils/rescueLogic';
import {
  formatBoatStatus,
  formatBoatSummary,
  formatCaseStatus,
  TRANSLATIONS,
} from '../i18n/translations';

interface FamilyTrackerCardProps {
  account: DemoAccountId;
  lang: LanguageCode;
  cases: RescueCase[];
  boats: BoatUnit[];
  residentSummary: ResidentRescueSummary;
  selectedCaseId: string;
  onSelectCase: (id: string) => void;
  isOnline: boolean;
  tappedLocation: GeoPoint | null;
  onReportLocationChange: (
    caseId: string,
    newLandmark: string,
    confirmedBy: string,
    coords?: GeoPoint
  ) => void;
  onRequestRescue: () => void;
  onSwitchAccount: (account: DemoAccountId) => void;
}

export const FamilyTrackerCard: React.FC<FamilyTrackerCardProps> = ({
  account,
  lang,
  cases,
  boats,
  residentSummary,
  selectedCaseId,
  onSelectCase,
  isOnline,
  tappedLocation,
  onReportLocationChange,
  onRequestRescue,
  onSwitchAccount,
}) => {
  const t = TRANSLATIONS[lang];
  const [editingLocation, setEditingLocation] = useState(false);
  const [newLandmark, setNewLandmark] = useState('');
  const [confirmedBy, setConfirmedBy] = useState('');
  const [useTappedCoords, setUseTappedCoords] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (account === 'guest') {
    return (
      <section
        aria-label={t.guestCardTitle}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-3"
      >
        <div className="flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              {t.guestCardTitle}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.guestCardBody}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSwitchAccount('resident')}
            className="min-h-[40px] px-3.5 py-1.5 text-xs font-medium text-[#0F4C81] bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-md cursor-pointer"
          >
            {t.openUserViewBtn}
          </button>
        </div>
      </section>
    );
  }

  const visibleCases = getOwnedCasesForAccount(account, cases);
  const activeCase =
    visibleCases.find((c) => c.id === selectedCaseId) ?? visibleCases[0] ?? null;

  if (!activeCase) {
    return (
      <section
        aria-label={t.myRescueTitle}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-3"
      >
        <h2 className="text-base font-semibold text-slate-900">{t.myRescueTitle}</h2>
        <p className="text-sm text-slate-600">{t.noActiveRescue}</p>
        <button
          type="button"
          onClick={onRequestRescue}
          className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-sky-900 rounded-md inline-flex items-center gap-1.5 cursor-pointer"
        >
          <LifeBuoy className="w-4 h-4" />
          <span>{t.requestRescueBtn}</span>
        </button>
      </section>
    );
  }

  const isAdmin = account === 'admin';
  const assignedBoats = isAdmin
    ? boats.filter((b) => activeCase.assignedBoatIds.includes(b.id))
    : residentSummary.assignedBoats;

  const individualStatus =
    lang === 'en' ? formatFamilyMemberStatus(activeCase) : formatCaseStatus(lang, activeCase.status);

  const translatedSummary = isAdmin
    ? `${assignedBoats.length} boat(s) assigned`
    : formatBoatSummary(
        lang,
        residentSummary.assignedBoats.length,
        residentSummary.onTheWayCount,
        residentSummary.preparingCount,
        residentSummary.arrivedCount
      );

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLandmark.trim()) return;
    onReportLocationChange(
      activeCase.id,
      newLandmark.trim(),
      confirmedBy.trim() || 'Family update',
      useTappedCoords && tappedLocation ? tappedLocation : undefined
    );
    setFeedbackMsg(
      isOnline
        ? `Updated pickup spot to "${newLandmark.trim()}".`
        : 'Saved offline as a local draft.'
    );
    setNewLandmark('');
    setConfirmedBy('');
    setUseTappedCoords(false);
    setEditingLocation(false);
  };

  return (
    <section
      aria-label={t.myRescueTitle}
      className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#0F4C81]" />
            <span>
              {t.myRescueTitle} · {activeCase.reporterName}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mt-1">
            {t.pickupPointLabel} — {activeCase.pickupLandmark}
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-1 tabular-nums">
            {translatedSummary}
          </p>
        </div>

        {visibleCases.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="family-case-select" className="text-xs text-slate-600 whitespace-nowrap">
              Case:
            </label>
            <select
              id="family-case-select"
              value={activeCase.id}
              onChange={(e) => {
                onSelectCase(e.target.value);
                setFeedbackMsg(null);
              }}
              className="min-h-[40px] text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-700 max-w-[230px]"
            >
              {visibleCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.relationshipLabel} — {c.affectedPersonName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Individual Status Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-3.5 rounded-md bg-slate-50 border border-slate-200">
        <div className="flex items-start gap-2.5">
          {activeCase.status === 'picked_up' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <Clock className="w-5 h-5 text-[#0F4C81] shrink-0 mt-0.5" />
          )}
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {activeCase.relationshipLabel} ({activeCase.affectedPersonName}) — {individualStatus}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {activeCase.okuNeeds.length > 0
                ? activeCase.okuNeeds.join(' · ')
                : 'Standard boat boarding'}
              {activeCase.syncState === 'local_draft' && (
                <span className="text-amber-800 font-semibold"> · Local draft</span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingLocation((v) => !v);
            setNewLandmark(activeCase.pickupLandmark);
          }}
          className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-[#0F4C81] bg-white border border-slate-300 rounded-md hover:bg-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{editingLocation ? t.cancelBtn : t.updatePinBtn}</span>
        </button>
      </div>

      {feedbackMsg && (
        <div
          role="status"
          className={`px-3 py-2 rounded-md text-xs border ${
            isOnline
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {feedbackMsg}
        </div>
      )}

      {editingLocation && (
        <form
          onSubmit={handleLocationSubmit}
          className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3"
        >
          <div className="text-xs font-semibold text-slate-900">{t.updatePinBtn}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="changed-landmark" className="block text-xs text-slate-700 mb-1">
                {t.pickupPointLabel}
              </label>
              <input
                id="changed-landmark"
                type="text"
                required
                value={newLandmark}
                onChange={(e) => setNewLandmark(e.target.value)}
                placeholder="e.g. SK Taman Sri Muda East Gate"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="changed-confirmer" className="block text-xs text-slate-700 mb-1">
                Confirmed by
              </label>
              <input
                id="changed-confirmer"
                type="text"
                value={confirmedBy}
                onChange={(e) => setConfirmedBy(e.target.value)}
                placeholder="e.g. Neighbour Encik Razak"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-md"
              />
            </div>
          </div>

          {tappedLocation && (
            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={useTappedCoords}
                onChange={(e) => setUseTappedCoords(e.target.checked)}
              />
              <Crosshair className="w-3.5 h-3.5 text-[#0F4C81]" />
              <span>
                {t.useTappedPinBtn} ({tappedLocation.lat}, {tappedLocation.lng})
              </span>
            </label>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 text-xs font-medium text-white bg-[#0F4C81] hover:bg-sky-900 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isOnline ? 'Save update' : 'Save draft'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Boats Assigned List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Anchor className="w-3.5 h-3.5 text-[#0F4C81]" />
            <span>{t.assignedBoatsHeading}</span>
          </h3>
          {!isOnline && (
            <span className="text-xs text-amber-800 flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5" /> Offline
            </span>
          )}
        </div>

        {assignedBoats.length === 0 ? (
          <div className="text-xs text-slate-600 py-3 px-3 border border-slate-200 rounded-md bg-slate-50">
            {t.waitingForBoat}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
            {assignedBoats.map((boat) => (
              <li
                key={boat.id}
                className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Anchor className="w-3.5 h-3.5 text-[#0F4C81] shrink-0" />
                  <span className="font-semibold text-slate-900">{boat.name}</span>
                  <span className="text-slate-400">·</span>
                  <span
                    className={`font-medium ${
                      boat.status === 'arrived'
                        ? 'text-emerald-800'
                        : boat.status === 'on_the_way'
                        ? 'text-sky-900'
                        : 'text-amber-800'
                    }`}
                  >
                    {formatBoatStatus(lang, boat.status)}
                  </span>
                  {boat.eta && (
                    <>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono tabular-nums text-slate-700">
                        {t.crewEtaLabel}: {boat.eta}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-slate-500 font-mono tabular-nums">
                  {t.lastUpdateLabel}: {boat.lastUpdatedAt}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Updates to Family */}
      <div className="border-t border-slate-100 pt-3 space-y-2">
        <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-[#0F4C81]" />
          <span>{t.updatesFromTeamHeading}</span>
        </div>
        <ul className="space-y-1.5">
          {activeCase.familyUpdates.slice(-3).map((msg) => (
            <li
              key={msg.id}
              className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded px-3 py-2"
            >
              <span className="font-mono tabular-nums text-slate-500">{msg.timestamp}</span>{' '}
              <span className="font-semibold text-slate-900">{msg.sender}:</span> {msg.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Privacy Notice */}
      <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
        <Lock className="w-3 h-3 shrink-0" />
        <span>{t.privacyFooterUser}</span>
      </div>
    </section>
  );
};
