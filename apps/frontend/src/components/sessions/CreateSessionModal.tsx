'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Check, CloudUpload, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import { type CreateSessionBody } from '@/actions/sessions';
import { getPublishers, getTextbooks, getUnitPrompts } from '@/actions/supplementary';
import type { Textbook, UnitPrompt } from '@/actions/supplementary';
import styles from './CreateSessionModal.module.css';

type Step = 1 | 2 | 3;

const AI_GUIDE_OPTIONS = [
  { value: 'balanced', label: '균형형 (권장)',  desc: '학생의 수준과 상황에 맞춰 설명 힌트, 질문을 균형있게 제공합니다.' },
  { value: 'hint',     label: '힌트 중심형',    desc: '학생이 스스로 생각할 수 있도록 작은 힌트 위주로 도움을 줍니다.' },
  { value: 'explain',  label: '설명 중심형',    desc: '학생이 이해하기 쉽도록 상세한 설명 위주로 안내합니다.' },
];

const SUBJECTS  = ['국어', '영어', '수학', '과학', '사회', '역사', '도덕', '체육', '음악', '미술', '기술', '정보'];
const SEMESTERS = ['2026년 1학기', '2026년 2학기', '2025년 1학기', '2025년 2학기'];

interface Props {
  open: boolean;
  classId: number;
  onClose: () => void;
  onSubmit: (body: CreateSessionBody) => void | Promise<void>;
  initialStep?: Step;
}

