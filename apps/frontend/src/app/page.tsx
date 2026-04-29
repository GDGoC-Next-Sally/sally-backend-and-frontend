import { redirect } from 'next/navigation';

export default function RootPage() {
  // 기본적으로 교사 홈으로 리다이렉트 (임시)
  redirect('/t/home');
}
