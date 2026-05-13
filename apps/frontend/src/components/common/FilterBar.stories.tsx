import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FilterBar } from './FilterBar';

const meta: Meta<typeof FilterBar> = {
  title: 'Common/FilterBar',
  component: FilterBar,
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof FilterBar>;

const InteractiveTemplate = (args: React.ComponentProps<typeof FilterBar>) => {
  const [search, setSearch] = useState(args.search ?? '');
  return <FilterBar {...args} search={search} onSearch={setSearch} />;
};

/** 기본 — 검색 + 정렬 */
export const Default: Story = {
  render: (args) => <InteractiveTemplate {...args} />,
  args: {
    search: '',
    placeholder: '검색',
  },
};

/** 검색어 입력된 상태 */
export const WithSearchValue: Story = {
  render: (args) => <InteractiveTemplate {...args} />,
  args: {
    search: '수학',
    placeholder: '수업 이름 검색',
  },
};

/** 커스텀 정렬 옵션 */
export const CustomSortOptions: Story = {
  render: (args) => <InteractiveTemplate {...args} />,
  args: {
    search: '',
    placeholder: '세션 검색',
    sortOptions: [
      { value: 'recent', label: '최근 순' },
      { value: 'name', label: '이름 순' },
      { value: 'students', label: '학생 수 순' },
    ],
  },
};

/** 우측 슬롯에 버튼 추가 */
export const WithActionButton: Story = {
  render: (args) => (
    <InteractiveTemplate {...args}>
      <button
        style={{
          padding: '8px 16px',
          background: '#E8593C',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        + 세션 만들기
      </button>
    </InteractiveTemplate>
  ),
  args: {
    search: '',
    placeholder: '세션 검색',
  },
};
