import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CloudLightning,
  Lock,
  Mountain,
  Navigation,
  ShieldAlert,
  Users,
  Waves,
} from 'lucide-react';
import {
  AreaInstruction,
  BoatUnit,
  CommandIncident,
  CommandTask,
  DemoAccountId,
  FloodSubScenario,
  HazardSeverity,
  HazardZone,
  OfficialWarning,
  PPSCenter,
  RescueCase,
  RoadClosure,
  TaskStage,
  VerifiedEvacuationRoute,
} from '../types/rescue';
import {
  getProcedureTemplateKey,
  PROCEDURE_TEMPLATES,
} from '../data/seedData';
import { getHazardSeverityLabel } from '../utils/rescueLogic';

interface CommandCentrePanelProps {
  account: DemoAccountId;
  onSwitchAccount: (account: DemoAccountId) => void;
  incidents: CommandIncident[];
  selectedIncidentId: string;
  onSelectIncident: (id: string) => void;
  tasks: CommandTask[];
  officialWarnings: OfficialWarning[];
  hazardZones: HazardZone[];
  routes: VerifiedEvacuationRoute[];
  roadClosures: RoadClosure[];
  ppsCenters: PPSCenter[];
  areaInstructions: AreaInstruction[];
  cases: RescueCase[];
  boats: BoatUnit[];
  onVerifyIncident: (incidentId: string) => void;
  onUpdateIncidentSteps: (
    incidentId: string,
    steps: string[],
    floodScenario?: FloodSubScenario
  ) => void;
  onCreateTask: (payload: {
    incidentId: string;
    title: string;
    location: string;
    namedTeam: string;
    requiredEquipment: string;
    nextUpdateTime: string;
    isPumpTask?: boolean;
    linkedRoadId?: string;
  }) => void;
  onAdvanceTask: (
    taskId: string,
    nextStage: TaskStage,
    crewNote: string,
    confirmPumpReopen?: boolean
  ) => void;
  onUpdateZoneSeverity: (
    zoneId: string,
    severity: HazardSeverity,
    reason: string
  ) => void;
  onPublishInstruction: (payload: {
    zoneId: string;
    areaName: string;
    headline: string;
    whatToDo: string;
    whereToGoOrWait: string;
    waitingForRescueNote: string;
    independentTravelNote: string;
    urgent: boolean;
  }) => void;
  onCloseRoadSegment: (roadId: string, reason: string) => void;
  onReopenRoadSegment: (roadId: string) => { ok: boolean; error?: string };
  onApproveOrWithdrawRoute: (
    routeId: string,
    action: 'approve' | 'withdraw',
    confirm: {
      destinationPpsOpenConfirmed: boolean;
      routeFieldCheckedConfirmed: boolean;
      reason?: string;
    }
  ) => { ok: boolean; error?: string };
  onUpdatePpsStatus: (
    ppsId: string,
    status: PPSCenter['status'],
    acceptingArrivals: boolean
  ) => void;
  onShowIncidentOnMap: (incident: CommandIncident) => void;
  onShowRouteOnMap: (routeId: string) => void;
}

const TASK_STAGES: { id: TaskStage; label: string }[] = [
  { id: 'assigned', label: 'Assigned' },
  { id: 'acknowledged', label: 'Acknowledged' },
  { id: 'on_site', label: 'On site' },
  { id: 'completed', label: 'Completed' },
];

