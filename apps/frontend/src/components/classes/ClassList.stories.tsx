import type { Meta, StoryObj } from '@storybook/react';
import { ClassList } from './ClassList';

const MOCK_CLASSES = [
  {
    id: 1,
    subject: '영어',
    grade: 3,
    homeroom: '2반',
    status: 'ACTIVE' as const,
    explanation: '정규 수업 / 2026년 1학기',
    theme: 'mint',
    invite_code: 'ABCD1234',
    registerable: true,
    schedule: '월1, 화4, 수4, 금4',
    created_at: '2026-03-01',
  },
  {
    id: 2,
    subject: '수학',
    grade: 2,
    homeroom: '1반',
    status: 'PLANNING' as const,
    explanation: '정규 수업 / 2026년 1학기',
    theme: 'lavender',
    invite_code: 'XY12AB34',
    registerable: false,
    schedule: '화2, 목3',
    created_at: '2026-03-01',
  },
];

const MOCK_STUDENTS = [
  { id: 1, name: '김학생', progress: 40, active: true, summary: '학생별 개별 성취도 요약' },
  { id: 2, name: '이학생', progress: 65, active: true, summary: '학생별 개별 성취도 요약' },
  { id: 3, name: '박학생', progress: 30, active: false, summary: '학생별 개별 성취도 요약' },
];

const meta: Meta<typeof ClassList> = {
  title: 'Classes/ClassList',
  component: ClassList,
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof ClassList>;

export const WithData: Story = {
  args: {
    classes: MOCK_CLASSES,
    students: MOCK_STUDENTS,
    onCreateClass: (data) => console.log('create class', data),
    onUpdateClass: (id, data) => console.log('update class', id, data),
    onDeleteClass: (id) => console.log('delete class', id),
    onRefreshCode: (classId) => console.log('refresh code', classId),
    onToggleRegisterable: (classId) => console.log('toggle registerable', classId),
  },
};

export const Empty: Story = {
  args: {
    classes: [],
    students: [],
    onCreateClass: (data) => console.log('create class', data),
    onUpdateClass: (id, data) => console.log('update class', id, data),
    onDeleteClass: (id) => console.log('delete class', id),
    onRefreshCode: (classId) => console.log('refresh code', classId),
    onToggleRegisterable: (classId) => console.log('toggle registerable', classId),
  },
};
