'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTeacherClasses, type ClassItem } from '@/actions/classes';
import { getSessionsByClass, type Session } from '@/actions/sessions';
import { getSessionStudentReports, getSessionSummaryReport } from '@/actions/reports';
import { PageContainer } from '@/components/layout/PageContainer';
import { TeacherReport } from '@/components/reports/TeacherReport';
import type {
  ClassOption,
  SessionOption,
  SummaryReportData,
  StudentReportRow,
  StudentDetailData,
  KeyQuestion,
} from '@/components/reports/TeacherReport';

/* ── 백엔드 원본 타입 ───────────────────────────────────────────────── */

interface RawStudentReport {
  id: number;
  session_id: number;
  student_id: string;
  content: {
    key_concepts?: { main_concepts?: string[]; weak_concepts?: string[] };
    misconception_summary?: string[];
    session_summary?: string;
    detailed_report?: string;
  } | null;
  created_at: string;
  users?: { id: string; name: string; email: string };
}

interface RawSessionReport {
  session_id: number;
  content: {
    // AI 서버 SessionAggregateReport 필드명
    class_summary?: string;
    weak_concepts_top5?: string[];
    detailed_report?: string;
    // 구버전 호환
    overall_summary?: string;
    top_weak_concepts?: string[];
    ai_report?: string;
    // 공통
    key_questions?: Array<string | { topic?: string; question: string }>;
  } | null;
}

interface SessionEntry {
  session: Session;
  cls: ClassItem;
}

/* ── 변환 함수 ──────────────────────────────────────────────────────── */

function parseQuestion(raw: string | { topic?: string; question: string }): KeyQuestion {
  if (typeof raw === 'object') return raw;
  const idx = raw.indexOf(':');
  if (idx > 0 && idx < 20) {
    return { topic: raw.slice(0, idx).trim(), question: raw.slice(idx + 1).trim() };
  }
  return { question: raw };
}

function toSummaryReportData(raw: RawSessionReport | null): SummaryReportData | null {
  if (!raw?.content) return null;
  const c = raw.content;
  return {
    overallSummary: c.class_summary ?? c.overall_summary ?? '',
    keyQuestions: (c.key_questions ?? []).map(parseQuestion),
    topWeakConcepts: c.weak_concepts_top5 ?? c.top_weak_concepts ?? [],
    aiReport: c.detailed_report ?? c.ai_report ?? '',
  };
}

function toStudentReportRow(sr: RawStudentReport): StudentReportRow {
  return {
    id: sr.id,
    studentId: sr.student_id,
    name: sr.users?.name ?? '학생',
    participation: 0,   // TODO: 백엔드 필드 연동 예정
    comprehension: 0,   // TODO: 백엔드 필드 연동 예정
    mainEmotion: '—',   // TODO: 백엔드 필드 연동 예정
    interventionCount: 0, // TODO: 백엔드 필드 연동 예정
  };
}

function toStudentDetailData(
  sr: RawStudentReport,
  sessionInfo: SessionEntry | null,
): StudentDetailData {
  const r = sr.content;
  const weakConcepts = r?.key_concepts?.weak_concepts?.filter(c => c !== '없음') ?? [];
  const misconceptions = r?.misconception_summary?.filter(c => c !== '없음') ?? [];
  const mainConcepts = r?.key_concepts?.main_concepts?.filter(c => c !== '없음') ?? [];
  const classLabel = sessionInfo
    ? `${sessionInfo.cls.grade ? sessionInfo.cls.grade + '학년 ' : ''}${sessionInfo.cls.homeroom ?? ''}`
    : '';

  return {
    studentId: sr.student_id,
    name: sr.users?.name ?? '학생',
    className: classLabel,
    participation: 0,
    comprehension: 0,
    mainEmotion: '—',
    interventionCount: 0,
    learningTopic: mainConcepts[0] ?? '—',
    totalDuration: '—',
    timeline: [],
    repeatedMisconceptions: misconceptions,
    aiWeaknessCheck: weakConcepts.join(' / '),
    aiStatusSummary: r?.session_summary ?? '',
    aiReport: r?.detailed_report ?? '',
  };
}

/* ── 메인 페이지 ────────────────────────────────────────────────────── */

