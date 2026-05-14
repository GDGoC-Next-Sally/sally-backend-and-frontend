'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Check, ChevronLeft } from 'lucide-react';
import { getSession } from '@/actions/sessions';
import { joinSession } from '@/actions/sessions';
import { getClass } from '@/actions/classes';
import { getMessages, type ChatMessage } from '@/actions/livechat';
import { createClient } from '@/utils/supabase/client';
import { computeSessionStatus } from '@/utils/sessionStatus';
import { LeaveSessionModal } from './LeaveSessionModal';
import { StudentSessionEndModal } from './StudentSessionEndModal';
import ProfileSallyIcon from '@/components/icons/ProfileSallyIcon';
import ProfileStudentIcon from '@/components/icons/ProfileStudentIcon';
import ProfileTeacherIcon from '@/components/icons/ProfileTeacherIcon';
import styles from './StudentLiveSession.module.css';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL 
  || (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:3001' 
      : '');

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
  const [teacherName, setTeacherName] = useState('');
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
  const handleJoinRef = useRef<() => Promise<void>>(async () => {});

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
        setTeacherName(cls.users?.name ? `${cls.users.name} 선생님` : '');
        setSessionObjective(session.objective || '');

        if (session.scheduled_start) {
          const d = new Date(session.scheduled_start);
          const h = d.getHours().toString().padStart(2, '0');
          const m = d.getMinutes().toString().padStart(2, '0');
          setScheduledStart(`${h}:${m}`);
        }

        const computed = computeSessionStatus(session);
        if (computed === 'live') {
          try {
            const result = await joinSession(sessionId);
            const dialog_id = result.dialog.id;
            const history = await getMessages(dialog_id);
            setDialogId(dialog_id);
            setMessages(history);
            setStartTime(session.started_at ? new Date(session.started_at) : new Date());
            setPhase('live');
            // 대화 이력이 없으면 AI 첫인사 요청
            if (history.length === 0) {
              fetchGreeting(dialog_id);
            }
          } catch {
            setPhase('waiting');
          }
        } else {
          setPhase('waiting');
        }
      })
      .catch(() => setPhase('waiting'));
  }, [sessionId, classId]);

  // Socket: teacher intervention + session_finished
  const dialogIdRef = useRef<number | null>(null);
  useEffect(() => { dialogIdRef.current = dialogId; }, [dialogId]);

  useEffect(() => {
    let socket: import('socket.io-client').Socket;
    const init = async () => {
      const { io } = await import('socket.io-client');
      const supabase = createClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      socket = io(BACKEND_URL, { auth: { token }, transports: ['websocket', 'polling'] });

      socket.on('connect', () => {
        socket.emit('join_room', { room: `session:${sessionId}` });
      });

      socket.on('teacher_intervention', (msg: ChatMessage) => {
        if (msg.dialog_id === dialogIdRef.current) {
          setMessages(prev => [...prev, msg]);
        }
      });

      socket.on('session_finished', () => {
        setIsEndModalOpen(true);
      });

      socket.on('session_started', () => {
        handleJoinRef.current();
      });
    };
    init();
    return () => { socket?.disconnect(); };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const result = await joinSession(sessionId);
      const dialog_id = result.dialog.id;
      const history = await getMessages(dialog_id);
      setDialogId(dialog_id);
      setMessages(history);
      setStartTime(session.started_at ? new Date(session.started_at) : new Date());
      setPhase('live');
      if (history.length === 0) {
        fetchGreeting(dialog_id);
      }
    } catch {
      setPhase('waiting');
    }
  };

  useEffect(() => { handleJoinRef.current = handleJoin; });

  const fetchGreeting = async (dialog_id: number) => {
    setIsStreaming(true);
    setStreamingContent('');
    let accumulated = '';
    try {
      const supabase = createClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      const response = await fetch(`${BACKEND_URL}/livechat/greeting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dialog_id }),
      });

      if (!response.ok || !response.body) {
        console.error('Greeting request failed:', response.status);
      } else {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

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
              accumulated += parsed.chunk ?? '';
              setStreamingContent(accumulated);
            } catch { /* ignore */ }
          }
        }

        if (accumulated) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            dialog_id,
            sender_type: 'AI',
            content: accumulated,
            created_at: new Date().toISOString(),
          }]);
        }
      }
    } catch (err) {
      console.error('Greeting error:', err);
    } finally {
      setStreamingContent('');
      setIsStreaming(false);
      // SSE 파싱 실패 폴백: DB에서 직접 로드
      if (!accumulated) {
        try {
          await new Promise(r => setTimeout(r, 800));
          const saved = await getMessages(dialog_id);
          if (saved.length > 0) setMessages(saved);
        } catch { /* ignore */ }
      }
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
            <button className={styles.backBtn} onClick={() => setIsLeaveModalOpen(true)}><ChevronLeft size={20} /></button>
            <div className={styles.headerInfo}>
              <div className={styles.sessionTitle}>{sessionTitle || '세션'}</div>
              <div className={styles.teacherName}>{teacherName}</div>
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
                    <Clock size={18} color="#6B6B6B" />
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
                  const LeftIcon = isTeacher ? ProfileTeacherIcon : ProfileSallyIcon;
                  return (
                    <div key={msg.id} className={`${styles.messageRow} ${isStudent ? styles.messageRowRight : ''}`}>
                      {!isStudent && <div className={styles.msgAvatar}><LeftIcon width={36} height={36} /></div>}
                      <div className={styles.msgBubbleContent}>
                        {isTeacher && <div className={styles.senderLabel}>선생님</div>}
                        <div className={`${styles.msgBubble} ${isStudent ? styles.bubbleRight : styles.bubbleLeft}`}>
                          {msg.content}
                        </div>
                      </div>
                      <span className={styles.msgTime}>{formatTime(msg.created_at)}</span>
                      {isStudent && <div className={styles.msgAvatar}><ProfileStudentIcon width={36} height={36} /></div>}
                    </div>
                  );
                })}

                {/* Streaming AI response */}
                {isStreaming && (
                  <div className={styles.messageRow}>
                    <div className={styles.msgAvatar}><ProfileSallyIcon width={36} height={36} /></div>
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
                <Check size={16} color="#22C55E" strokeWidth={2.5} />
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
