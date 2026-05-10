'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/actions/sessions';
import { joinSession } from '@/actions/sessions';
import { getClass } from '@/actions/classes';
import { getMessages, type ChatMessage } from '@/actions/livechat';
import { createClient } from '@/utils/supabase/client';
import { computeSessionStatus } from '@/utils/sessionStatus';
import { LeaveSessionModal } from './LeaveSessionModal';
import { StudentSessionEndModal } from './StudentSessionEndModal';
import styles from './StudentLiveSession.module.css';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const QUICK_ACTIONS = ['도움이 필요해요', '예시를 보여주세요', '다시 설명해 주세요'];

interface Props {
  classId: string;
  sessionId: string;
}

type Phase = 'loading' | 'waiting' | 'live';

export const StudentLiveSession: React.FC<Props> = ({ classId, sessionId }) => {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionObjective, setSessionObjective] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [dialogId, setDialogId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState('');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${m}`;
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, scrollToBottom]);

  // Load session + class info, auto-join if live
  useEffect(() => {
    Promise.all([getSession(sessionId), getClass(classId)])
      .then(async ([session, cls]) => {
        const gradeStr = cls.grade ? `${cls.grade}학년 ` : '';
        setSessionTitle(`${gradeStr}${cls.subject} / ${session.session_name}`);
        setSessionObjective(session.objective || '');

        if (session.scheduled_start) {
          const d = new Date(session.scheduled_start);
          const h = d.getHours();
          const m = d.getMinutes().toString().padStart(2, '0');
          setScheduledStart(`${h}:${m}`);
        }

        const computed = computeSessionStatus(session);
        if (computed === 'live') {
          try {
            const { dialog_id } = await joinSession(sessionId);
            const history = await getMessages(dialog_id);
            setDialogId(dialog_id);
            setMessages(history);
            setStartTime(session.started_at ? new Date(session.started_at) : new Date());
            setPhase('live');
          } catch {
            setPhase('live'); // show live UI even if join partially fails
          }
        } else {
          setPhase('waiting');
        }
      })
      .catch(() => setPhase('waiting'));
  }, [sessionId, classId]);

  // Elapsed time ticker
  useEffect(() => {
    if (!startTime) return;
    const update = () => {
      const mins = Math.floor((Date.now() - startTime.getTime()) / 60000);
      setElapsed(`${mins}분 경과`);
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [startTime]);

  const handleJoin = async () => {
    setPhase('loading');
    try {
      const session = await getSession(sessionId);
      const computed = computeSessionStatus(session);
      if (computed !== 'live') {
        setPhase('waiting');
        return;
      }
      const { dialog_id } = await joinSession(sessionId);
      const history = await getMessages(dialog_id);
      setDialogId(dialog_id);
      setMessages(history);
      setStartTime(session.started_at ? new Date(session.started_at) : new Date());
      setPhase('live');
    } catch {
      setPhase('waiting');
    }
  };

  const sendMessage = async (content: string) => {
    if (!dialogId || !content.trim() || isSending || isStreaming) return;

    setIsSending(true);
    setIsStreaming(true);
    setStreamingContent('');

    // Optimistic student message
    const optimisticMsg: ChatMessage = {
      id: Date.now() * -1,
      dialog_id: dialogId,
      sender_type: 'STUDENT',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');

    try {
      const supabase = createClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      const response = await fetch(`${BACKEND_URL}/livechat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dialog_id: dialogId, content }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const chunk: string = parsed.chunk ?? '';
            accumulated += chunk;
            setStreamingContent(accumulated);
          } catch { /* ignore malformed lines */ }
        }
      }

      // Commit streamed AI message
      const aiMsg: ChatMessage = {
        id: Date.now(),
        dialog_id: dialogId,
        sender_type: 'AI',
        content: accumulated,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setStreamingContent('');
      setIsStreaming(false);
      setIsSending(false);
    }
  };

  const handleLeave = () => {
    setIsLeaveModalOpen(false);
    router.push(`/s/classes/${classId}`);
  };

  if (phase === 'loading') {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#6B6B6B', fontSize: 14 }}>
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        {/* Main session area */}
        <div className={styles.mainArea}>
          {/* Header */}
          <div className={styles.sessionHeader}>
            <button className={styles.backBtn} onClick={() => setIsLeaveModalOpen(true)}>‹</button>
            <div className={styles.headerInfo}>
              <div className={styles.sessionTitle}>{sessionTitle || '세션'}</div>
            </div>
            <div className={styles.headerRight}>
              {phase === 'waiting' ? (
                <span className={styles.waitingChip}>시작 대기</span>
              ) : (
                <div className={styles.liveChipRow}>
                  <span className={styles.liveChip}>LIVE 진행 중</span>
                  {elapsed && <span className={styles.elapsed}>{elapsed}</span>}
                </div>
              )}
              <button className={styles.leaveBtn} onClick={() => setIsLeaveModalOpen(true)}>나가기</button>
            </div>
          </div>

          {/* Waiting state */}
          {phase === 'waiting' && (
            <div className={styles.waitCard}>
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
              <button className={styles.joinBtn} onClick={handleJoin}>세션 참여하기</button>
              {scheduledStart && (
                <div className={styles.waitStats}>
                  <div className={styles.waitStat}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <div>
                      <div className={styles.statLabel}>시작 예정</div>
                      <div className={styles.statValue}>{scheduledStart}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live chat state */}
          {phase === 'live' && (
            <div className={styles.chatArea}>
              <div className={styles.messageList}>
                {messages.map((msg) => {
                  const isStudent = msg.sender_type === 'STUDENT';
                  const isTeacher = msg.sender_type === 'TEACHER';
                  return (
                    <div key={msg.id} className={`${styles.messageRow} ${isStudent ? styles.messageRowRight : ''}`}>
                      {!isStudent && <div className={styles.msgAvatar} />}
                      <div className={styles.msgBubbleContent}>
                        {isTeacher && <div className={styles.senderLabel}>선생님</div>}
                        <div className={`${styles.msgBubble} ${isStudent ? styles.bubbleRight : styles.bubbleLeft}`}>
                          {msg.content}
                        </div>
                      </div>
                      <span className={styles.msgTime}>{formatTime(msg.created_at)}</span>
                      {isStudent && <div className={styles.msgAvatar} />}
                    </div>
                  );
                })}

                {/* Streaming AI response */}
                {isStreaming && (
                  <div className={styles.messageRow}>
                    <div className={styles.msgAvatar} />
                    <div className={styles.msgBubbleContent}>
                      <div className={`${styles.msgBubble} ${styles.bubbleLeft}`}>
                        {streamingContent || <span className={styles.typingDot}>●●●</span>}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick actions */}
              <div className={styles.quickActions}>
                {QUICK_ACTIONS.map((action) => (
                  <button key={action} className={styles.quickBtn} onClick={() => setInput(action)}>
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
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  disabled={isSending}
                />
                <button
                  className={styles.sendBtn}
                  disabled={!input.trim() || isSending}
                  onClick={() => sendMessage(input)}
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
          {sessionObjective && (
            <div className={styles.guideSection}>
              <div className={styles.guideSectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                오늘의 목표
              </div>
              <p className={styles.guideSectionText}>{sessionObjective}</p>
            </div>
          )}
        </div>
      </div>

      {isLeaveModalOpen && (
        <LeaveSessionModal onClose={() => setIsLeaveModalOpen(false)} onLeave={handleLeave} />
      )}
      {isEndModalOpen && (
        <StudentSessionEndModal onClose={() => setIsEndModalOpen(false)} onNext={() => { setIsEndModalOpen(false); router.push(`/s/classes/${classId}`); }} />
      )}
    </div>
  );
};
