import type { Meta, StoryObj } from '@storybook/react';
import { TeacherReport } from './TeacherReport';
import type {
  ClassOption,
  SessionOption,
  SummaryReportData,
  StudentReportRow,
  StudentDetailData,
} from './TeacherReport';

/* ── 피그마 기준 목 데이터 ─────────────────────────────────── */

const MOCK_CLASSES: ClassOption[] = [
  { id: 1, label: '고려중학교 3학년 4반' },
  { id: 2, label: '고려중학교 3학년 2반' },
];

const MOCK_SESSIONS: SessionOption[] = [
  { id: 10, label: '2026년 05월 20일 (수) 2교시' },
  { id: 11, label: '2026년 05월 13일 (수) 2교시' },
  { id: 12, label: '2026년 05월 06일 (화) 3교시' },
];

const MOCK_SUMMARY: SummaryReportData = {
  overallSummary:
    '전체적으로 현재완료의 기본 형태인 have/has + 과거분사는 이해하고 있으나, 현재완료와 단순과거를 구분하는 데 어려움을 보였습니다. 특히 yesterday, last week, two days ago처럼 과거의 특정 시점을 나타내는 표현이 나오면 현재완료를 사용할 수 없다는 점에서 혼란이 많았습니다. 일부 학생들은 경험, 완료, 계속 용법을 암기식으로 구분하려 했지만, 문장의 의미 흐름 속에서 판단하는 데는 아직 보완이 필요합니다.',
  keyQuestions: [
    {
      topic: '현재완료와 단순 과거 비교',
      question:
        '현재완료랑 단순과거는 둘 다 과거 일을 말하는 것 같은데 뭐가 다른가요?',
    },
    {
      topic: '과거 시점 표현',
      question: 'yesterday가 있으면 왜 have p.p.를 쓰면 안 되나요?',
    },
    {
      topic: '현재와의 연결성',
      question:
        'I have lost my key와 I lost my key는 해석이 어떻게 달라요?',
    },
    {
      topic: 'since / for',
      question: "since랑 for는 둘 다 '~동안' 아닌가요?",
    },
    {
      topic: '경험 용법',
      question:
        'Have you ever been to Jeju?에서 ever는 꼭 필요한가요?',
    },
  ],
  topWeakConcepts: [
    '현재완료와 단순과거의 의미 차이',
    '과거 특정 시점 표현과 현재완료의 충돌',
    'since와 for의 구분',
    '경험·완료·계속 용법 구분',
    'already, just, yet의 위치와 쓰임',
  ],
  aiReport:
    '이번 수업에서 학생들은 현재완료의 형태는 비교적 잘 따라왔지만, 현재완료가 단순히 과거를 나타내는 시제가 아니라 현재와 연결된 과거 경험이나 상태를 나타낸다는 점에서 어려움을 보였습니다. 특히 I lost my key와 I have lost my key의 차이를 현재 상황과 연결해 이해하지 못하는 경우가 많았습니다. 또한 yesterday, last night, two days ago와 같은 과거 특정 시점 표현이 있을 때는 단순과거를 사용해야 한다는 규칙을 반복적으로 헷갈려 했습니다. 다음 수업에서는 현재완료와 단순과거 문장을 나란히 비교하고, 시간 표현을 기준으로 어떤 시제를 선택할지 판단하는 연습을 권장합니다.',
};

const MOCK_STUDENTS: StudentReportRow[] = [
  { id: 1, studentId: 's1', name: '김고대', participation: 58, comprehension: 46, mainEmotion: '불안', interventionCount: 4 },
  { id: 2, studentId: 's2', name: '이민준', participation: 82, comprehension: 74, mainEmotion: '안정', interventionCount: 1 },
  { id: 3, studentId: 's3', name: '박서연', participation: 71, comprehension: 65, mainEmotion: '안정', interventionCount: 2 },
  { id: 4, studentId: 's4', name: '최지훈', participation: 44, comprehension: 38, mainEmotion: '불안', interventionCount: 5 },
  { id: 5, studentId: 's5', name: '정수빈', participation: 90, comprehension: 88, mainEmotion: '집중', interventionCount: 0 },
  { id: 6, studentId: 's6', name: '한예은', participation: 67, comprehension: 60, mainEmotion: '안정', interventionCount: 2 },
  { id: 7, studentId: 's7', name: '오준혁', participation: 55, comprehension: 42, mainEmotion: '혼란', interventionCount: 3 },
];

