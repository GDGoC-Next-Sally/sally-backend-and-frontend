import { useAuthStore } from '@/store/authStore';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

/**
 * 백엔드 서버에 토큰을 포함하여 요청을 보내는 공통 함수
 */
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  // Zustand 스토어에서 현재 액세스 토큰 가져오기
  const token = useAuthStore.getState().accessToken;

  const headers = new Headers(options.headers || {});
  
  // 토큰이 존재하면 Authorization 헤더에 Bearer 방식으로 추가
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  headers.set('Content-Type', 'application/json');

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(`${BACKEND_URL}${endpoint}`, config);
  
  if (!response.ok) {
    // 401 Unauthorized 등 에러 처리 추가 가능
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `API request failed with status ${response.status}`);
  }
  
  return response.json();
}
