import React from 'react';
import {
  ArrowRight,
  Lock,
  ShieldCheck,
  Users,
  WifiOff,
  Zap,
} from 'lucide-react';
import {
  DemoRole,
  DrillBaseline,
  DrillEvent,
  LanguageCode,
  RescueCase,
} from '../types/rescue';
import { computeDrillComparison, type DrillComparisonResult } from '../utils/rescueLogic';
import { DEMO_AREA_INFO } from '../data/seedData';
import { TRANSLATIONS } from '../i18n/translations';

const NOT_MEASURED = 'Not measured yet';

function headlineText(headline: DrillComparisonResult['headline']): string {
  if (!headline) return 'Verification time not measured yet';
  if (headline.direction === 'faster') {
    return `${headline.percent}% faster pickup verification than the paper baseline`;
  }
  if (headline.direction === 'slower') {
    return `${headline.percent}% slower than the paper baseline`;
  }
  return 'Same verification time as the paper baseline';
}

function headlineClass(headline: DrillComparisonResult['headline']): string {
  if (headline?.direction === 'faster') return 'text-emerald-800';
  if (headline?.direction === 'slower') return 'text-rose-800';
  return 'text-slate-600';
}

interface DrillBenchmarkViewProps {
  lang: LanguageCode;
  cases: RescueCase[];
  drillEvents: DrillEvent[];
  baseline: DrillBaseline;
  onUpdateBaseline: (next: DrillBaseline) => void;
  onTriggerDemoScenario: (
    scenario: 'continuity' | 'rapid_response' | 'data_protection' | 'community_support'
  ) => void;
  currentRole: DemoRole;
  isOnline: boolean;
}

