import type { Meta, StoryObj } from '@storybook/react';
import { LoginForm } from './LoginForm';

const meta: Meta<typeof LoginForm> = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Login: Story = {
  args: {
    onSignin: async (email, password, role) => {
      console.log('signin', email, role);
    },
    onSignup: async (email, password, nickname, role) => {
      console.log('signup', email, nickname, role);
    },
  },
};

export const WithSignupError: Story = {
  args: {
    onSignin: async (email, password, role) => {
      console.log('signin', email, role);
    },
    onSignup: async () => {
      throw new Error('이미 사용 중인 이메일입니다.');
    },
  },
};

export const WithSigninError: Story = {
  args: {
    onSignin: async () => {
      throw new Error('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    },
    onSignup: async (email, password, nickname, role) => {
      console.log('signup', email, nickname, role);
    },
  },
};