const MOCK_STUDENT_DETAIL: StudentDetailData = {
  studentId: 's1',
  name: '김고대',
  className: '고대중학교 3학년 4반',
  participation: 58,
  comprehension: 46,
  mainEmotion: '불안',
  interventionCount: 2,
  learningTopic: '현재완료와 단순과거 구분하기',
  totalDuration: '34M',
  timeline: [
    {
      type: 'concept',
      label: '취약개념 01',
      description: '현재완료의 기본 의미',
      time: '00:05',
      positionPercent: 5,
    },
    {
      type: 'intervention',
      label: '교사 개입 01',
      description: '현재와 연결된 과거라는 개념을 예문 비교로 재설명',
      time: '00:10',
      positionPercent: 22,
    },
    {
      type: 'concept',
      label: '취약개념 02',
      description: '현재완료 vs 단순 과거',
      time: '00:15',
      positionPercent: 45,
    },
    {
      type: 'concept',
      label: '취약개념 03',
      description: '현재완료 vs 단순 과거',
      time: '00:22',
      positionPercent: 62,
    },
    {
      type: 'intervention',
      label: '교사 개입 02',
      description: '현재와 연결된 과거라는 개념을 예문 비교로 재설명',
      time: '00:28',
      positionPercent: 80,
    },
  ],
  repeatedMisconceptions: [
    '현재완료와 단순과거의 의미 차이',
    '과거 특정 시점 표현과 현재완료의 충돌',
    '경험·완료·계속 용법 구분',
  ],
  aiWeaknessCheck:
    '현재완료의 기본 형태는 이해했지만, 단순과거와의 의미 차이를 구분하는 데 어려움이 있었습니다. 특히 과거 특정 시점 표현이 있는 문장에서도 현재완료를 사용하려는 오류가 반복되었고, since와 for, already·just·yet의 쓰임도 아직 혼동하고 있습니다. 문맥 속 시간 표현을 기준으로 알맞은 시제를 선택하는 연습이 필요합니다.',
  aiStatusSummary:
    '현재완료의 형태 이해는 안정적이나, 단순과거와의 의미 구분 및 시간 표현 판단에서 추가 학습이 필요합니다.',
  aiReport:
    '이번 세션에서 학생은 현재완료의 기본 형태인 have/has + 과거분사는 비교적 잘 이해했습니다. 그러나 현재완료가 단순히 과거의 일을 말하는 것이 아니라, 과거의 일이 현재 상황과 연결되어 있음을 나타낸다는 점에서 어려움을 보였습니다. 특히 yesterday, last week, two days ago와 같이 과거의 특정 시점을 나타내는 표현이 등장했을 때 현재완료를 사용할 수 없다는 규칙을 반복적으로 혼동했습니다. 또한 since와 for를 모두 "동안"으로 해석하면서, since는 시작 시점, for는 기간을 나타낸다는 개념 구분이 아직 명확하지 않았습니다.',
};

/* ── 공통 액션 핸들러 ─────────────────────────────────────── */

const DEFAULT_ACTIONS = {
  onClassChange: (id: number) => console.log('classChange', id),
  onSessionChange: (id: number) => console.log('sessionChange', id),
  onTabChange: (tab: string) => console.log('tabChange', tab),
  onStudentSelect: (id: string) => console.log('studentSelect', id),
  onStudentBack: () => console.log('studentBack'),
  onSearchChange: (v: string) => console.log('searchChange', v),
  onExport: () => console.log('export'),
};

/* ── Meta ─────────────────────────────────────────────────── */

const meta: Meta<typeof TeacherReport> = {
  title: 'Reports/TeacherReport',
  component: TeacherReport,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 32, backgroundColor: '#F5F6F8', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    ...DEFAULT_ACTIONS,
    classes: MOCK_CLASSES,
    sessions: MOCK_SESSIONS,
    selectedClassId: 1,
    selectedSessionId: 10,
    activeTab: 'summary',
    isLoading: false,
    summaryReport: MOCK_SUMMARY,
    studentReports: MOCK_STUDENTS,
    selectedStudent: null,
    studentSearch: '',
  },
};

export default meta;
type Story = StoryObj<typeof TeacherReport>;

/* ── Story 1: 로딩 상태 ─────────────────────────────────── */

/** 리포트 데이터 로딩 중 — 스켈레톤 표시 */
export const Loading: Story = {
  args: {
    isLoading: true,
    summaryReport: null,
    studentReports: [],
  },
};

/* ── Story 2: 세션 미선택 (빈 상태) ────────────────────── */

/** 세션을 선택하지 않은 초기 상태 */
export const NoSessionSelected: Story = {
  args: {
    selectedSessionId: null,
    summaryReport: null,
    studentReports: [],
  },
};

/* ── Story 3: 클래스·세션 없음 ─────────────────────────── */

