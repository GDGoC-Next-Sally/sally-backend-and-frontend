import type { Meta, StoryObj } from '@storybook/react';
import { ClassList } from './ClassList';
import {
  MOCK_CLASSES,
  MOCK_STUDENTS,
} from '@/mock/data';

const meta: Meta<typeof ClassList> = {
  title: 'Classes/ClassList',
  component: ClassList,
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
  },
  tags: ['autodocs'],
  argTypes: {
    onCreateClass:        { action: 'onCreateClass' },
    onUpdateClass:        { action: 'onUpdateClass' },
    onDeleteClass:        { action: 'onDeleteClass' },
    onRefreshCode:        { action: 'onRefreshCode' },
    onToggleRegisterable: { action: 'onToggleRegisterable' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default: full class list + students ──────────────────────────────────────

export const Default: Story = {
  name: '기본 — 5개 클래스',
  args: {
    classes:  MOCK_CLASSES,
    students: MOCK_STUDENTS,
    basePath: '/t',
  },
};

// ─── Empty: no classes yet ────────────────────────────────────────────────────

export const Empty: Story = {
  name: '빈 상태 — 클래스 없음',
  args: {
    classes:  [],
    students: [],
    basePath: '/t',
  },
};

// ─── One class ────────────────────────────────────────────────────────────────

export const SingleClass: Story = {
  name: '클래스 1개',
  args: {
    classes:  [MOCK_CLASSES[0]],
    students: MOCK_STUDENTS,
    basePath: '/t',
  },
};

// ─── Student view (basePath /s) ───────────────────────────────────────────────

export const StudentView: Story = {
  name: '학생 뷰 (/s)',
  args: {
    classes:  MOCK_CLASSES.slice(0, 3),
    students: MOCK_STUDENTS,
    basePath: '/s',
  },
};