export const CommandCentrePanel: React.FC<CommandCentrePanelProps> = ({
  account,
  onSwitchAccount,
  incidents,
  selectedIncidentId,
  onSelectIncident,
  tasks,
  officialWarnings,
  hazardZones,
  routes,
  roadClosures,
  ppsCenters,
  areaInstructions,
  cases,
  onVerifyIncident,
  onUpdateIncidentSteps,
  onCreateTask,
  onAdvanceTask,
  onUpdateZoneSeverity,
  onPublishInstruction,
  onCloseRoadSegment,
  onReopenRoadSegment,
  onApproveOrWithdrawRoute,
  onUpdatePpsStatus,
  onShowIncidentOnMap,
  onShowRouteOnMap,
}) => {
  const activeIncident =
    incidents.find((i) => i.id === selectedIncidentId) ?? incidents[0];

  const [activeAction, setActiveAction] = useState<
    'verify' | 'assign_team' | 'issue_instruction' | 'review_progress'
  >('verify');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null
  );

  // Editable procedure state
  const [stepsDraft, setStepsDraft] = useState<string>(
    activeIncident?.procedureSteps.join('\n') ?? ''
  );
  const [scenarioDraft, setScenarioDraft] = useState<FloodSubScenario>(
    activeIncident?.floodScenario ?? 'stranded_evacuation'
  );

  // Zone severity form
  const linkedZone =
    hazardZones.find((z) => z.id === activeIncident?.linkedZoneId) ??
    hazardZones[0];
  const [zoneSeverityDraft, setZoneSeverityDraft] = useState<HazardSeverity>(
    linkedZone?.severity ?? 'high'
  );
  const [zoneReasonDraft, setZoneReasonDraft] = useState<string>(
    linkedZone?.reason ?? ''
  );

  // Assign Team task form
  const [taskTitleDraft, setTaskTitleDraft] = useState<string>('');
  const [taskLocationDraft, setTaskLocationDraft] = useState<string>('');
  const [taskTeamDraft, setTaskTeamDraft] = useState<string>('Boat 12 — En. Haziq');
  const [taskEquipDraft, setTaskEquipDraft] = useState<string>(
    'Portable pump, life jackets, depth gauge'
  );
  const [taskNextUpdateDraft, setTaskNextUpdateDraft] = useState<string>('3:15 PM');
  const [taskIsPump, setTaskIsPump] = useState<boolean>(false);
  const [taskRoadId, setTaskRoadId] = useState<string>('road-sepadu-east');

  // Task progress note drafts
  const [crewNotes, setCrewNotes] = useState<Record<string, string>>({});

  // Issue area instruction form
  const existingInstr = areaInstructions.find((i) => i.zoneId === linkedZone?.id);
  const [instrHeadline, setInstrHeadline] = useState<string>(
    existingInstr?.headline ?? ''
  );
  const [instrWhatToDo, setInstrWhatToDo] = useState<string>(
    existingInstr?.whatToDo ?? ''
  );
  const [instrWhereWait, setInstrWhereWait] = useState<string>(
    existingInstr?.whereToGoOrWait ?? 'PPS SK Taman Sri Muda (Hall A)'
  );
  const [instrWaitingNote, setInstrWaitingNote] = useState<string>(
    existingInstr?.waitingForRescueNote ??
      'Wait at the confirmed school entrance and monitor your assigned boat status.'
  );
  const [instrIndependentNote, setInstrIndependentNote] = useState<string>(
    existingInstr?.independentTravelNote ??
      'Follow the verified approach arrows only if dry and safe.'
  );
  const [instrUrgent, setInstrUrgent] = useState<boolean>(
    existingInstr?.urgent ?? true
  );

  // Route approval checkboxes
  const [ppsOpenChecked, setPpsOpenChecked] = useState<Record<string, boolean>>({});
  const [routeChecked, setRouteChecked] = useState<Record<string, boolean>>({});
  const [roadCloseReason, setRoadCloseReason] = useState<string>(
    'Waterlogged >0.6 m blocking shelter approach (Demo)'
  );

  useEffect(() => {
    if (!activeIncident) return;
    setStepsDraft(activeIncident.procedureSteps.join('\n'));
    setScenarioDraft(activeIncident.floodScenario ?? 'stranded_evacuation');
    setTaskLocationDraft(activeIncident.areaName);
    setTaskTitleDraft(
      activeIncident.incidentType === 'landslide'
        ? 'Slope & diversion technical assessment'
        : activeIncident.floodScenario === 'road_waterlogged'
        ? 'Drainage & pump deployment check'
        : 'Field check & resident evacuation support'
    );
    setTaskIsPump(activeIncident.floodScenario === 'road_waterlogged');
    if (activeIncident.linkedRoadId) {
      setTaskRoadId(activeIncident.linkedRoadId);
    }
  }, [activeIncident?.id]);

  useEffect(() => {
    if (!linkedZone) return;
    setZoneSeverityDraft(linkedZone.severity);
    setZoneReasonDraft(linkedZone.reason);
    const instr = areaInstructions.find((i) => i.zoneId === linkedZone.id);
    if (instr) {
      setInstrHeadline(instr.headline);
      setInstrWhatToDo(instr.whatToDo);
      setInstrWhereWait(instr.whereToGoOrWait);
      setInstrWaitingNote(instr.waitingForRescueNote);
      setInstrIndependentNote(instr.independentTravelNote);
      setInstrUrgent(instr.urgent);
    }
  }, [linkedZone?.id]);

  if (account !== 'admin') {
    return (
      <section className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
        <div className="w-11 h-11 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-slate-700" />
        </div>
        <div className="max-w-lg mx-auto space-y-1.5">
          <h2 className="text-lg font-semibold text-slate-900">
            Government Command Centre Locked
          </h2>
          <p className="text-sm text-slate-600">
            Switch to Admin mode to manage incident triage, team tasks, road closures, shelters, and verified evacuation routes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSwitchAccount('admin')}
          className="min-h-[44px] px-5 py-2.5 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-sky-900 rounded-md cursor-pointer"
        >
          Switch to Admin
        </button>
      </section>
    );
  }

  const incidentTasks = tasks.filter(
    (t) => !activeIncident || t.incidentId === activeIncident.id
  );

  return (
    <div className="space-y-5">
      {/* Separate Official Warning Banner */}
      <section
        aria-label="Official warnings (separate from local evacuation decisions)"
        className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-[#0F4C81]" />
            <h2 className="text-sm font-semibold text-slate-900">
              Official River &amp; Weather Warnings (Separate from Local Evacuation Orders)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Demo scenario · Prompts review only
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {officialWarnings.map((w) => (
            <div
              key={w.id}
              className="border border-slate-200 rounded-md p-3 bg-slate-50/70 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between gap-2 font-semibold text-slate-900">
                <span>{w.title}</span>
                <span className="text-[#0F4C81] tabular-nums">{w.issuedAt}</span>
              </div>
              <div className="text-slate-700 font-medium">{w.reading} · {w.level}</div>
              <div className="text-slate-500">
                Source: {w.source} · Next update: {w.nextUpdateAt}
              </div>
              <p className="text-slate-600">{w.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Main Command Centre Split */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Government Command Centre (Shah Alam Demo)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assess incident status, run editable demo SOPs, assign tracked tasks, and publish field-checked directions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Incident Selector */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 divide-y divide-slate-100">
            <div className="px-4 py-2.5 bg-slate-50 text-xs font-semibold text-slate-600">
              Active Incidents ({incidents.length})
            </div>
            {incidents.map((inc) => {
              const isSelected = activeIncident?.id === inc.id;
              return (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => {
                    onSelectIncident(inc.id);
                    setFeedback(null);
                  }}
                  className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer block ${
                    isSelected ? 'bg-sky-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                      {inc.incidentType === 'landslide' ? (
                        <Mountain className="w-3.5 h-3.5 text-amber-800" />
                      ) : inc.incidentType === 'severe_weather' ? (
                        <CloudLightning className="w-3.5 h-3.5 text-slate-700" />
                      ) : (
                        <Waves className="w-3.5 h-3.5 text-[#2171B5]" />
                      )}
                      <span className="capitalize">{inc.incidentType.replace('_', ' ')}</span>
                    </span>
                    <span
                      className={
                        inc.severity === 'critical'
                          ? 'text-[#B71C1C] font-semibold'
                          : 'text-slate-600 font-medium'
                      }
                    >
                      {getHazardSeverityLabel(inc.severity)}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {inc.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2">
                    <span>{inc.areaName}</span>
                    <span>·</span>
                    <span className="tabular-nums">{inc.lastUpdate}</span>
                    <span>·</span>
                    <span>{inc.verified ? 'Verified' : 'Needs verification'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right 3 Coordinator Questions + 4 Actions */}
          <div className="lg:col-span-8 p-5 space-y-5">
            {activeIncident && (
              <>
                {/* Q1: What is happening here, how serious is it, and when was it last verified? */}
                <div className="space-y-3 border-b border-slate-200 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-[#0F4C81]">
                        1. Situation &amp; Verification
                      </span>
                      <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                        {activeIncident.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onShowIncidentOnMap(activeIncident)}
                      className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md cursor-pointer"
                    >
                      Show on map
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {activeIncident.reportedConditions}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-800">Source:</span>{' '}
                      {activeIncident.source}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Last verified:</span>{' '}
                      {activeIncident.lastVerifiedAt ?? 'Not yet verified'} (Update {activeIncident.lastUpdate})
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Affected area:</span>{' '}
                      {activeIncident.areaName} ({activeIncident.postcode})
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Responsible officer:</span>{' '}
                      {activeIncident.responsibleOfficer}
                    </div>
                  </div>
                </div>

                {/* Q2: What action should be considered, and who will carry it out? */}
                <div className="space-y-3 border-b border-slate-200 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#0F4C81]">
                      2. Suggested Demo Procedure &amp; Coordinator Actions
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Editable demonstration procedure — real deployment uses agency-approved SOPs
                    </span>
                  </div>

                  {activeIncident.incidentType === 'flooding' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor="flood-scenario-select" className="text-xs font-medium text-slate-700">
                        Flood scenario:
                      </label>
                      <select
                        id="flood-scenario-select"
                        value={scenarioDraft}
                        onChange={(e) => {
                          const next = e.target.value as FloodSubScenario;
                          setScenarioDraft(next);
                          const tpl =
                            PROCEDURE_TEMPLATES[
                              getProcedureTemplateKey('flooding', next)
                            ];
                          if (tpl) {
                            setStepsDraft(tpl.steps.join('\n'));
                            onUpdateIncidentSteps(activeIncident.id, tpl.steps, next);
                          }
                        }}
                        className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                      >
                        <option value="water_rising">
                          Water rising (no immediate danger)
                        </option>
                        <option value="road_waterlogged">
                          Road waterlogged (drainage &amp; pump)
                        </option>
                        <option value="stranded_evacuation">
                          People stranded / evacuation approved
                        </option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <textarea
                      aria-label="Editable procedure steps"
                      rows={3}
                      value={stepsDraft}
                      onChange={(e) => setStepsDraft(e.target.value)}
                      className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#0F4C81]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const parsed = stepsDraft
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          onUpdateIncidentSteps(
                            activeIncident.id,
                            parsed,
                            activeIncident.incidentType === 'flooding'
                              ? scenarioDraft
                              : undefined
                          );
                          setFeedback({
                            ok: true,
                            msg: 'Demo procedure steps updated for this incident.',
                          });
                        }}
                        className="min-h-[34px] px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md cursor-pointer"
                      >
                        Save procedure edits
                      </button>
                    </div>
                  </div>

                  {/* Four Coordinator Actions */}
                  <div
                    role="tablist"
                    aria-label="Coordinator actions"
                    className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1"
                  >
                    {(
                      [
                        ['verify', 'Verify report'],
                        ['assign_team', 'Assign team'],
                        ['issue_instruction', 'Issue area instruction'],
                        ['review_progress', 'Review progress'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={activeAction === key}
                        onClick={() => {
                          setActiveAction(key);
                          setFeedback(null);
                        }}
                        className={`min-h-[42px] px-3 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                          activeAction === key
                            ? 'bg-[#0F4C81] text-white border-[#0F4C81]'
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {feedback && (
                    <div
                      role="status"
                      className={`text-xs px-3 py-2 rounded-md border ${
                        feedback.ok
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50 border-amber-300 text-amber-900'
                      }`}
                    >
                      {feedback.msg}
                    </div>
                  )}

                  {/* Action Panel 1: Verify report & Severity assessment */}
                  {activeAction === 'verify' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          Verify Incident &amp; Hazard Severity Assessment
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onVerifyIncident(activeIncident.id);
                            setFeedback({
                              ok: true,
                              msg: `Verified "${activeIncident.title}" with current timestamp.`,
                            });
                          }}
                          className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                          Mark Report Verified
                        </button>
                      </div>

                      {linkedZone && (
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <div className="text-xs font-medium text-slate-700">
                            Area Hazard Level: {linkedZone.name} (Changing severity does NOT auto-issue evacuation)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              aria-label="Zone hazard severity"
                              value={zoneSeverityDraft}
                              onChange={(e) =>
                                setZoneSeverityDraft(e.target.value as HazardSeverity)
                              }
                              className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                            >
                              <option value="low">Low</option>
                              <option value="moderate">Moderate</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                              <option value="unknown">Unknown / Outdated</option>
                            </select>
                            <input
                              type="text"
                              aria-label="Severity reason"
                              value={zoneReasonDraft}
                              onChange={(e) => setZoneReasonDraft(e.target.value)}
                              placeholder="Reason for assessment"
                              className="sm:col-span-2 h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateZoneSeverity(
                                linkedZone.id,
                                zoneSeverityDraft,
                                zoneReasonDraft
                              );
                              setFeedback({
                                ok: true,
                                msg: `Updated ${linkedZone.areaName} severity to ${getHazardSeverityLabel(zoneSeverityDraft)}. No evacuation instruction auto-issued.`,
                              });
                            }}
                            className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-sky-900 rounded-md cursor-pointer"
                          >
                            Update Zone Severity
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Panel 2: Assign team (creates tracked task) */}
                  {activeAction === 'assign_team' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-2.5">
                      <div className="text-xs font-semibold text-slate-900">
                        Assign Named Team &amp; Equipment Task
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          aria-label="Task title"
                          value={taskTitleDraft}
                          onChange={(e) => setTaskTitleDraft(e.target.value)}
                          placeholder="Task title"
                          className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                        />
                        <input
                          type="text"
                          aria-label="Task location"
                          value={taskLocationDraft}
                          onChange={(e) => setTaskLocationDraft(e.target.value)}
                          placeholder="Location / junction"
                          className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                        />
                        <input
                          type="text"
                          aria-label="Named team"
                          value={taskTeamDraft}
                          onChange={(e) => setTaskTeamDraft(e.target.value)}
                          placeholder="Named team / boat"
                          className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                        />
                        <input
                          type="text"
                          aria-label="Required equipment"
                          value={taskEquipDraft}
                          onChange={(e) => setTaskEquipDraft(e.target.value)}
                          placeholder="Required equipment"
                          className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                        />
                        <input
                          type="text"
                          aria-label="Next update time"
                          value={taskNextUpdateDraft}
                          onChange={(e) => setTaskNextUpdateDraft(e.target.value)}
                          placeholder="Next update (e.g. 3:15 PM)"
                          className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                        />
                        <label className="inline-flex items-center gap-2 text-xs text-slate-700 px-1">
                          <input
                            type="checkbox"
                            checked={taskIsPump}
                            onChange={(e) => setTaskIsPump(e.target.checked)}
                          />
                          Pump task (requires field check to reopen road)
                        </label>
                      </div>
                      {taskIsPump && (
                        <select
                          aria-label="Linked road segment"
                          value={taskRoadId}
                          onChange={(e) => setTaskRoadId(e.target.value)}
                          className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md w-full"
                        >
                          {roadClosures.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.roadName}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!taskTitleDraft.trim() || !taskTeamDraft.trim()) return;
                          onCreateTask({
                            incidentId: activeIncident.id,
                            title: taskTitleDraft.trim(),
                            location: taskLocationDraft.trim() || activeIncident.areaName,
                            namedTeam: taskTeamDraft.trim(),
                            requiredEquipment: taskEquipDraft.trim() || 'Standard rescue kit',
                            nextUpdateTime: taskNextUpdateDraft.trim() || 'Next 30 mins',
                            isPumpTask: taskIsPump,
                            linkedRoadId: taskIsPump ? taskRoadId : undefined,
                          });
                          setFeedback({
                            ok: true,
                            msg: `Assigned "${taskTeamDraft.trim()}" to ${taskLocationDraft.trim() || activeIncident.areaName}.`,
                          });
                          setActiveAction('review_progress');
                        }}
                        className="min-h-[38px] px-4 py-1.5 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-sky-900 rounded-md cursor-pointer"
                      >
                        Authorise &amp; Assign Task
                      </button>
                    </div>
                  )}

                  {/* Action Panel 3: Issue area instruction */}
                  {activeAction === 'issue_instruction' && linkedZone && (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-2.5">
                      <div className="text-xs font-semibold text-slate-900">
                        3. Publish Resident Instruction for {linkedZone.areaName}
                      </div>
                      <input
                        type="text"
                        aria-label="Instruction headline"
                        value={instrHeadline}
                        onChange={(e) => setInstrHeadline(e.target.value)}
                        placeholder="Short clear headline"
                        className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                      <textarea
                        rows={2}
                        aria-label="What residents should do"
                        value={instrWhatToDo}
                        onChange={(e) => setInstrWhatToDo(e.target.value)}
                        placeholder="What to do"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          aria-label="Where to go or wait"
                          value={instrWhereWait}
                          onChange={(e) => setInstrWhereWait(e.target.value)}
                          placeholder="Where to go or wait"
                          className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                        />
                        <label className="inline-flex items-center gap-2 text-xs text-slate-800 px-1">
                          <input
                            type="checkbox"
                            checked={instrUrgent}
                            onChange={(e) => setInstrUrgent(e.target.checked)}
                          />
                          Pin as urgent area instruction
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          aria-label="Waiting for rescue instruction"
                          value={instrWaitingNote}
                          onChange={(e) => setInstrWaitingNote(e.target.value)}
                          placeholder="For residents awaiting boat rescue"
                          className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                        />
                        <input
                          type="text"
                          aria-label="Independent travel instruction"
                          value={instrIndependentNote}
                          onChange={(e) => setInstrIndependentNote(e.target.value)}
                          placeholder="For independent travellers"
                          className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-md"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onPublishInstruction({
                            zoneId: linkedZone.id,
                            areaName: linkedZone.areaName,
                            headline: instrHeadline.trim() || `${linkedZone.name} instruction`,
                            whatToDo: instrWhatToDo.trim(),
                            whereToGoOrWait: instrWhereWait.trim(),
                            waitingForRescueNote: instrWaitingNote.trim(),
                            independentTravelNote: instrIndependentNote.trim(),
                            urgent: instrUrgent,
                          });
                          setFeedback({
                            ok: true,
                            msg: `Published resident instruction for ${linkedZone.areaName}.`,
                          });
                        }}
                        className="min-h-[38px] px-4 py-1.5 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-sky-900 rounded-md cursor-pointer"
                      >
                        Publish Instruction to Residents &amp; Guests
                      </button>
                    </div>
                  )}

                  {/* Action Panel 4: Review progress (Tasks + Household pickups) */}
                  {activeAction === 'review_progress' && (
                    <div className="space-y-3">
                      {incidentTasks.length === 0 ? (
                        <div className="text-xs text-slate-500 p-3 bg-slate-50 border border-slate-200 rounded-md">
                          No tasks assigned to this incident yet. Use "Assign team" above.
                        </div>
                      ) : (
                        incidentTasks.map((task) => (
                          <div
                            key={task.id}
                            className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-2.5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-semibold text-slate-900">
                                  {task.title}
                                </div>
                                <div className="text-[11px] text-slate-600 mt-0.5">
                                  {task.namedTeam} · {task.location} · Equipment: {task.requiredEquipment}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Authorised by {task.authorisedBy} ({task.authorisedAt}) · Next update: {task.nextUpdateTime}
                                </div>
                              </div>
                            </div>

                            {/* Stage progression */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {TASK_STAGES.map((st) => (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => {
                                    onAdvanceTask(
                                      task.id,
                                      st.id,
                                      crewNotes[task.id] ?? ''
                                    );
                                    setCrewNotes((prev) => ({ ...prev, [task.id]: '' }));
                                  }}
                                  className={`min-h-[32px] px-2.5 py-1 text-[11px] font-semibold rounded border cursor-pointer ${
                                    task.stage === st.id
                                      ? 'bg-[#0F4C81] text-white border-[#0F4C81]'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {st.label}
                                </button>
                              ))}
                              {task.isPumpTask && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onAdvanceTask(
                                      task.id,
                                      'completed',
                                      'Field confirmation: standing water drained below safe level',
                                      true
                                    );
                                    setFeedback({
                                      ok: true,
                                      msg: 'Pump field check confirmed. Linked road can now be reopened.',
                                    });
                                  }}
                                  className={`min-h-[32px] px-2.5 py-1 text-[11px] font-semibold rounded border cursor-pointer ${
                                    task.pumpFieldConfirmedToReopen
                                      ? 'bg-emerald-700 text-white border-emerald-700'
                                      : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                  }`}
                                >
                                  {task.pumpFieldConfirmedToReopen
                                    ? 'Pump clearance confirmed'
                                    : 'Confirm field clearance to reopen road'}
                                </button>
                              )}
                            </div>

                            <input
                              type="text"
                              value={crewNotes[task.id] ?? ''}
                              onChange={(e) =>
                                setCrewNotes((prev) => ({
                                  ...prev,
                                  [task.id]: e.target.value,
                                }))
                              }
                              placeholder="Optional crew log note before tapping stage..."
                              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded"
                            />

                            {/* Timestamped Audit Record */}
                            <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-200">
                              {task.auditLog.map((entry, idx) => (
                                <div key={idx}>
                                  <span className="font-mono text-slate-500">{entry.timestamp}</span>{' '}
                                  <span className="font-semibold">{entry.actor}:</span>{' '}
                                  {entry.note}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Q3: Road Closures, Shelters & Verified Evacuation Route Controls */}
                <div className="space-y-4">
                  <span className="text-[11px] font-semibold text-[#0F4C81]">
                    3. Roads, Shelters &amp; Verified Evacuation Directions
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Road Segment Closure Control */}
                    <div className="border border-slate-200 rounded-md p-3.5 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        Road Segments (Closing auto-withdraws affected routes)
                      </div>
                      <input
                        type="text"
                        aria-label="Road closure reason"
                        value={roadCloseReason}
                        onChange={(e) => setRoadCloseReason(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded"
                      />
                      <div className="space-y-2">
                        {roadClosures.map((road) => (
                          <div
                            key={road.id}
                            className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-slate-100 last:border-b-0"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">
                                {road.roadName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {road.closed ? 'Closed' : 'Open / Passable'} · {road.reportedAt}
                              </div>
                            </div>
                            {road.closed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const res = onReopenRoadSegment(road.id);
                                  setFeedback(
                                    res.ok
                                      ? { ok: true, msg: `Reopened ${road.roadName}.` }
                                      : { ok: false, msg: res.error ?? 'Cannot reopen yet.' }
                                  );
                                }}
                                className="min-h-[34px] px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded cursor-pointer shrink-0"
                              >
                                Reopen Road
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onCloseRoadSegment(road.id, roadCloseReason);
                                  setFeedback({
                                    ok: true,
                                    msg: `Marked "${road.roadName}" closed and withdrew dependent routes.`,
                                  });
                                }}
                                className="min-h-[34px] px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded cursor-pointer shrink-0"
                              >
                                Mark Closed
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shelter Status Control */}
                    <div className="border border-slate-200 rounded-md p-3.5 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                        <Building2 className="w-3.5 h-3.5 text-[#15803D]" />
                        PPS Shelters (Closing withdraws routes to shelter)
                      </div>
                      <div className="space-y-2">
                        {ppsCenters.map((pps) => (
                          <div
                            key={pps.id}
                            className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-slate-100 last:border-b-0"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">
                                {pps.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {pps.status} · {pps.acceptingArrivals ? 'Accepting arrivals' : 'Not accepting'} ({pps.occupancy}/{pps.capacity})
                              </div>
                            </div>
                            {pps.acceptingArrivals && pps.status !== 'Closed' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdatePpsStatus(pps.id, 'Closed', false);
                                  setFeedback({
                                    ok: true,
                                    msg: `Closed ${pps.name} and withdrew active routes to it.`,
                                  });
                                }}
                                className="min-h-[34px] px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded cursor-pointer shrink-0"
                              >
                                Stop Arrivals
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdatePpsStatus(pps.id, 'Open', true);
                                  setFeedback({
                                    ok: true,
                                    msg: `Reopened ${pps.name} for arrivals.`,
                                  });
                                }}
                                className="min-h-[34px] px-2.5 py-1 text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer shrink-0"
                              >
                                Set Open
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Verified Evacuation Routes Approval */}
                  <div className="border border-slate-200 rounded-md p-3.5 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                      <Navigation className="w-3.5 h-3.5 text-[#6D28D9]" />
                      Evacuation Routes (Purple arrows · Field check + Open PPS required)
                    </div>
                    <div className="space-y-3">
                      {routes.map((route) => {
                        const isApproved = route.status === 'approved';
                        return (
                          <div
                            key={route.id}
                            className="border border-slate-200 rounded-md p-3 bg-slate-50/70 space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-xs font-semibold text-slate-900">
                                  {route.title}
                                </div>
                                <div className="text-[11px] text-slate-600">
                                  Status:{' '}
                                  <span className="font-semibold capitalize">
                                    {route.status.replace('_', ' ')}
                                  </span>{' '}
                                  · Type: {route.routeType} · Verified: {route.lastVerifiedAt}
                                </div>
                                {route.withdrawnReason && (
                                  <div className="text-[11px] text-amber-800 mt-0.5">
                                    Withdrawn: {route.withdrawnReason}
                                  </div>
                                )}
                              </div>
                              {isApproved && (
                                <button
                                  type="button"
                                  onClick={() => onShowRouteOnMap(route.id)}
                                  className="min-h-[34px] px-2.5 py-1 text-[11px] font-semibold text-[#6D28D9] bg-purple-50 border border-purple-200 rounded cursor-pointer"
                                >
                                  Show on map
                                </button>
                              )}
                            </div>

                            {!isApproved ? (
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
                                  <label className="inline-flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(ppsOpenChecked[route.id])}
                                      onChange={(e) =>
                                        setPpsOpenChecked((prev) => ({
                                          ...prev,
                                          [route.id]: e.target.checked,
                                        }))
                                      }
                                    />
                                    Destination PPS is open
                                  </label>
                                  <label className="inline-flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(routeChecked[route.id])}
                                      onChange={(e) =>
                                        setRouteChecked((prev) => ({
                                          ...prev,
                                          [route.id]: e.target.checked,
                                        }))
                                      }
                                    />
                                    Route field-checked
                                  </label>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const res = onApproveOrWithdrawRoute(
                                      route.id,
                                      'approve',
                                      {
                                        destinationPpsOpenConfirmed: Boolean(
                                          ppsOpenChecked[route.id]
                                        ),
                                        routeFieldCheckedConfirmed: Boolean(
                                          routeChecked[route.id]
                                        ),
                                      }
                                    );
                                    setFeedback(
                                      res.ok
                                        ? { ok: true, msg: `Approved & published "${route.title}".` }
                                        : { ok: false, msg: res.error ?? 'Approval blocked.' }
                                    );
                                  }}
                                  className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-purple-800 rounded-md cursor-pointer"
                                >
                                  Approve &amp; Publish Route
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onApproveOrWithdrawRoute(route.id, 'withdraw', {
                                      destinationPpsOpenConfirmed: false,
                                      routeFieldCheckedConfirmed: false,
                                      reason: 'Withdrawn by coordinator for re-check',
                                    });
                                    setFeedback({
                                      ok: true,
                                      msg: `Withdrew "${route.title}". Residents see updated directions pending.`,
                                    });
                                  }}
                                  className="min-h-[34px] px-3 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer"
                                >
                                  Withdraw Route
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
