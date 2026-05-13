import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ClassCard } from './ClassCard';

const meta: Meta<typeof ClassCard> = {
  title: 'Common/ClassCard',
  component: ClassCard,
  parameters: {
    nextjs: { appDirectory: true },
  },
  argTypes: {
    onClick: { action: 'onClick' },
    onNavigate: { action: 'onNavigate' },
  },
};
export default meta;
type Story = StoryObj<typeof ClassCard>;

/** 교사 뷰 — 기본 상태 */
export const TeacherDefault: Story = {
  args: {
    title: '수학 기초반',
    subtitle: '김선생님',
    schedule: '월·수 10:00',
  },
};

/** 교사 뷰 — 선택된 상태 */
export const TeacherSelected: Story = {
  args: {
    title: '영어 회화반',
    subtitle: '이선생님',
    schedule: '화·목 14:00',
    isSelected: true,
  },
};

/** 교사 뷰 — 시간표 없음 */
export const TeacherNoSchedule: Story = {
  args: {
    title: '과학 탐구반',
    subtitle: '박선생님',
  },
};

/** 학생 뷰 — 드롭다운 메뉴 + 가운데 정렬 이동 버튼 */
export const StudentView: Story = {
  args: {
    title: '수학 기초반',
    subtitle: '김선생님',
    schedule: '월·수 10:00',
    moveBtnCentered: true,
    navigateLabel: '대기실로 이동',
    menuItems: [
      { label: '수업 정보 보기' },
      { separator: true },
      { label: '수업 나가기', danger: true },
    ],
  },
};

/** 학생 뷰 — 서브타이틀 없음 */
export const StudentNoSubtitle: Story = {
  args: {
    title: '코딩 입문반',
    schedule: '금 15:00',
    moveBtnCentered: true,
    menuItems: [
      { label: '수업 나가기', danger: true },
    ],
  },
};
