import React from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CloudLightning,
  Flame,
  MapPin,
  Mountain,
  Navigation,
  Ship,
  Waves,
  ZapOff,
} from 'lucide-react';
import { DemoAccountId } from '../types/rescue';
import { RoleAlertItem } from '../utils/rescueLogic';

interface AlertsSectionProps {
  account: DemoAccountId;
  alerts: RoleAlertItem[];
  onShowOnMap: (alert: RoleAlertItem) => void;
  onReviewCase?: (alert: RoleAlertItem) => void;
}

function renderAlertIcon(kind: RoleAlertItem['iconKind']) {
  const cls = 'w-4 h-4 shrink-0';
  switch (kind) {
    case 'flood':
      return <Waves className={`${cls} text-[#2171B5]`} />;
    case 'earthquake':
      return <Activity className={`${cls} text-[#A47142]`} />;
    case 'fire':
      return <Flame className={`${cls} text-[#F4511E]`} />;
    case 'landslide':
      return <Mountain className={`${cls} text-amber-800`} />;
    case 'weather':
      return <CloudLightning className={`${cls} text-slate-700`} />;
    case 'shelter':
      return <Building2 className={`${cls} text-[#15803D]`} />;
    case 'route':
      return <Navigation className={`${cls} text-[#6D28D9]`} />;
    case 'road':
      return <AlertTriangle className={`${cls} text-amber-700`} />;
    case 'boat':
      return <Ship className={`${cls} text-[#0F4C81]`} />;
    case 'pickup':
      return <CheckCircle2 className={`${cls} text-[#0F4C81]`} />;
    case 'power':
      return <ZapOff className={`${cls} text-amber-700`} />;
    default:
      return <MapPin className={`${cls} text-slate-700`} />;
  }
}

function getSeverityTextClass(tone: RoleAlertItem['severityTone']): string {
  switch (tone) {
    case 'critical':
      return 'text-[#B71C1C] font-semibold';
    case 'high':
      return 'text-[#C2410C] font-semibold';
    case 'moderate':
      return 'text-[#0F4C81] font-medium';
    case 'low':
      return 'text-[#15803D] font-medium';
    default:
      return 'text-slate-600 font-medium';
  }
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({
  account,
  alerts,
  onShowOnMap,
  onReviewCase,
}) => {
  return (
    <section
      aria-labelledby="alerts-section-heading"
      data-testid="alerts-section"
      className="bg-white border-t border-slate-200"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2
              id="alerts-section-heading"
              className="text-lg font-semibold text-slate-900 tracking-tight"
            >
              Alerts
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {account === 'guest'
                ? 'Public hazard areas, open shelters, road closures, and verified evacuation directions (Demo)'
                : account === 'resident'
                ? 'Public updates plus your pickup point, assigned boats, and arrival confirmations (Demo)'
                : 'All active incidents, rescue requests, teams, shelters, and route advisories (Demo)'}
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            {alerts.length} {alerts.length === 1 ? 'update' : 'updates'}
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 border border-slate-200 rounded-lg bg-slate-50">
            No current alerts for this view.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={`px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  alert.pinnedUrgent ? 'bg-slate-50/75' : 'bg-white'
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5">{renderAlertIcon(alert.iconKind)}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className={getSeverityTextClass(alert.severityTone)}>
                          {alert.severityLabel}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-600 truncate">{alert.location}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-500 tabular-nums">{alert.timestamp}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mt-0.5 leading-snug">
                        {alert.headline}
                      </h3>
                      {alert.detailLine && (
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {alert.detailLine}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-6 sm:pl-0">
                  {account === 'admin' && alert.actionKind === 'review_case' && onReviewCase && (
                    <button
                      type="button"
                      onClick={() => onReviewCase(alert)}
                      className="min-h-[40px] px-3 py-2 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-sky-900 rounded-lg whitespace-nowrap cursor-pointer"
                    >
                      Review case
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onShowOnMap(alert)}
                    className="min-h-[40px] px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    Show on map
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
