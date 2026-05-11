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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Refs for socket handlers (avoids stale closures)
  const revDialogMapRef = useRef<Map<number, string>>(new Map()); // dialog_id → student_id
  const dialogMapRef = useRef<Map<string, number>>(new Map());    // student_id → dialog_id
  const selectedStudentIdRef = useRef<string | undefined>(selectedStudentId);
  const socketRef = useRef<import('socket.io-client').Socket | null>(null);

  // Keep selectedStudentIdRef in sync
  useEffect(() => {
    selectedStudentIdRef.current = selectedStudentId;
  }, [selectedStudentId]);

  // Sync parent students prop into local state (merge, don't overwrite socket-added students)
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

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedMessages]);

  // Load dialog map via monitoring API, then immediately load chat for selected student
  useEffect(() => {
    getSessionStudents(sessionId).then(students => {
      students.forEach(({ studentId, dialogId }) => {
        dialogMapRef.current.set(studentId, dialogId);
        revDialogMapRef.current.set(dialogId, studentId);
      });
      // Dialog map is now ready — load chat if already in active phase
      if (selectedStudentIdRef.current && initialPhase === 'active') {
        loadChat(selectedStudentIdRef.current);
      }
    }).catch(() => {});
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Connect socket
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
        // Join session room to receive student_joined events
        socket.emit('join_room', { room: `session:${sessionId}` });
      });

      // New student joins → update sidebar + dialog map
      socket.on('student_joined', (data: { student_id: string; student_name: string; dialog_id: number }) => {
        dialogMapRef.current.set(data.student_id, data.dialog_id);
        revDialogMapRef.current.set(data.dialog_id, data.student_id);
        setLocalStudents(prev => {
          if (prev.some(s => s.userId === data.student_id)) return prev;
          return [...prev, { userId: data.student_id, name: data.student_name, joinedAt: new Date().toISOString() }];
        });
        // Auto-select first student if none selected
        setSelectedStudentId(prev => prev ?? data.student_id);
      });

      // Student sends a message → append if that student is selected
      socket.on('student_message', (msg: ChatMessage) => {
        const studentId = revDialogMapRef.current.get(msg.dialog_id);
        if (studentId && studentId === selectedStudentIdRef.current) {
          setSelectedMessages(prev => [...prev, msg]);
        }
      });

      // AI responds → append if that student is selected
      socket.on('ai_message', (msg: ChatMessage) => {
        const studentId = revDialogMapRef.current.get(msg.dialog_id);
        if (studentId && studentId === selectedStudentIdRef.current) {
          setSelectedMessages(prev => [...prev, msg]);
        }
      });

      // Real-time student analysis update
      socket.on('student_analysis_ready', (data: { dialog_id: number; student_id: string } & StudentAnalysis) => {
        const { dialog_id: _d, ...analysis } = data;
        setAnalysisMap(prev => new Map(prev).set(data.student_id, analysis));
      });

      // Student warning — mark need_intervention
      socket.on('student_warning', (data: { student_id: string }) => {
        setAnalysisMap(prev => {
          const existing = prev.get(data.student_id) ?? {};
          return new Map(prev).set(data.student_id, { ...existing, need_intervention: true });
        });
      });

      // Session started/finished by someone else
      socket.on('session_started', () => setPhase('active'));
      socket.on('session_finished', () => router.push(`/t/classes/${classId}`));
    };

    init();
    return () => { socket?.disconnect(); };
  }, [sessionId, classId, router]);

  // Load chat history when selected student changes
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

  // When session starts (waiting → active), load chat for selected student
  // Dialog map is already populated by the time teacher clicks "start"
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
          analysisMap={analysisMap}
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
            sessionName={sessionName}
            loading={loading}
            studentName={selectedStudent?.name ?? '학생'}
            messages={selectedMessages}
            isLoadingChat={isLoadingChat}
            messagesEndRef={messagesEndRef}
            onEnd={() => setIsEndConfirmOpen(true)}
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
  sessionName?: string;
  loading: boolean;
  studentName: string;
  messages: ChatMessage[];
  isLoadingChat: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onEnd: () => void;
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
  sessionName,
  loading,
  studentName,
  messages,
  isLoadingChat,
  messagesEndRef,
  onEnd,
  interventionInput,
  onInterventionChange,
  onSendIntervention,
  isSendingIntervention,
}) => (
  <div className={styles.mainContent}>
    <div className={styles.topBar}>
      <div className={styles.topBarLeft}>
        <div>
          <div className={styles.sessionName}>{sessionName ?? '세션'}</div>
          <div className={styles.sessionDesc}>진행 중</div>
        </div>
      </div>
      <div className={styles.topBarRight}>
        <span className={`${styles.statusBadge} ${styles.statusBadgeActive}`}>진행 중</span>
        <button className={styles.leaveBtn} onClick={onEnd} disabled={loading}>
          {loading ? '종료 중...' : '세션 종료'}
        </button>
      </div>
    </div>

    <div className={styles.chatCard}>
      <div className={styles.chatHeader}>
        <div className={styles.chatTitleBlock}>
          <div className={styles.chatAvatar} />
          <div>
            <h2 className={styles.chatTitle}>{studentName} 학생 · AI 코치 대화</h2>
            <span className={styles.chatSub}>학생이 AI와 나누는 대화를 실시간으로 확인합니다</span>
          </div>
        </div>
      </div>

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

      <div className={styles.interventionBar}>
        <input
          type="text"
          className={styles.interventionInput}
          placeholder="학생에게 개입 메시지를 보내세요..."
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
        <button
          className={styles.interventionSendBtn}
          onClick={onSendIntervention}
          disabled={!interventionInput.trim() || isSendingIntervention}
        >
          {isSendingIntervention ? '전송 중...' : '개입 전송'}
        </button>
      </div>
    </div>
  </div>
);