export const DrillBenchmarkView: React.FC<DrillBenchmarkViewProps> = ({
  lang,
  cases,
  drillEvents,
  baseline,
  onUpdateBaseline,
  onTriggerDemoScenario,
}) => {
  const t = TRANSLATIONS[lang];
  const comparison = computeDrillComparison(cases, drillEvents, baseline);
  const { digitalVerify, digitalAssignments, digitalPickups, headline } = comparison;
  const verifyValueClass =
    headline?.direction === 'faster'
      ? 'font-mono tabular-nums font-semibold text-emerald-800'
      : headline?.direction === 'slower'
        ? 'font-mono tabular-nums font-semibold text-rose-800'
        : 'font-mono tabular-nums font-semibold text-slate-700';
  const countValueClass = 'font-mono tabular-nums font-semibold text-emerald-800';
  const notMeasuredClass = 'text-slate-500 italic';

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
        <div className="text-xs text-slate-500">
          {DEMO_AREA_INFO.nationalContext} · Shah Alam, Selangor
        </div>
        <h2 className="text-xl font-semibold text-slate-900">
          {t.drillHeading}
        </h2>
        <p className="text-sm text-slate-600 max-w-3xl">
          {t.drillSub}
        </p>
      </section>

      <section
        aria-label="Paper-and-phone drill comparison"
        className="bg-white border border-slate-200 rounded-lg overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Before-and-After Drill Comparison (3 Measures)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit baseline numbers after running a live district drill.
            </p>
          </div>
          <span className={`text-xs font-mono tabular-nums font-medium ${headlineClass(headline)}`}>
            {headlineText(headline)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <th className="py-3 px-5 font-semibold">Drill Measure</th>
                <th className="py-3 px-5 font-semibold">Paper-and-Phone Drill (Baseline)</th>
                <th className="py-3 px-5 font-semibold">Flood Rescue Map Malaysia (Demo)</th>
                <th className="py-3 px-5 font-semibold">Operational Mechanism</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              <tr>
                <td className="py-3.5 px-5 font-medium text-slate-900">
                  1. Time to verify the pickup point
                </td>
                <td className="py-3.5 px-5 font-mono tabular-nums text-slate-700">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={180}
                      aria-label="Paper drill verify minutes"
                      value={baseline.paperVerifyMinutes}
                      onChange={(e) =>
                        onUpdateBaseline({
                          ...baseline,
                          paperVerifyMinutes: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-xs font-mono tabular-nums"
                    />
                    <span>min</span>
                  </div>
                </td>
                <td className={`py-3.5 px-5 ${digitalVerify ? verifyValueClass : notMeasuredClass}`}>
                  {digitalVerify
                    ? `${digitalVerify.minutes} min (${digitalVerify.requestsMeasured} ${
                        digitalVerify.requestsMeasured === 1 ? 'request' : 'requests'
                      } verified in this session)`
                    : `${NOT_MEASURED}. Submit a rescue request, then verify its pickup point in Boat Dispatch & Pickup Cases.`}
                </td>
                <td className="py-3.5 px-5 text-slate-600 text-xs">
                  Separate callback contact, neighbour confirmation notes, and movable pickup pin.
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-5 font-medium text-slate-900">
                  2. Duplicate or second-destination assignments blocked
                </td>
                <td className="py-3.5 px-5 font-mono tabular-nums text-slate-700">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      aria-label="Paper drill duplicate assignments"
                      value={baseline.paperDuplicateAssignments}
                      onChange={(e) =>
                        onUpdateBaseline({
                          ...baseline,
                          paperDuplicateAssignments: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-xs font-mono tabular-nums"
                    />
                    <span>incidents</span>
                  </div>
                </td>
                <td className={`py-3.5 px-5 ${digitalAssignments ? countValueClass : notMeasuredClass}`}>
                  {digitalAssignments
                    ? `${digitalAssignments.blocked} blocked of ${digitalAssignments.attempts} assignment attempts`
                    : NOT_MEASURED}
                </td>
                <td className="py-3.5 px-5 text-slate-600 text-xs">
                  Prevents assigning one boat to two active destinations at once or dispatching to unverified pins.
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-5 font-medium text-slate-900">
                  3. Pickup confirmations blocked (no assigned boat marked arrived)
                </td>
                <td className="py-3.5 px-5 font-mono tabular-nums text-slate-700">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      aria-label="Paper drill false rescued households"
                      value={baseline.paperFalseRescuedCount}
                      onChange={(e) =>
                        onUpdateBaseline({
                          ...baseline,
                          paperFalseRescuedCount: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-xs font-mono tabular-nums"
                    />
                    <span>households</span>
                  </div>
                </td>
                <td className={`py-3.5 px-5 ${digitalPickups ? countValueClass : notMeasuredClass}`}>
                  {digitalPickups
                    ? `${digitalPickups.blocked} blocked of ${digitalPickups.attempts} pickup confirmations`
                    : NOT_MEASURED}
                </td>
                <td className="py-3.5 px-5 text-slate-600 text-xs">
                  &ldquo;Boat arrived&rdquo; and individual &ldquo;Person picked up&rdquo; are strictly separate actions.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Competition judge scenarios" className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900">
          Interactive Competition Judge Demonstrations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <WifiOff className="w-4 h-4 text-amber-700" />
                <span>1. Offline Continuity &amp; Waiting to Send</span>
              </div>
              <p className="text-xs text-slate-600">
                Simulate losing connectivity: saved cases and assignments remain readable, and reports are kept as Waiting to send (never marked delivered, never promising an offline basemap).
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTriggerDemoScenario('continuity')}
              className="min-h-[40px] self-start px-3 py-1.5 text-xs font-medium text-[#0F4C81] border border-sky-200 bg-sky-50 hover:bg-sky-100 rounded-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Demonstrate Offline Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Zap className="w-4 h-4 text-rose-700" />
                <span>2. Priority Facts &amp; Boat Destination Lock</span>
              </div>
              <p className="text-xs text-slate-600">
                Assign Boat 15 to the verified Jalan Jasa shoplots request, check that unverified Kampung Kebun Bunga has an owner and follow-up time, then confirm a boat cannot be sent to two active destinations at once.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTriggerDemoScenario('rapid_response')}
              className="min-h-[40px] self-start px-3 py-1.5 text-xs font-medium text-[#0F4C81] border border-sky-200 bg-sky-50 hover:bg-sky-100 rounded-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open Rescue Coordinator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Lock className="w-4 h-4 text-slate-700" />
                <span>3. Public Map Privacy Protection</span>
              </div>
              <p className="text-xs text-slate-600">
                View the Resident &amp; Family map where personal contacts and precise addresses of other households are hidden, then switch to Rescue Coordinator.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTriggerDemoScenario('data_protection')}
              className="min-h-[40px] self-start px-3 py-1.5 text-xs font-medium text-[#0F4C81] border border-sky-200 bg-sky-50 hover:bg-sky-100 rounded-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Inspect Resident &amp; Family Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>4. Family-Assisted OKU Request</span>
              </div>
              <p className="text-xs text-slate-600">
                Submit a rescue request for an elderly/OKU relative from another town without needing their GPS or phone account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTriggerDemoScenario('community_support')}
              className="min-h-[40px] self-start px-3 py-1.5 text-xs font-medium text-[#0F4C81] border border-sky-200 bg-sky-50 hover:bg-sky-100 rounded-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open Family-Assisted Form</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-center gap-2 text-xs text-slate-700">
        <ShieldCheck className="w-4 h-4 text-[#0F4C81] shrink-0" />
        <span>
          Student competition prototype (zero paid APIs/databases) · Uses OpenStreetMap via Leaflet · Does not contact real emergency services.
        </span>
      </section>
    </div>
  );
};