/** 클래스와 세션이 아직 없는 상태 */
export const NoClassOrSession: Story = {
  args: {
    classes: [],
    sessions: [],
    selectedClassId: null,
    selectedSessionId: null,
    summaryReport: null,
    studentReports: [],
  },
};

/* ── Story 4: 전체보기 — 피그마 기준 데이터 ─────────────── */

/** [피그마 T3 프레임] 전체보기 탭 — AI 요약 + 주요 질문 + 취약개념 + AI 리포트 */
export const SummaryWithData: Story = {
  args: {
    activeTab: 'summary',
    summaryReport: MOCK_SUMMARY,
  },
};

/* ── Story 5: 전체보기 — AI 리포트 없음 ─────────────────── */

/** AI 리포트가 아직 생성되지 않은 상태 */
export const SummaryNoAiReport: Story = {
  args: {
    activeTab: 'summary',
    summaryReport: {
      ...MOCK_SUMMARY,
      aiReport: '',
    },
  },
};

/* ── Story 6: 전체보기 — 질문/취약개념 없음 ────────────── */

/** 세션은 선택했지만 AI 분석 데이터가 없는 상태 */
export const SummaryEmptyData: Story = {
  args: {
    activeTab: 'summary',
    summaryReport: {
      overallSummary: '',
      keyQuestions: [],
      topWeakConcepts: [],
      aiReport: '',
    },
  },
};

/* ── Story 7: 학생 목록 — 피그마 기준 데이터 ────────────── */

/** [피그마 T3 프레임] 학생 목록 탭 — 참여도·이해도·감정·개입횟수 */
export const StudentListWithData: Story = {
  args: {
    activeTab: 'students',
    studentReports: MOCK_STUDENTS,
  },
};

/* ── Story 8: 학생 목록 — 빈 상태 ──────────────────────── */

/** 학생 리포트가 아직 없는 상태 */
export const StudentListEmpty: Story = {
  args: {
    activeTab: 'students',
    studentReports: [],
  },
};

/* ── Story 9: 학생 목록 — 검색 필터 ────────────────────── */

/** 검색어 '김' 입력 시 필터링된 결과 */
export const StudentListSearchFiltered: Story = {
  args: {
    activeTab: 'students',
    studentReports: MOCK_STUDENTS,
    studentSearch: '김',
  },
};

/* ── Story 10: 학생 목록 — 검색 결과 없음 ──────────────── */

/** 검색어에 매칭되는 학생 없음 */
export const StudentListSearchEmpty: Story = {
  args: {
    activeTab: 'students',
    studentReports: MOCK_STUDENTS,
    studentSearch: '홍길동',
  },
};

/* ── Story 11: 개별 학생 상세 — 타임라인 포함 ──────────── */

/** [피그마 T3 프레임] 개별 학생 리포트 — 타임라인 + 반복오개념 + AI 약점체크 */
export const StudentDetail: Story = {
  args: {
    selectedStudent: MOCK_STUDENT_DETAIL,
  },
};

/* ── Story 12: 개별 학생 상세 — 타임라인 없음 ──────────── */

/** 타임라인 데이터가 아직 없는 개별 리포트 */
export const StudentDetailNoTimeline: Story = {
  args: {
    selectedStudent: {
      ...MOCK_STUDENT_DETAIL,
      timeline: [],
      totalDuration: '—',
    },
  },
};

/* ── Story 13: 개별 학생 상세 — 안정 상태 ──────────────── */

/** 참여도·이해도가 높고 안정된 감정 상태인 학생 */
export const StudentDetailStable: Story = {
  args: {
    selectedStudent: {
      ...MOCK_STUDENT_DETAIL,
      name: '정수빈',
      participation: 90,
      comprehension: 88,
      mainEmotion: '안정',
      interventionCount: 0,
      repeatedMisconceptions: [],
      aiWeaknessCheck: '전반적으로 학습 내용을 잘 이해하고 있습니다. 심화 문제를 통해 응용력을 키워보세요.',
      aiStatusSummary: '이번 수업 전 과정에서 안정적인 학습 태도를 유지했습니다.',
    },
  },
};

/* ── Story 14: 개별 학생 상세 — 데이터 없음 ────────────── */

/** AI 리포트가 아직 생성되지 않은 개별 학생 뷰 */
export const StudentDetailNoReport: Story = {
  args: {
    selectedStudent: {
      ...MOCK_STUDENT_DETAIL,
      timeline: [],
      repeatedMisconceptions: [],
      aiWeaknessCheck: '',
      aiStatusSummary: '',
      aiReport: '',
    },
  },
};
