import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SessionCodeModal } from './SessionCodeModal';

const meta: Meta<typeof SessionCodeModal> = {
  title: 'Sessions/SessionCodeModal',
  component: SessionCodeModal,
  decorators: [(Story) => <div style={{ minHeight: '100vh', position: 'relative' }}><Story /></div>],
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof SessionCodeModal>;

export const Open: Story = {
  args: {
    classId: 1,
    inviteCode: 'ABCD1234',
    registerable: true,
    onClose: () => console.log('close'),
    onRefreshCode: () => console.log('refresh code'),
    onToggleRegisterable: () => console.log('toggle registerable'),
  },
};

export const Blocked: Story = {
  args: {
    classId: 1,
    inviteCode: 'XY12AB34',
    registerable: false,
    onClose: () => console.log('close'),
    onRefreshCode: () => console.log('refresh code'),
    onToggleRegisterable: () => console.log('toggle registerable'),
  },
};

export const NoCode: Story = {
  args: {
    classId: 1,
    inviteCode: undefined,
    registerable: false,
    onClose: () => console.log('close'),
    onRefreshCode: () => console.log('refresh code'),
    onToggleRegisterable: () => console.log('toggle registerable'),
  },
};
