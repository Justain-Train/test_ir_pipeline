import { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { EntityPill } from '@/components/ui/EntityPill';
import { SectionLabel } from '@/components/ui/SectionLabel';

type RiskLevel = 'high' | 'medium' | 'low';
type EntityType = 'condition' | 'medication' | 'symptom';

interface RiskAlert {
  label: string;
  level: RiskLevel;
}

interface Entity {
  label: string;
  type: EntityType;
}

interface Trend {
  text: string;
  count: number;
}

interface RelatedRecord {
  id: string;
  date: string;
  summary: string;
  provider: string;
}

// ── Shared Data ────────────────────────────────────────────────────────────
const patient = {
  name: 'Jack Taylor',
  age: 54,
  id: 'PT-00482',
  status: 'Stable'
};

const summary = {
  chiefComplaint: 'Persistent chest tightness and shortness of breath on exertion',
  keySymptoms: ['Dyspnea', 'Chest tightness', 'Ankle swelling', 'Fatigue'],
  duration: '~3 weeks, worsening past 5 days',
  relevantHistory: 'HTN (2018), Type 2 DM (2020), prior MI (2022). On metformin, lisinopril, aspirin.'
};

const riskAlerts: RiskAlert[] = [
  { label: 'Cardiac Event Risk', level: 'high' },
  { label: 'Fluid Retention', level: 'medium' },
  { label: 'Drug Interaction', level: 'medium' }
];

const entities: Entity[] = [
  { label: 'Hypertension', type: 'condition' },
  { label: 'Type 2 Diabetes', type: 'condition' },
  { label: 'Myocardial Infarction', type: 'condition' },
  { label: 'Metformin', type: 'medication' },
  { label: 'Lisinopril', type: 'medication' },
  { label: 'Aspirin', type: 'medication' },
  { label: 'Dyspnea', type: 'symptom' },
  { label: 'Chest Tightness', type: 'symptom' },
  { label: 'Fatigue', type: 'symptom' }
];

const trends: Trend[] = [
  { text: 'Dyspnea mentioned', count: 4 },
  { text: 'Chest tightness mentioned', count: 3 },
  { text: 'Ankle swelling (new)', count: 1 }
];

const relatedRecords: RelatedRecord[] = [
  {
    id: 'S-2024-1108',
    date: 'Nov 8, 2024',
    summary: 'Follow-up: BP management, metformin dosage adjusted.',
    provider: 'Dr. Patel'
  },
  {
    id: 'S-2024-0921',
    date: 'Sep 21, 2024',
    summary: 'Routine check. Labs ordered. A1C stable at 7.1.',
    provider: 'Dr. Patel'
  },
  {
    id: 'S-2024-0603',
    date: 'Jun 3, 2024',
    summary: 'Chest discomfort workup. ECG normal. Echo scheduled.',
    provider: 'Dr. Singh'
  }
];

const transcript = `[00:01] Dr. Patel: Good morning, Jack. How have you been feeling since your last visit?
[00:08] Patient: Not great, honestly. I've been having this tightness in my chest, especially when I walk upstairs or do anything strenuous.
[00:21] Dr. Patel: When did this start? Is it constant or does it come and go?
[00:28] Patient: It comes and goes. Started maybe three weeks ago but it's been getting worse the past few days. I also noticed my ankles look a bit puffy in the evening.
[00:44] Dr. Patel: Any shortness of breath? Night sweats or palpitations?
[00:50] Patient: Yeah, some shortness of breath. No sweats though. Heart feels normal to me.
[01:02] Dr. Patel: I want to run an ECG today and order a BNP panel given your history. Are you taking your lisinopril every day?
[01:14] Patient: Yes, every morning with breakfast.`;

// ── Expanded Full Detail Panel ─────────────────────────────────────────────
function ExpandedDetail() {
  const [activeRecord, setActiveRecord] = useState<string | null>(null);

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
      {/* AI Summary */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded bg-violet-100 flex items-center justify-center">
            <svg
              className="w-2.5 h-2.5 text-violet-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
          <span className="text-xs font-semibold text-slate-700">Full Session Summary</span>
          <span className="ml-auto text-caption text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
            AI-generated
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {[
            { label: 'Chief Complaint', value: summary.chiefComplaint },
            { label: 'Duration', value: summary.duration },
            { label: 'Relevant History', value: summary.relevantHistory }
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-label text-slate-400 mb-0.5">{label}</p>
              <p className="text-xs text-slate-700 leading-relaxed">{value}</p>
            </div>
          ))}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-label text-slate-400 mb-1.5">Key Symptoms</p>
            <div className="flex flex-wrap gap-1.5">
              {summary.keySymptoms.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-xs text-slate-600"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Key Entities */}
      <div>
        <SectionLabel>Key Entities</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {entities.map((e) => (
            <EntityPill key={e.label} {...e} />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50">
          {(['condition', 'medication', 'symptom'] as EntityType[]).map((t) => {
            const colors: Record<EntityType, string> = {
              condition: 'bg-violet-200',
              medication: 'bg-blue-200',
              symptom: 'bg-slate-300'
            };
            return (
              <span key={t} className="flex items-center gap-1.5 text-caption text-slate-400 capitalize">
                <span className={`w-2 h-2 rounded-sm ${colors[t]}`} />
                {t}
              </span>
            );
          })}
        </div>
      </div>

      {/* Trends + Related Records */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <SectionLabel>Trends</SectionLabel>
          <ul className="space-y-2">
            {trends.map((t) => (
              <li key={t.text} className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{t.text}</span>
                <span className="text-xs font-semibold text-slate-400 tabular-nums">×{t.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionLabel>Related Records</SectionLabel>
          <ul className="space-y-1.5">
            {relatedRecords.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setActiveRecord(activeRecord === r.id ? null : r.id)}
                  className={`w-full text-left rounded-xl border px-3 py-2 transition-all duration-150 ${
                    activeRecord === r.id
                      ? 'border-violet-200 bg-violet-50'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-slate-700">{r.date}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace" }} className="text-caption text-slate-400">
                      {r.id}
                    </span>
                  </div>
                  <p className="text-caption text-slate-500 leading-snug line-clamp-2">{r.summary}</p>
                  {activeRecord === r.id && (
                    <p className="text-caption text-violet-600 mt-1 font-medium">{r.provider}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Transcript */}
      <div>
        <SectionLabel>Transcript Preview</SectionLabel>
        <div className="relative rounded-xl bg-slate-50 border border-slate-100 overflow-hidden" style={{ maxHeight: 148 }}>
          <div
            className="overflow-y-auto p-3"
            style={{
              maxHeight: 148,
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              lineHeight: 1.7,
              color: '#94a3b8',
              scrollbarWidth: 'none'
            }}
          >
            {transcript.split('\n').map((line, i) => (
              <p key={i} className={line.includes('Dr.') ? 'text-slate-500' : 'text-slate-400'}>
                {line}
              </p>
            ))}
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, rgb(248 250 252))' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Collapsed Summary Card ─────────────────────────────────────────────────
export function PatientRecordCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white rounded-2xl border mb-10 shadow-sm transition-shadow duration-200"
      style={{
        borderColor: expanded ? 'rgb(196 181 253)' : 'rgb(226 232 240)',
        boxShadow: expanded ? '0 4px 12px rgb(196 181 253 / 0.1)' : 'none'
      }}
    >
      <div className="p-5">
        {/* ── Patient Header ─────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-sm select-none">
              {patient.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 leading-tight">{patient.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Age {patient.age}&ensp;·&ensp;
                <span style={{ fontFamily: "'DM Mono', monospace" }}>{patient.id}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={patient.status} />
          </div>
        </div>

        {/* ── Risk Alerts ────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {riskAlerts.map((r) => (
            <RiskBadge key={r.label} {...r} />
          ))}
        </div>

        {/* ── Collapsed Summary Grid ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-label text-slate-400 mb-0.5">Chief Complaint</p>
            <p className="text-xs text-slate-700 leading-relaxed">{summary.chiefComplaint}</p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-label text-slate-400 mb-1.5">Key Symptoms</p>
            <div className="flex flex-wrap gap-1">
              {summary.keySymptoms.map((s) => (
                <span
                  key={s}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-label text-slate-400 mb-0.5">Duration</p>
            <p className="text-xs text-slate-700">{summary.duration}</p>
            <p className="text-label text-slate-400 mt-2 mb-0.5">Relevant History</p>
            <p className="text-caption text-slate-500 leading-snug line-clamp-2">
              {summary.relevantHistory}
            </p>
          </div>
        </div>

        {/* ── Expand Toggle ──────────────────────────────────── */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 transition-all duration-150 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          {expanded ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
              Collapse
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
              View Full Record
            </>
          )}
        </button>

        {/* ── Expanded Detail ────────────────────────────────── */}
        {expanded && <ExpandedDetail />}
      </div>
    </div>
  );
}
