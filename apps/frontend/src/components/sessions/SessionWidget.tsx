'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Paperclip } from 'lucide-react';
import { SessionSidebar } from './SessionSidebar';
import { SessionEndModal } from './SessionEndModal';
import { StudentMonitorGrid } from './StudentMonitorGrid';
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

function formatTimeOnly(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

interface SessionWidgetProps {
  classId: string;
  sessionId: string;
  initialPhase: Phase;
  sessionName?: string;
  sessionDescription?: string;
  scheduledStart?: string;
  joinableFrom?: string;
  estimatedMinutes?: number;
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
  sessionDescription,
  scheduledStart,
  joinableFrom,
  estimatedMinutes,
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
  const [activeTab, setActiveTab] = useState<'chat' | 'monitor'>('chat');
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
    }).catch(() => { });
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

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

      socket.on('student_analysis_ready', (data: { dialog_id: number; student_id: string; analysis?: StudentAnalysis } & StudentAnalysis) => {
        const analysis: StudentAnalysis = data.analysis ?? data;
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

  // loadChat은 getSessionStudents().then() 안에서 dialogMapRef 채운 후 호출됨

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
            sessionDescription={sessionDescription}
            scheduledStart={scheduledStart}
            joinableFrom={joinableFrom}
            estimatedMinutes={estimatedMinutes}
            loading={loading}
            onStart={handleStart}
            onBack={() => router.push(`/t/classes/${classId}`)}
            students={students}
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
            activeTab={activeTab}
            onTabChange={setActiveTab}
            localStudents={localStudents}
            analysisMap={analysisMap}
          />
        )}
      </div>

      {isEndConfirmOpen && (
        <SessionEndModal
          sessionName={sessionName}
          localStudents={localStudents}
          sessionActiveTime={sessionActiveTime}
          analysisMap={analysisMap}
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
  sessionDescription?: string;
  scheduledStart?: string;
  joinableFrom?: string;
  estimatedMinutes?: number;
  loading: boolean;
  onStart: () => void;
  onBack: () => void;
  students: AttendanceStudent[];
}

const WaitingView: React.FC<WaitingProps> = ({
  sessionName,
  sessionDescription,
  scheduledStart,
  joinableFrom,
  estimatedMinutes,
  loading,
  onStart,
  onBack,
  students,
}) => (
  <div className={styles.mainContent}>
    <div className={styles.topBar}>
      <div className={styles.topBarLeft}>
        <div>
          <div className={styles.sessionName}>{sessionName ?? '세션'}</div>
          {sessionDescription && (
            <div className={styles.sessionDesc}>{sessionDescription}</div>
          )}
        </div>
      </div>
      <div className={styles.topBarRight}>
        <span className={styles.statusBadge}>시작 대기</span>
        {scheduledStart && (
          <span className={styles.timerText}>
            시작 {formatTimeOnly(scheduledStart)} | {students.length > 0 ? `${students.length}명 입장` : '0분 경과'}
          </span>
        )}
        <button className={styles.leaveBtn} onClick={onBack}>나가기</button>
      </div>
    </div>

    <div className={styles.waitCard}>
      <div className={styles.illustration}>
        <Image src="/images/sessionstart.png" alt="세션 시작 대기" width={180} height={140} />
      </div>
      <h2 className={styles.waitTitle}>곧 수업이 시작됩니다!</h2>
      <p className={styles.waitDesc}>
        학생들이 입장 중입니다.<br />
        준비를 마친 뒤 수업을 시작해 주세요.
      </p>
      <button className={styles.startBtn} onClick={onStart} disabled={loading}>
        {loading ? '시작 중...' : '세션 시작하기'}
      </button>

      {(scheduledStart || joinableFrom || estimatedMinutes) && (
        <div className={styles.infoBar}>
          {scheduledStart && (
            <div className={styles.infoItem}>
              <Image src="/images/akar-icons_clock.png" alt="" width={28} height={28} />
              <div>
                <div className={styles.infoLabel}>시작 예정</div>
                <div className={styles.infoValue}>{formatTimeOnly(scheduledStart)}</div>
              </div>
            </div>
          )}
          {joinableFrom && (
            <div className={styles.infoItem}>
              <Image src="/images/famicons_log-in-outline.png" alt="" width={28} height={28} />
              <div>
                <div className={styles.infoLabel}>입장 가능 시간</div>
                <div className={styles.infoValue}>{formatTimeOnly(joinableFrom)}부터</div>
              </div>
            </div>
          )}
          {estimatedMinutes && (
            <div className={styles.infoItem}>
              <Image src="/images/icon-park-outline_timer.png" alt="" width={28} height={28} />
              <div>
                <div className={styles.infoLabel}>예상 소요 시간</div>
                <div className={styles.infoValue}>{estimatedMinutes}분</div>
              </div>
            </div>
          )}
        </div>
      )}
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
  activeTab: 'chat' | 'monitor';
  onTabChange: (tab: 'chat' | 'monitor') => void;
  localStudents: AttendanceStudent[];
  analysisMap: Map<string, StudentAnalysis>;
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
  activeTab,
  onTabChange,
  localStudents,
  analysisMap,
}) => (
  <div className={styles.mainContent}>
    <div className={styles.chatCard}>
      <div className={styles.chatHeader}>
        <button className={styles.chatBackBtn} onClick={onBack}>‹</button>
        <div className={styles.chatAvatar} />
        <div className={styles.chatTitleBlock}>
          <h2 className={styles.chatTitle}>{studentName} 학생과 AI 코치</h2>
          {currentTopic && (
            <span className={styles.chatSub}>{currentTopic} 학습 중</span>
          )}
        </div>
        <div className={styles.tabGroup}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.tabBtnActive : ''}`}
            onClick={() => onTabChange('chat')}
            type="button"
          >
            채팅
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'monitor' ? styles.tabBtnActive : ''}`}
            onClick={() => onTabChange('monitor')}
            type="button"
          >
            학생 관찰
          </button>
        </div>
      </div>

      {activeTab === 'chat' ? (
        <>
          {warningText && (
            <div className={styles.warningBanner}>
              <span className={styles.warningArrow}>→</span>
              {warningText}
            </div>
          )}

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
              <Paperclip size={18} />
            </button>
            <button
              className={styles.sendBtn}
              onClick={onSendIntervention}
              disabled={!interventionInput.trim() || isSendingIntervention}
            >
              {isSendingIntervention ? '전송 중...' : '전송'}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.monitorPanel}>
          <StudentMonitorGrid students={localStudents} analysisMap={analysisMap} />
        </div>
      )}
    </div>
  </div>
);