function TeacherReportsContent() {
  const searchParams = useSearchParams();
  const initParams = useRef({
    classId: searchParams.get('classId') ? Number(searchParams.get('classId')) : null,
    sessionId: searchParams.get('sessionId') ? Number(searchParams.get('sessionId')) : null,
  });

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [rawStudentReports, setRawStudentReports] = useState<RawStudentReport[]>([]);
  const [rawSummary, setRawSummary] = useState<RawSessionReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'students'>('summary');
  const [selectedRaw, setSelectedRaw] = useState<RawStudentReport | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    getTeacherClasses()
      .then(cls => {
        setClasses(cls);
        if (cls.length > 0) setSelectedClassId(initParams.current.classId ?? cls[0].id);
      })
      .catch(() => setClasses([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    let cancelled = false;
    setSelectedSessionId(null);
    setRawSummary(null);
    setRawStudentReports([]);
    setSelectedRaw(null);
    getSessionsByClass(selectedClassId)
      .then(ss => {
        if (cancelled) return;
        const finished = ss
          .filter(s => s.finished_at)
          .sort((a, b) => (b.finished_at ?? '').localeCompare(a.finished_at ?? ''));
        const cls = classes.find(c => c.id === selectedClassId)!;
        const entries = finished.map(s => ({ session: s, cls }));
        setSessions(entries);
        if (entries.length > 0) {
          const urlSessionId = initParams.current.sessionId;
          const targetId = (urlSessionId && entries.some(e => e.session.id === urlSessionId))
            ? urlSessionId
            : entries[0].session.id;
          setSelectedSessionId(targetId);
        }
      })
      .catch(() => { if (!cancelled) setSessions([]); });
    return () => { cancelled = true; };
  }, [selectedClassId, classes]);

  useEffect(() => {
    if (!selectedSessionId) return;
    setIsLoadingReport(true);
    setSelectedRaw(null);

    const fetchReports = () =>
      Promise.all([
        getSessionStudentReports(selectedSessionId),
        getSessionSummaryReport(selectedSessionId),
      ])
        .then(([students, summary]) => {
          setRawStudentReports(students as RawStudentReport[]);
          setRawSummary(summary as RawSessionReport);
          return summary as RawSessionReport;
        })
        .catch(() => {
          setRawStudentReports([]);
          setRawSummary(null);
          return null;
        });

    let intervalId: ReturnType<typeof setInterval>;

    fetchReports().then(summary => {
      setIsLoadingReport(false);
      if (!summary?.content) {
        intervalId = setInterval(() => {
          fetchReports().then(s => { if (s?.content) clearInterval(intervalId); });
        }, 5000);
      }
    });

    return () => clearInterval(intervalId);
  }, [selectedSessionId]);

  /* ── 뷰 모델 변환 ─────────────────────────────────────────────── */

  const classOptions: ClassOption[] = classes.map(cls => ({
    id: cls.id,
    label: `${cls.grade ? cls.grade + '학년 ' : ''}${cls.homeroom ?? ''} ${cls.subject}`.trim(),
  }));

  const sessionOptions: SessionOption[] = sessions.map(({ session }) => ({
    id: session.id,
    label: session.session_name || `세션 ${session.id}`,
  }));

  const currentSession = sessions.find(e => e.session.id === selectedSessionId) ?? null;

  const studentReports: StudentReportRow[] = rawStudentReports.map(toStudentReportRow);

  const summaryReport = toSummaryReportData(rawSummary);

  const selectedStudent: StudentDetailData | null = selectedRaw
    ? toStudentDetailData(selectedRaw, currentSession)
    : null;

  return (
    <PageContainer>
      <TeacherReport
        classes={classOptions}
        sessions={sessionOptions}
        selectedClassId={selectedClassId}
        selectedSessionId={selectedSessionId}
        activeTab={activeTab}
        isLoading={isLoading || isLoadingReport}
        summaryReport={summaryReport}
        studentReports={studentReports}
        selectedStudent={selectedStudent}
        studentSearch={studentSearch}
        onClassChange={setSelectedClassId}
        onSessionChange={setSelectedSessionId}
        onTabChange={setActiveTab}
        onStudentSelect={id => {
          const raw = rawStudentReports.find(r => r.student_id === id) ?? null;
          setSelectedRaw(raw);
        }}
        onStudentBack={() => setSelectedRaw(null)}
        onSearchChange={setStudentSearch}
      />
    </PageContainer>
  );
}

export default function TeacherReportsPage() {
  return (
    <Suspense fallback={null}>
      <TeacherReportsContent />
    </Suspense>
  );
}
