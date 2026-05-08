import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LoginForm } from './LoginForm';
import { ConfirmModal } from '../common/ConfirmModal';

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
      throw new Error('로그인에 실패했습니다.');
    },
    onSignup: async (email, password, nickname, role) => {
      console.log('signup', email, nickname, role);
    },
  },
};

/** 피그마 디자인 확인용 — 로그인 에러 모달 단독 미리보기 */
export const SigninErrorModalPreview: Story = {
  render: () => (
    <ConfirmModal
      title="로그인에 실패했습니다."
      description="이메일과 비밀번호를 확인해주세요."
      cancelLabel="취소"
      confirmLabel="확인"
      onClose={() => console.log('close')}
      onConfirm={() => console.log('confirm')}
    />
  ),
};