export const CreateSessionModal: React.FC<Props> = ({
  open,
  classId,
  onClose,
  onSubmit,
  initialStep = 1,
}) => {
  const [step, setStep] = useState<Step>(initialStep);

  // Step 1 — 정보 입력
  const [sessionName,    setSessionName]    = useState('');
  const [subject,        setSubject]        = useState('');
  const [semester,       setSemester]       = useState('2026년 1학기');
  const [scheduledDate,  setScheduledDate]  = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd,   setScheduledEnd]   = useState('');

  // Step 2 — 단원 선택 (실 API)
  const [publishers,       setPublishers]       = useState<string[]>([]);
  const [selectedPublisher, setSelectedPublisher] = useState('');
  const [textbooks,        setTextbooks]        = useState<Textbook[]>([]);
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null);
  const [unitPrompts,      setUnitPrompts]      = useState<UnitPrompt[]>([]);
  const [selectedPrompt,   setSelectedPrompt]   = useState<UnitPrompt | null>(null);
  const [loadingBooks,     setLoadingBooks]     = useState(false);
  const [loadingPrompts,   setLoadingPrompts]   = useState(false);

  // Step 3 — AI & 보조자료
  const [aiGuide, setAiGuide] = useState('balanced');
  const [files,   setFiles]   = useState<File[]>([]);

  const selectedAiGuide = AI_GUIDE_OPTIONS.find((o) => o.value === aiGuide)!;
  const isStep1Valid = sessionName.trim().length > 0;

  /* ── Step 2 데이터 로드 ── */
  useEffect(() => {
    if (step === 2 && publishers.length === 0) {
      getPublishers().then((list) => {
        setPublishers(list);
        if (list.length > 0) setSelectedPublisher(list[0]);
      });
    }
  }, [step, publishers.length]);

  useEffect(() => {
    if (!selectedPublisher) return;
    setLoadingBooks(true);
    setTextbooks([]);
    setSelectedTextbook(null);
    setUnitPrompts([]);
    setSelectedPrompt(null);
    getTextbooks({ publisher: selectedPublisher })
      .then(setTextbooks)
      .finally(() => setLoadingBooks(false));
  }, [selectedPublisher]);

  useEffect(() => {
    if (!selectedTextbook) return;
    setLoadingPrompts(true);
    setUnitPrompts([]);
    setSelectedPrompt(null);
    getUnitPrompts({ textbookId: selectedTextbook.id })
      .then(setUnitPrompts)
      .finally(() => setLoadingPrompts(false));
  }, [selectedTextbook]);

  const handleNext = () => {
    if (step < 3) setStep((step + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleSubmit = async () => {
    let objective: string | undefined = undefined;
    let explanation: string | undefined = undefined;

    if (selectedPrompt?.prompt) {
      try {
        const p = JSON.parse(selectedPrompt.prompt) as {
          learning_objective_summary?: string;
          learning_objectives_detailed?: string[];
          core_concepts?: string[];
          inquiry_question?: string;
          attitudes?: string[];
          subunit_title?: string;
          domain?: string;
          page_range?: string;
        };

        objective = p.learning_objective_summary
          ?? p.learning_objectives_detailed?.join(' / ')
          ?? selectedPrompt.objective
          ?? undefined;

        explanation = JSON.stringify(
          Object.fromEntries(
            Object.entries(p).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
          )
        );
      } catch {
        objective   = selectedPrompt.objective   ?? undefined;
        explanation = selectedPrompt.prompt      ?? undefined;
      }
    }

    const body: CreateSessionBody = {
      class_id: classId,
      session_name: sessionName.trim(),
      objective,
      session_prompt: aiGuide,
      explanation,
      ...(scheduledDate  && { scheduled_date:  `${scheduledDate}T12:00:00.000Z` }),
      ...(scheduledDate && scheduledStart && { scheduled_start: dayjs(`${scheduledDate}T${scheduledStart}`).toISOString() }),
      ...(scheduledDate && scheduledEnd   && { scheduled_end:   dayjs(`${scheduledDate}T${scheduledEnd}`).toISOString() }),
    };
    await onSubmit(body);
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  const STEP_LABELS = ['정보 입력', '단원 선택', 'AI & 자료'];

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.modal} aria-describedby={undefined}>

          <Dialog.Close asChild>
            <button className={styles.closeBtn} aria-label="닫기"><X size={20} /></button>
          </Dialog.Close>

          <Dialog.Title className={styles.title}>신규 세션 생성하기</Dialog.Title>

          {/* Step indicator */}
          <div className={styles.stepIndicator}>
            {([1, 2, 3] as const).map((s, i) => {
              const done   = s < step;
              const active = s === step;
              return (
                <React.Fragment key={s}>
                  {i > 0 && (
                    <div className={`${styles.stepDivider} ${done || active ? styles.stepDividerActive : styles.stepDividerInactive}`} />
                  )}
                  <div className={styles.stepItem}>
                    <div className={`${styles.stepBadge} ${done ? styles.stepBadgeDone : active ? styles.stepBadgeActive : styles.stepBadgeInactive}`}>
                      {done ? <Check size={10} strokeWidth={3} /> : s}
                    </div>
                    <span className={`${styles.stepLabel} ${done || active ? styles.stepLabelActive : styles.stepLabelInactive}`}>
                      {STEP_LABELS[i]}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {step === 1 && (
            <StepInfoInput
              sessionName={sessionName}       onSessionNameChange={setSessionName}
              subject={subject}               onSubjectChange={setSubject}
              semester={semester}             onSemesterChange={setSemester}
              scheduledDate={scheduledDate}   onScheduledDateChange={setScheduledDate}
              scheduledStart={scheduledStart} onScheduledStartChange={setScheduledStart}
              scheduledEnd={scheduledEnd}     onScheduledEndChange={setScheduledEnd}
            />
          )}
          {step === 2 && (
            <StepUnitSelect
              publishers={publishers}
              selectedPublisher={selectedPublisher}
              onPublisherChange={setSelectedPublisher}
              textbooks={textbooks}
              selectedTextbook={selectedTextbook}
              onTextbookChange={setSelectedTextbook}
              unitPrompts={unitPrompts}
              selectedPrompt={selectedPrompt}
              onPromptChange={setSelectedPrompt}
              loadingBooks={loadingBooks}
              loadingPrompts={loadingPrompts}
            />
          )}
          {step === 3 && (
            <StepAIUpload
              aiGuide={aiGuide}
              onAiGuideChange={setAiGuide}
              selectedAiGuide={selectedAiGuide}
              files={files}
              onFilesChange={setFiles}
            />
          )}

          {/* ── Footer ── */}
          <div className={styles.footer}>
            {step > 1 ? (
              <button className={styles.backBtn} type="button" onClick={handleBack}>
                이전
              </button>
            ) : (
              <button className={styles.cancelBtn} type="button" onClick={onClose}>
                취소
              </button>
            )}
            {step < 3 ? (
              <button
                className={styles.nextBtn}
                type="button"
                onClick={handleNext}
                disabled={step === 1 && !isStep1Valid}
              >
                다음 단계
              </button>
            ) : (
              <button
                className={styles.nextBtn}
                type="button"
                onClick={handleSubmit}
                disabled={!isStep1Valid}
              >
                생성하기
              </button>
            )}
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

/* ═══════════════════════════════════════════════════════════
   Step 1 : 정보 입력
═══════════════════════════════════════════════════════════ */
function StepInfoInput({
  sessionName, onSessionNameChange,
  subject,     onSubjectChange,
  semester,    onSemesterChange,
  scheduledDate,  onScheduledDateChange,
  scheduledStart, onScheduledStartChange,
  scheduledEnd,   onScheduledEndChange,
}: {
  sessionName: string; onSessionNameChange: (v: string) => void;
  subject: string;     onSubjectChange: (v: string) => void;
  semester: string;    onSemesterChange: (v: string) => void;
  scheduledDate: string;  onScheduledDateChange: (v: string) => void;
  scheduledStart: string; onScheduledStartChange: (v: string) => void;
  scheduledEnd: string;   onScheduledEndChange: (v: string) => void;
}) {
  return (
    <>
      <p className={styles.sectionLabel}>기본 정보</p>
      <div className={styles.fieldsContainer}>

        {/* 세션 이름 */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>세션 이름</label>
          <div className={styles.inputWrapper}>
            <input
              className={`${styles.input} ${styles.inputWithCounter}`}
              value={sessionName}
              onChange={(e) => onSessionNameChange(e.target.value.slice(0, 50))}
              placeholder="예) 고려중학교 3학년 2반 - 1회차"
            />
            <span className={styles.inputCounter}>{sessionName.length} / 50</span>
          </div>
        </div>

        {/* 과목 + 학기 */}
        <div className={styles.fieldRow}>
          <div className={styles.halfField}>
            <label className={styles.fieldLabel}>과목</label>
            <select className={`${styles.select} ${subject ? styles.selected : ''}`} value={subject} onChange={(e) => onSubjectChange(e.target.value)}>
              <option value="">과목 선택</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className={styles.halfField}>
            <label className={styles.fieldLabel}>학기</label>
            <select className={`${styles.select} ${semester ? styles.selected : ''}`} value={semester} onChange={(e) => onSemesterChange(e.target.value)}>
              <option value="">학기 선택</option>
              {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* 날짜 + 시작/종료 시간 */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>수업 일정 <span className={styles.fieldOptional}>(선택)</span></label>
          <div className={styles.fieldRow}>
            <div className={styles.halfField}>
              <input
                type="date"
                className={`${styles.input} ${scheduledDate ? styles.inputFilled : ''}`}
                value={scheduledDate}
                onChange={(e) => onScheduledDateChange(e.target.value)}
              />
            </div>
            <div className={styles.timeField}>
              <input
                type="time"
                className={`${styles.input} ${scheduledStart ? styles.inputFilled : ''}`}
                value={scheduledStart}
                onChange={(e) => onScheduledStartChange(e.target.value)}
                placeholder="시작"
              />
            </div>
            <div className={styles.timeSep}>~</div>
            <div className={styles.timeField}>
              <input
                type="time"
                className={`${styles.input} ${scheduledEnd ? styles.inputFilled : ''}`}
                value={scheduledEnd}
                onChange={(e) => onScheduledEndChange(e.target.value)}
                placeholder="종료"
              />
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   Step 2 : 단원 선택 (실 API)
═══════════════════════════════════════════════════════════ */
function StepUnitSelect({
  publishers, selectedPublisher, onPublisherChange,
  textbooks,  selectedTextbook,  onTextbookChange,
  unitPrompts, selectedPrompt,   onPromptChange,
  loadingBooks, loadingPrompts,
}: {
  publishers: string[];
  selectedPublisher: string;
  onPublisherChange: (v: string) => void;
  textbooks: Textbook[];
  selectedTextbook: Textbook | null;
  onTextbookChange: (v: Textbook | null) => void;
  unitPrompts: UnitPrompt[];
  selectedPrompt: UnitPrompt | null;
  onPromptChange: (v: UnitPrompt | null) => void;
  loadingBooks: boolean;
  loadingPrompts: boolean;
}) {
  return (
    <div className={styles.unitSection}>
      <div className={styles.unitSectionHeader}>
        <p className={styles.sectionLabel} style={{ margin: 0 }}>단원 선택</p>
        <p className={styles.sectionSubLabel}>교과서를 선택하고 수업 단원을 고르세요. (선택 사항)</p>
      </div>

      {/* 출판사 선택 */}
      {publishers.length > 0 ? (
        <select
          className={`${styles.select} ${styles.selected}`}
          value={selectedPublisher}
          onChange={(e) => onPublisherChange(e.target.value)}
        >
          {publishers.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      ) : (
        <div className={styles.loadingRow}><Loader2 size={16} className={styles.spinner} /><span>출판사 불러오는 중…</span></div>
      )}

      {/* 2열: 교과서 목록 | 단원 목록 */}
      <div className={styles.unitColumns}>

        {/* 교과서 목록 */}
        <div className={styles.unitCol}>
          <p className={styles.colLabel}>교과서</p>
          <div className={styles.listBox}>
            {loadingBooks ? (
              <div className={styles.loadingRow}><Loader2 size={16} className={styles.spinner} /></div>
            ) : textbooks.length === 0 ? (
              <p className={styles.emptyMsg}>교과서가 없습니다.</p>
            ) : (
              textbooks.map((book) => (
                <div
                  key={book.id}
                  className={`${styles.listItem} ${selectedTextbook?.id === book.id ? styles.listItemSelected : ''}`}
                  onClick={() => onTextbookChange(selectedTextbook?.id === book.id ? null : book)}
                >
                  <span className={styles.listItemTitle}>{book.subject}</span>
                  <span className={styles.listItemSub}>{book.year_published ?? ''}</span>
                  {book._count && (
                    <span className={styles.listItemBadge}>{book._count.unit_prompts}단원</span>
                  )}
                  {selectedTextbook?.id === book.id && (
                    <Check size={14} className={styles.listItemCheck} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 단원 목록 */}
        <div className={styles.unitCol}>
          <p className={styles.colLabel}>단원 / 학습목표</p>
          <div className={styles.listBox}>
            {!selectedTextbook ? (
              <p className={styles.emptyMsg}>교과서를 먼저 선택하세요.</p>
            ) : loadingPrompts ? (
              <div className={styles.loadingRow}><Loader2 size={16} className={styles.spinner} /></div>
            ) : unitPrompts.length === 0 ? (
              <p className={styles.emptyMsg}>등록된 단원이 없습니다.</p>
            ) : (
              unitPrompts.map((up) => (
                <div
                  key={up.id}
                  className={`${styles.promptItem} ${selectedPrompt?.id === up.id ? styles.promptItemSelected : ''}`}
                  onClick={() => onPromptChange(selectedPrompt?.id === up.id ? null : up)}
                >
                  <div className={styles.promptMeta}>
                    {up.unit_number != null && (
                      <span className={styles.promptUnit}>{up.unit_number}단원{up.subunit_number != null ? ` · ${up.subunit_number}차시` : ''}</span>
                    )}
                    {up.unit_title && <span className={styles.promptTitle}>{up.unit_title}</span>}
                  </div>
                  {up.subunit_title && <p className={styles.promptSub}>{up.subunit_title}</p>}
                  {up.objective && (
                    <div className={styles.promptObjectiveRow}>
                      <span className={styles.objectiveTag}>학습목표</span>
                      <span className={styles.objectiveText}>{up.objective}</span>
                    </div>
                  )}
                  {selectedPrompt?.id === up.id && (
                    <Check size={14} className={styles.promptCheck} strokeWidth={2.5} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Step 3 : AI & 보조자료 업로드
═══════════════════════════════════════════════════════════ */
function StepAIUpload({
  aiGuide, onAiGuideChange, selectedAiGuide, files, onFilesChange,
}: {
  aiGuide: string; onAiGuideChange: (v: string) => void;
  selectedAiGuide: { value: string; label: string; desc: string };
  files: File[]; onFilesChange: (f: File[]) => void;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onFilesChange([...files, ...Array.from(e.dataTransfer.files)]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onFilesChange([...files, ...Array.from(e.target.files)]);
  };

  return (
    <>
      <div className={styles.step3Row}>
        <div className={styles.step3LabelCol}>
          <p className={styles.sectionLabel} style={{ marginBottom: 0 }}>AI 코칭 가이드</p>
          <p className={styles.sectionSubLabel}>AI 응답 방식을 선택하세요.</p>
        </div>
        <div className={styles.step3ContentCol}>
          <select className={`${styles.select} ${styles.selected}`} value={aiGuide} onChange={(e) => onAiGuideChange(e.target.value)}>
            {AI_GUIDE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className={styles.aiGuideDesc}>
            <Check size={18} color="#22cb84" style={{ flexShrink: 0, marginTop: 2 }} />
            <p className={styles.aiGuideDescText}>{selectedAiGuide.desc}</p>
          </div>
        </div>
      </div>

      <div className={styles.step3Row}>
        <div className={styles.step3LabelCol}>
          <p className={styles.sectionLabel} style={{ marginBottom: 0 }}>세션 전용 자료</p>
          <p className={styles.sectionSubLabel}>학생이 다운로드할 수 있는 보조 자료를 업로드해주세요.</p>
        </div>
        <div style={{ flex: 1 }}>
          <label>
            <div className={styles.uploadArea} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
              <CloudUpload size={24} color="#797c7c" />
              <div className={styles.uploadContent}>
                {files.length > 0 ? (
                  <>
                    <p className={styles.uploadTitle}>{files.length}개 파일 선택됨</p>
                    <p className={styles.uploadSubtitle}>{files.map((f) => f.name).join(', ')}</p>
                  </>
                ) : (
                  <>
                    <p className={styles.uploadTitle}>파일 업로드 또는 드래그</p>
                    <p className={styles.uploadSubtitle}>PDF, JPG, PNG (최대 50MB)</p>
                  </>
                )}
              </div>
            </div>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple style={{ display: 'none' }} onChange={handleFileInput} />
          </label>
        </div>
      </div>
    </>
  );
}
