import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DropdownMenu } from './DropdownMenu';

const meta: Meta<typeof DropdownMenu> = {
  title: 'Common/DropdownMenu',
  component: DropdownMenu,
  parameters: {
    nextjs: { appDirectory: true },
    layout: 'centered',
  },
};
export default meta;
type Story = StoryObj<typeof DropdownMenu>;

/** 기본 — 일반 메뉴 항목 */
export const Default: Story = {
  args: {
    trigger: <button style={{ padding: '6px 12px', cursor: 'pointer' }}>메뉴 열기</button>,
    items: [
      { label: '수정하기' },
      { label: '복사하기' },
      { separator: true },
      { label: '삭제하기', danger: true },
    ],
  },
};

/** 위험 항목 포함 */
export const WithDanger: Story = {
  args: {
    trigger: <button style={{ padding: '6px 12px', cursor: 'pointer' }}>더보기</button>,
    items: [
      { label: '세션 수정' },
      { label: '세션 복제' },
      { separator: true },
      { label: '세션 삭제', danger: true },
    ],
  },
};

/** 비활성화 항목 포함 */
export const WithDisabled: Story = {
  args: {
    trigger: <button style={{ padding: '6px 12px', cursor: 'pointer' }}>옵션</button>,
    items: [
      { label: '내보내기' },
      { label: '통계 보기', disabled: true },
      { separator: true },
      { label: '삭제', danger: true },
    ],
  },
};

/** align start — 왼쪽 정렬 */
export const AlignStart: Story = {
  args: {
    trigger: <button style={{ padding: '6px 12px', cursor: 'pointer' }}>왼쪽 정렬</button>,
    align: 'start',
    items: [
      { label: '항목 1' },
      { label: '항목 2' },
      { label: '항목 3' },
    ],
  },
};

/** 단일 항목 */
export const SingleItem: Story = {
  args: {
    trigger: <button style={{ padding: '6px 12px', cursor: 'pointer' }}>수업 나가기</button>,
    items: [
      { label: '수업 나가기', danger: true },
    ],
  },
};
