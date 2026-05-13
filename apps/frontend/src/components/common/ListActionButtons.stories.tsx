import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ListActionButtons } from './ListActionButtons';

const meta: Meta<typeof ListActionButtons> = {
  title: 'Common/ListActionButtons',
  component: ListActionButtons,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'centered',
  },
  argTypes: {
    onPrimary: { action: 'onPrimary' },
  },
};
export default meta;
type Story = StoryObj<typeof ListActionButtons>;

/** 기본 — 더보기 비활성화 (항목 미선택) */
export const Default: Story = {
  args: {
    primaryLabel: '클래스 만들기',
    moreDisabled: true,
    moreItems: [
      { label: '수정하기' },
      { separator: true },
      { label: '삭제하기', danger: true },
    ],
  },
};

/** 더보기 활성화 (항목 선택됨) */
export const MoreEnabled: Story = {
  args: {
    primaryLabel: '클래스 만들기',
    moreDisabled: false,
    moreItems: [
      { label: '수정하기' },
      { separator: true },
      { label: '삭제하기', danger: true },
    ],
  },
};

/** 세션 뷰 레이블 */
export const SessionContext: Story = {
  args: {
    primaryLabel: '새로운 세션',
    moreDisabled: false,
    moreItems: [
      { label: '세션 수정' },
      { label: '세션 복제' },
      { separator: true },
      { label: '세션 삭제', danger: true },
    ],
  },
};
