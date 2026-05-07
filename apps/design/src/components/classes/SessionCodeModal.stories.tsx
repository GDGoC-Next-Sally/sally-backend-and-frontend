import type { Meta, StoryObj } from '@storybook/react';
import { SessionCodeModal } from './SessionCodeModal';

const meta: Meta<typeof SessionCodeModal> = {
  title: 'Classes/SessionCodeModal',
  component: SessionCodeModal,
  parameters: {
    layout: 'centered',
    nextjs: { appDirectory: true },
  },
  tags: ['autodocs'],
  argTypes: {
    onClose:               { action: 'onClose' },
    onRefreshCode:         { action: 'onRefreshCode' },
    onToggleRegisterable:  { action: 'onToggleRegisterable' },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: '기본 — 신규 진입 허용',
  args: {
    inviteCode: 'AB12CD',
    registerable: true,
    currentStudents: 26,
    maxStudents: 50,
  },
};

export const Blocked: Story = {
  name: '신규 진입 차단',
  args: {
    inviteCode: 'EF34GH',
    registerable: false,
    currentStudents: 50,
    maxStudents: 50,
  },
};

export const AlmostFull: Story = {
  name: '거의 꽉 참 (48/50)',
  args: {
    inviteCode: 'XY99ZZ',
    registerable: true,
    currentStudents: 48,
    maxStudents: 50,
  },
};
