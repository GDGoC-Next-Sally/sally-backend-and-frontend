'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeaveSessionModal } from './LeaveSessionModal';
import { StudentSessionEndModal } from './StudentSessionEndModal';
import styles from './StudentLiveSession.module.css';

type Phase = 'waiting' | 'live';

const MOCK_MESSAGES = [
  { id: 1, side: 'left', time: '오전 10:50' },
  { id: 2, side: 'left', time: '오전 10:50' },
  { id: 3, side: 'right', time: '오전 10:50' },
  { id: 4, side: 'right', time: '오전 10:50' },
  { id: 5, side: 'left', time: '오전 10:50' },
];

const QUICK_ACTIONS = ['도움이 필요해요', '예시를 보여주세요', '예시를 보여주세요'];

interface Props {
  classId: string;
  sessionId: string;
}

export const StudentLiveSession: React.FC<Props> = ({ classId, sessionId }) => {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('waiting');
  const [message, setMessage] = useState('');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);

  const handleLeave = () => {
    setIsLeaveModalOpen(false);
    router.push(`/s/classes/${classId}`);
  };

  const handleEndNext = () => {
    setIsEndModalOpen(false);
    router.push(`/s/classes/${classId}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        {/* Main session area */}
        <div className={styles.mainArea}>
          {/* Session header */}
          <div className={styles.sessionHeader}>
            <button className={styles.backBtn} onClick={() => setIsLeaveModalOpen(true)}>
              ‹
            </button>
            <div className={styles.headerInfo}>
              <div className={styles.sessionTitle}>중 2 영어문법 / 관계대명사</div>
              <div className={styles.teacherName}>박수빈 선생님</div>
            </div>
            <div className={styles.headerRight}>
              {phase === 'waiting' ? (
                <span className={styles.waitingChip}>시작 대기</span>
              ) : (
                <div className={styles.liveChipRow}>
                  <span className={styles.liveChip}>LIVE 진행 중</span>
                  <span className={styles.elapsed}>시작 13:34 | 24분 경과</span>
                </div>
              )}
              <button className={styles.leaveBtn} onClick={() => setIsLeaveModalOpen(true)}>
                나가기
              </button>
            </div>
          </div>

          {/* Waiting state */}
          {phase === 'waiting' && (
            <div className={styles.waitCard}>
              <div className={styles.waitMeta}>
                <span className={styles.waitTime}>시작 13:34 | 0분 경과</span>
              </div>
              <div className={styles.waitIllustration}>
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="36" fill="#F0FBF4" />
                  <rect x="28" y="16" width="24" height="12" rx="4" fill="#22C55E" />
                  <path d="M28 28 L36 48 L40 40 L44 48 L52 28" stroke="#22C55E" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
                  <path d="M28 52 L36 32 L40 40 L44 32 L52 52" stroke="#22C55E" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
                  <rect x="28" y="52" width="24" height="12" rx="4" fill="#22C55E" />
                </svg>
              </div>
              <h2 className={styles.waitTitle}>곧 시작됩니다!</h2>
              <p className={styles.waitSubtitle}>선생님이 수업을 시작할 때까지<br />기다려 주세요</p>
              <button className={styles.joinBtn} onClick={() => setPhase('live')}>
                세션 참여하기
              </button>
              <div className={styles.waitStats}>
                <div className={styles.waitStat}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <div>
                    <div className={styles.statLabel}>시작 예정</div>
                    <div className={styles.statValue}>13:30</div>
                  </div>
                </div>
                <div className={styles.waitStat}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2">
                    <path d="M15 3H9a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                  <div>
                    <div className={styles.statLabel}>입장 가능 시간</div>
                    <div className={styles.statValue}>13:20부터</div>
                  </div>
                </div>
                <div className={styles.waitStat}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <div>
                    <div className={styles.statLabel}>예상 소요 시간</div>
                    <div className={styles.statValue}>45분</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live chat state */}
          {phase === 'live' && (
            <div className={styles.chatArea}>
              {/* Messages */}
              <div className={styles.messageList}>
                {MOCK_MESSAGES.map((msg) => (
                  <div key={msg.id} className={`${styles.messageRow} ${msg.side === 'right' ? styles.messageRowRight : ''}`}>
                    {msg.side === 'left' && <div className={styles.msgAvatar} />}
                    <div className={`${styles.msgBubble} ${msg.side === 'right' ? styles.bubbleRight : styles.bubbleLeft}`} />
                    <span className={styles.msgTime}>{msg.time}</span>
                    {msg.side === 'right' && <div className={styles.msgAvatar} />}
                  </div>
                ))}
                <div className={styles.systemMsg}>선생님이 입장했어요.</div>
              </div>

              {/* Quick actions */}
              <div className={styles.quickActions}>
                {QUICK_ACTIONS.map((action, i) => (
                  <button key={i} className={styles.quickBtn}>
                    {action}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className={styles.inputRow}>
                <input
                  type="text"
                  className={styles.msgInput}
                  placeholder="메시지를 입력하세요..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && message.trim()) setMessage('');
                  }}
                />
                <button className={styles.attachBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <button
                  className={styles.sendBtn}
                  disabled={!message.trim()}
                  onClick={() => { if (message.trim()) setMessage(''); }}
                >
                  전송
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Guide panel */}
        <div className={styles.guidePanel}>
          <div className={styles.guideTitle}>빠른 학습 가이드</div>
          <div className={styles.guideSection}>
            <div className={styles.guideSectionTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              오늘의 목표
            </div>
            <p className={styles.guideSectionText}>
              관계대명사가 필요한 문장을 이해하고 알맞은 관계대명사를 사용해 문장 완성하기
            </p>
          </div>
          {phase === 'live' && (
            <div className={styles.guideSection}>
              <div className={styles.progressRow}>
                <span className={styles.guideSectionTitle}>진행률</span>
                <span className={styles.progressPct}>72%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: '72%' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {isLeaveModalOpen && (
        <LeaveSessionModal
          onClose={() => setIsLeaveModalOpen(false)}
          onLeave={handleLeave}
        />
      )}
      {isEndModalOpen && (
        <StudentSessionEndModal
          onClose={() => setIsEndModalOpen(false)}
          onNext={handleEndNext}
        />
      )}
    </div>
  );
};
