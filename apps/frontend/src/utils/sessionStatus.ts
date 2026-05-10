export type ComputedStatus = 'upcoming' | 'live' | 'finished';

interface SessionLike {
  status: 'ACTIVE' | 'FINISHED' | 'PLANNING';
  scheduled_date?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
}

/**
 * 백엔드 status + 등록된 시간 기반으로 실제 상태 계산
 * ACTIVE/FINISHED는 백엔드 값 우선, PLANNING은 시간으로 판단
 */
export function computeSessionStatus(session: SessionLike): ComputedStatus {
  if (session.status === 'ACTIVE') return 'live';
  if (session.status === 'FINISHED') return 'finished';

  const now = new Date();

  // scheduled_end가 지났으면 종료
  if (session.scheduled_end) {
    if (now > new Date(session.scheduled_end)) return 'finished';
  }

  // scheduled_start가 됐으면 진행중
  if (session.scheduled_start) {
    if (now >= new Date(session.scheduled_start)) return 'live';
  }

  // scheduled_date 자체가 오늘 이전이면 종료 (UTC 날짜 기준 비교)
  if (session.scheduled_date) {
    const d = new Date(session.scheduled_date);
    const sessionUTCDate = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const todayUTCDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (sessionUTCDate < todayUTCDate) return 'finished';
  }

  return 'upcoming';
}
