'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SessionSidebar } from './SessionSidebar';
import { ConfirmModal } from '../common/ConfirmModal';
import { type AttendanceStudent } from '@/actions/sessions';
import { getSessionStudents, getStudentDetail, sendIntervention, type ChatMessage } from '@/actions/livechat';
import { createClient } from '@/utils/supabase/client';
import styles from './SessionWidget.module.css';

type Phase = 'waiting' | 'active';

export interface StudentAnalysis {
  understanding_score?: number;
  current_topic?: string;
  student_emotion?: string;
  one_line_summary?: string;
  need_intervention?: boolean;
  question_intent?: string;
  engagement_level?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface SessionWidgetProps {
  classId: string;
  sessionId: string;
  initialPhase: Phase;
  sessionName?: string;
  students: AttendanceStudent[];
  onStart: () => Promise<void>;
  onFinish: () => Promise<void>;
  onRefreshStudents: () => Promise<void>;
}

export const SessionWidget: React.FC<SessionWidgetProps> = ({
  classId,
  sessionId,
  initialPhase,
  sessionName,
  students,
  onStart,
  onFinish,
  onRefreshStudents,
}) => {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [localStudents, setLocalStudents] = useState<AttendanceStudent[]>(students);
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(
    students.length > 0 ? students[0].userId : undefined
  );
  const [selectedMessages, setSelectedMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);
  const [interventionInput, setInterventionInput] = useState('');
  const [isSendingIntervention, setIsSendingIntervention] = useState(false);
  const [analysisMap, setAnalysisMap] = useState<Map<string, StudentAnalysis>>(new Map());
  const [sessionActiveTime, setSessionActiveTime] = useState<Date | null>(
    initialPhase === 'active' ? new Date() : null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const revDialogMapRef = useRef<Map<number, string>>(new Map());
  const dialogMapRef = useRef<Map<string, number>>(new Map());
  const selectedStudentIdRef = useRef<string | undefined>(selectedStudentId);
  const socketRef = useRef<import('socket.io-client').Socket | null>(null);

  useEffect(() => {
    selectedStudentIdRef.current = selectedStudentId;
  }, [selectedStudentId]);

  useEffect(() => {
    setLocalStudents(prev => {
      const merged = [...students];
      for (const local of prev) {
        if (!merged.some(s => s.userId === local.userId)) merged.push(local);
      }
      return merged;
    });
    if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].userId);
    }
  }, [students]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedMessages]);

  useEffect(() => {
    getSessionStudents(sessionId).then(students => {
      students.forEach(({ studentId, dialogId }) => {
        dialogMapRef.current.set(studentId, dialogId);
        revDialogMapRef.current.set(dialogId, studentId);
      });
      if (selectedStudentIdRef.current && initialPhase === 'active') {
        loadChat(selectedStudentIdRef.current);
      }
    }).catch(() => {});
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket
  useEffect(() => {
    let socket: import('socket.io-client').Socket;

    const init = async () => {
      const { io } = await import('socket.io-client');
      const supabase = createClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      socket = io(BACKEND_URL, { auth: { token }, transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join_room', { room: `session:${sessionId}` });
      });

      socket.on('student_joined', (data: { student_id: string; student_name: string; dialog_id: number }) => {
        dialogMapRef.current.set(data.student_id, data.dialog_id);
        revDialogMapRef.current.set(data.dialog_id, data.student_id);
        setLocalStudents(prev => {
          if (prev.some(s => s.userId === data.student_id)) return prev;
          return [...prev, { userId: data.student_id, name: data.student_name, joinedAt: new Date().toISOString() }];
        });
        setSelectedStudentId(prev => prev ?? data.student_id);
      });

      socket.on('student_message', (msg: ChatMessage) => {
        const studentId = revDialogMapRef.current.get(msg.dialog_id);
        if (studentId && studentId === selectedStudentIdRef.current) {
          setSelectedMessages(prev => [...prev, msg]);
        }
      });

      socket.on('ai_message', (msg: ChatMessage) => {
        const studentId = revDialogMapRef.current.get(msg.dialog_id);
        if (studentId && studentId === selectedStudentIdRef.current) {
          setSelectedMessages(prev => [...prev, msg]);
        }
      });

      socket.on('student_analysis_ready', (data: { dialog_id: number; student_id: string } & StudentAnalysis) => {
        const { dialog_id: _d, ...analysis } = data;
        setAnalysisMap(prev => new Map(prev).set(data.student_id, analysis));
      });

      socket.on('student_warning', (data: { student_id: string }) => {
        setAnalysisMap(prev => {
          const existing = prev.get(data.student_id) ?? {};
          return new Map(prev).set(data.student_id, { ...existing, need_intervention: true });
        });
      });

      socket.on('session_started', () => setPhase('active'));
      socket.on('session_finished', () => router.push(`/t/classes/${classId}`));
    };

    init();
    return () => { socket?.disconnect(); };
  }, [sessionId, classId, router]);

  const loadChat = useCallback(async (studentId: string) => {
    const dialogId = dialogMapRef.current.get(studentId);
    if (!dialogId) {
      setSelectedMessages([]);
      return;
    }
    setIsLoadingChat(true);
    try {
      const detail = await getStudentDetail(dialogId);
      setSelectedMessages(detail.messages);
    } catch {
      setSelectedMessages([]);
    } finally {
      setIsLoadingChat(false);
    }
  }, []);

  const handleSelectStudent = useCallback((id: string) => {
    setSelectedStudentId(id);
    loadChat(id);
  }, [loadChat]);

  useEffect(() => {
    if (phase === 'active' && selectedStudentId) {
      loadChat(selectedStudentId);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStart();
      await onRefreshStudents();
      setPhase('active');
      setSessionActiveTime(new Date());
    } catch (e) {
      alert(e instanceof Error ? e.message : '세션 시작에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishConfirm = async () => {
    setIsEndConfirmOpen(false);
    setLoading(true);
    try {
      await onFinish();
      router.push(`/t/classes/${classId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : '세션 종료에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const selectedStudent = localStudents.find(s => s.userId === selectedStudentId);
  const selectedAnalysis = selectedStudentId ? analysisMap.get(selectedStudentId) : undefined;

  const handleSendIntervention = async () => {
    if (!selectedStudentId || !interventionInput.trim() || isSendingIntervention) return;
    const dialogId = dialogMapRef.current.get(selectedStudentId);
    if (!dialogId) return;
    setIsSendingIntervention(true);
    try {
      const msg = await sendIntervention(dialogId, interventionInput.trim());
      setSelectedMessages(prev => [...prev, msg]);
      setInterventionInput('');
    } catch (e) {
      alert(e instanceof Error ? e.message : '개입 메시지 전송에 실패했습니다.');
    } finally {
      setIsSendingIntervention(false);
    }
  };

  return (
    <>
      <div className={styles.layout}>
        <SessionSidebar
          phase={phase}
          students={localStudents}
          selectedId={selectedStudentId}
          onSelect={handleSelectStudent}
          onRefresh={onRefreshStudents}
          onEnd={() => setIsEndConfirmOpen(true)}
          analysisMap={analysisMap}
          sessionStartTime={sessionActiveTime}
        />

        {phase === 'waiting' ? (
          <WaitingView
            sessionName={sessionName}
            loading={loading}
            onStart={handleStart}
            onBack={() => router.push(`/t/classes/${classId}`)}
          />
        ) : (
          <ActiveView
            loading={loading}
            studentName={selectedStudent?.name ?? '학생'}
            currentTopic={selectedAnalysis?.current_topic}
            warningText={
              selectedAnalysis?.need_intervention && selectedAnalysis?.one_line_summary
                ? selectedAnalysis.one_line_summary
                : undefined
            }
            messages={selectedMessages}
            isLoadingChat={isLoadingChat}
            messagesEndRef={messagesEndRef}
            onBack={() => router.push(`/t/classes/${classId}`)}
            interventionInput={interventionInput}
            onInterventionChange={setInterventionInput}
            onSendIntervention={handleSendIntervention}
            isSendingIntervention={isSendingIntervention}
          />
        )}
      </div>

      {isEndConfirmOpen && (
        <ConfirmModal
          title="세션을 종료하시겠습니까?"
          description="세션을 종료하면 학생들이 더 이상 참여할 수 없습니다."
          confirmLabel="종료"
          onClose={() => setIsEndConfirmOpen(false)}
          onConfirm={handleFinishConfirm}
        />
      )}
    </>
  );
};

/* ── Waiting ─────────────────────────────────────────────────────────────────── */

interface WaitingProps {
  sessionName?: string;
  loading: boolean;
  onStart: () => void;
  onBack: () => void;
}

const WaitingView: React.FC<WaitingProps> = ({ sessionName, loading, onStart, onBack }) => (
  <div className={styles.mainContent}>
    <div className={styles.topBar}>
      <div className={styles.topBarLeft}>
        <button className={styles.backBtn} onClick={onBack}>&lt;</button>
        <div>
          <div className={styles.sessionName}>{sessionName ?? '세션'}</div>
          <div className={styles.sessionDesc}>학생들이 입장 중입니다</div>
        </div>
      </div>
      <div className={styles.topBarRight}>
        <span className={styles.statusBadge}>시작 대기</span>
        <button className={styles.leaveBtn} onClick={onBack}>나가기</button>
      </div>
    </div>

    <div className={styles.waitCard}>
      <div className={styles.illustration}>
        <svg width="100" height="80" viewBox="0 0 100 80" fill="none">
          <circle cx="50" cy="28" r="24" fill="#E5F9F0" />
          <circle cx="50" cy="22" r="8" fill="#22CB84" opacity="0.7" />
          <rect x="30" y="44" width="40" height="20" rx="4" fill="#22CB84" opacity="0.5" />
          <circle cx="32" cy="56" r="6" fill="#22CB84" opacity="0.8" />
          <circle cx="50" cy="56" r="6" fill="#22CB84" opacity="0.8" />
          <circle cx="68" cy="56" r="6" fill="#22CB84" opacity="0.8" />
        </svg>
      </div>
      <h2 className={styles.waitTitle}>곧 수업이 시작됩니다!</h2>
      <p className={styles.waitDesc}>
        학생들이 입장 중입니다.<br />
        준비를 마친 뒤 수업을 시작해 주세요.
      </p>
      <button className={styles.startBtn} onClick={onStart} disabled={loading}>
        {loading ? '시작 중...' : '세션 시작하기'}
      </button>
    </div>
  </div>
);

/* ── Active ──────────────────────────────────────────────────────────────────── */

interface ActiveProps {
  loading: boolean;
  studentName: string;
  currentTopic?: string;
  warningText?: string;
  messages: ChatMessage[];
  isLoadingChat: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  interventionInput: string;
  onInterventionChange: (v: string) => void;
  onSendIntervention: () => void;
  isSendingIntervention: boolean;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${m}`;
};

const ActiveView: React.FC<ActiveProps> = ({
  studentName,
  currentTopic,
  warningText,
  messages,
  isLoadingChat,
  messagesEndRef,
  onBack,
  interventionInput,
  onInterventionChange,
  onSendIntervention,
  isSendingIntervention,
}) => (
  <div className={styles.mainContent}>
    <div className={styles.chatCard}>
      {/* 채팅 헤더 */}
      <div className={styles.chatHeader}>
        <button className={styles.chatBackBtn} onClick={onBack}>‹</button>
        <div className={styles.chatAvatar} />
        <div className={styles.chatTitleBlock}>
          <h2 className={styles.chatTitle}>{studentName} 학생과 AI 코치</h2>
          {currentTopic && (
            <span className={styles.chatSub}>{currentTopic} 학습 중</span>
          )}
        </div>
      </div>

      {/* 경고 배너 */}
      {warningText && (
        <div className={styles.warningBanner}>
          <span className={styles.warningArrow}>→</span>
          {warningText}
        </div>
      )}

      {/* 메시지 영역 */}
      <div className={styles.chatMessages}>
        {isLoadingChat ? (
          <div className={styles.chatEmpty}>채팅 기록을 불러오는 중...</div>
        ) : messages.length === 0 ? (
          <div className={styles.chatEmpty}>아직 대화 내역이 없습니다.</div>
        ) : (
          messages.map((msg) => {
            const isStudent = msg.sender_type === 'STUDENT';
            const isTeacher = msg.sender_type === 'TEACHER';
            return (
              <div
                key={msg.id}
                className={`${styles.messageRow} ${isStudent ? styles.messageRowRight : ''}`}
              >
                {!isStudent && <div className={styles.messageAvatar} />}
                <div className={styles.messageBubbleWrap}>
                  {isTeacher && <div className={styles.senderLabel}>선생님 개입</div>}
                  <div
                    className={`${styles.bubble} ${isStudent ? styles.bubbleRight : styles.bubbleLeft} ${isTeacher ? styles.bubbleTeacher : ''}`}
                  >
                    {msg.content}
                  </div>
                  <div className={`${styles.msgTime} ${isStudent ? styles.msgTimeRight : ''}`}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
                {isStudent && <div className={styles.messageAvatar} />}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 개입 입력바 */}
      <div className={styles.interventionBar}>
        <input
          type="text"
          className={styles.interventionInput}
          placeholder="메시지를 입력하세요..."
          value={interventionInput}
          onChange={(e) => onInterventionChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && interventionInput.trim()) {
              e.preventDefault();
              onSendIntervention();
            }
          }}
          disabled={isSendingIntervention}
        />
        <button className={styles.attachBtn} type="button" title="파일 첨부">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <button
          className={styles.sendBtn}
          onClick={onSendIntervention}
          disabled={!interventionInput.trim() || isSendingIntervention}
        >
          {isSendingIntervention ? '전송 중...' : '전송'}
        </button>
      </div>
    </div>
  </div>
);
