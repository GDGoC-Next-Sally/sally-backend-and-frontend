import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    nextjs: { appDirectory: true },
    backgrounds: {
      default: 'sally',
      values: [{ name: 'sally', value: '#F5F4F0' }, { name: 'white', value: '#ffffff' }],
    },
  },
};

export default preview;
