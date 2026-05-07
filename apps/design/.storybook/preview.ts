import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    nextjs: {
      // Enable App Router support — next/link and next/navigation work out of the box
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'sally-bg',
      values: [
        { name: 'sally-bg', value: '#F5F4F0' },
        { name: 'white',    value: '#FFFFFF' },
        { name: 'dark',     value: '#1A1A1A' },
      ],
    },
  },
};

export default preview;
