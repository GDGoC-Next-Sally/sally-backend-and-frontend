'use client';

import React, { useState, useMemo } from 'react';
import { type CreateSessionBody } from '@/actions/sessions';
import { type TextbookTemplate, getPublishers, getTemplates } from '@/lib/data/textbookTemplates';
import { X, Check, CloudUpload } from 'lucide-react';
import styles from './CreateSessionModal.module.css';

type Step = 1 | 2 | 3;

const AI_GUIDE_OPTIONS = [
  { value: 'balanced', label: '균형형 (권장)', desc: '학생의 수준과 상황에 맞춰 설명 힌트, 질문을 균형있게 제공합니다.' },
  { value: 'hint', label: '힌트 중심형', desc: '학생이 스스로 생각할 수 있도록 작은 힌트 위주로 도움을 줍니다.' },
  { value: 'explain', label: '설명 중심형', desc: '학생이 이해하기 쉽도록 상세한 설명 위주로 안내합니다.' },
];

const SUBJECTS = ['국어', '영어', '수학', '과학', '사회', '역사', '도덕', '체육', '음악', '미술', '기술', '정보'];
const SEMESTERS = ['2026년 1학기', '2026년 2학기', '2025년 1학기', '2025년 2학기'];
const GRADES = ['1학년', '2학년', '3학년'];
const CLASSES = Array.from({ length: 12 }, (_, i) => `${i + 1}반`);
const PUBLISHERS = getPublishers();

interface Props {
  classId: number;
  onClose: () => void;
  onSubmit: (body: CreateSessionBody) => void | Promise<void>;
  initialStep?: Step;
}

export const CreateSessionModal: React.FC<Props> = ({ classId, onClose, onSubmit, initialStep = 1 }) => {
  const [step, setStep] = useState<Step>(initialStep);

  // Step 1 — 정보 입력
  const [sessionName, setSessionName] = useState('');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('2026년 1학기');
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');
  const [visibility, setVisibility] = useState<'invite' | 'school'>('invite');

  // Step 2 — 템플릿 선택
  const [selectedTemplate, setSelectedTemplate] = useState<TextbookTemplate | null>(null);
  const [publisher, setPublisher] = useState(PUBLISHERS[0] ?? '');

  // Step 3 — AI & 보조자료
  const [aiGuide, setAiGuide] = useState('balanced');
  const [files, setFiles] = useState<File[]>([]);

  const selectedAiGuide = AI_GUIDE_OPTIONS.find((o) => o.value === aiGuide)!;

  // subject/semester/publisher 조합으로 필터링된 템플릿 목록
  const filteredTemplates = useMemo(
    () => getTemplates({ publisher, subject: subject || undefined, semester: semester || undefined }),
    [publisher, subject, semester],
  );

  const isStep1Valid = sessionName.trim().length > 0;

  const handleNext = () => {
    if (step < 3) setStep((step + 1) as Step);
  };

  const handleSubmit = async () => {
    const body: CreateSessionBody = {
      class_id: classId,
      session_name: sessionName.trim(),
      // 템플릿을 선택했으면 그 값 우선, 없으면 폼 값으로 fallback
      objective: selectedTemplate?.objective || undefined,
      explanation: selectedTemplate?.explanation || (subject || undefined),
      session_prompt: aiGuide,
    };
    await onSubmit(body);
    onClose();
  };

  const stepDone = (s: number) => s < step;
  const stepActive = (s: number) => s <= step;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="닫기">
            <X size={20} />
          </button>

          <h2 className={styles.title}>신규 세션 생성하기</h2>

          <div className={styles.stepIndicator}>
            {([1, 2, 3] as const).map((s, i) => {
              const active = stepActive(s);
              const labels = ['정보 입력', '템플릿 선택', 'AI&보조자료 업로드'];
              return (
                <React.Fragment key={s}>
                  {i > 0 && (
                    <div className={`${styles.stepDivider} ${stepDone(s) || active ? styles.stepDividerActive : styles.stepDividerInactive}`} />
                  )}
                  <div className={styles.stepItem}>
                    <div className={`${styles.stepBadge} ${active ? styles.stepBadgeActive : styles.stepBadgeInactive}`}>
                      {s}
                    </div>
                    <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : styles.stepLabelInactive}`}>
                      {labels[i]}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {step === 1 && (
            <StepInfoInput
              sessionName={sessionName} onSessionNameChange={setSessionName}
              subject={subject} onSubjectChange={setSubject}
              semester={semester} onSemesterChange={setSemester}
              grade={grade} onGradeChange={setGrade}
              classNum={classNum} onClassNumChange={setClassNum}
              visibility={visibility} onVisibilityChange={setVisibility}
            />
          )}
          {step === 2 && (
            <StepTemplateSelect
              templates={filteredTemplates}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
              publisher={publisher}
              onPublisherChange={(p) => { setPublisher(p); setSelectedTemplate(null); }}
            />
          )}
          {step === 3 && (
            <StepAIUpload
              aiGuide={aiGuide} onAiGuideChange={setAiGuide}
              selectedAiGuide={selectedAiGuide}
              files={files} onFilesChange={setFiles}
            />
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.draftBtn} type="button" onClick={onClose}>
            임시저장
          </button>
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
            <button className={styles.nextBtn} type="button" onClick={handleSubmit} disabled={!isStep1Valid}>
              생성하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Step 1: 정보 입력 ── */
function StepInfoInput({
  sessionName, onSessionNameChange,
  subject, onSubjectChange,
  semester, onSemesterChange,
  grade, onGradeChange,
  classNum, onClassNumChange,
  visibility, onVisibilityChange,
}: {
  sessionName: string; onSessionNameChange: (v: string) => void;
  subject: string; onSubjectChange: (v: string) => void;
  semester: string; onSemesterChange: (v: string) => void;
  grade: string; onGradeChange: (v: string) => void;
  classNum: string; onClassNumChange: (v: string) => void;
  visibility: 'invite' | 'school'; onVisibilityChange: (v: 'invite' | 'school') => void;
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
            <select
              className={`${styles.select} ${subject ? styles.selected : ''}`}
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
            >
              <option value="">과목 선택</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className={styles.halfField}>
            <label className={styles.fieldLabel}>학기</label>
            <select
              className={`${styles.select} ${semester ? styles.selected : ''}`}
              value={semester}
              onChange={(e) => onSemesterChange(e.target.value)}
            >
              <option value="">학기 선택</option>
              {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* 학년 + 반 */}
        <div className={styles.fieldRow}>
          <div className={styles.halfField}>
            <label className={styles.fieldLabel}>학년</label>
            <select
              className={`${styles.select} ${grade ? styles.selected : ''}`}
              value={grade}
              onChange={(e) => onGradeChange(e.target.value)}
            >
              <option value="">학년 선택</option>
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className={styles.halfField}>
            <label className={styles.fieldLabel}>반</label>
            <select
              className={`${styles.select} ${classNum ? styles.selected : ''}`}
              value={classNum}
              onChange={(e) => onClassNumChange(e.target.value)}
            >
              <option value="">반 선택</option>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* 공개 범위 */}
        <div className={styles.visibilityRow}>
          <span className={styles.visibilityLabel}>공개 범위</span>
          <div className={styles.radioGroup}>
            {[
              { value: 'invite' as const, title: '초대받은 학생만', desc: '초대 링크를 받은 학생만 참여할 수 있습니다.' },
              { value: 'school' as const, title: '학교 구성원 전체', desc: '학교에 소속된 모든 학생이 참여할 수 있습니다.' },
            ].map((opt) => (
              <div key={opt.value} className={styles.radioItem} onClick={() => onVisibilityChange(opt.value)}>
                <div className={`${styles.radioCircle} ${visibility === opt.value ? styles.radioCircleActive : ''}`} />
                <div className={styles.radioText}>
                  <span className={styles.radioTitle}>{opt.title}</span>
                  <span className={styles.radioDesc}>{opt.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Step 2: 템플릿 선택 ── */
function StepTemplateSelect({
  templates,
  selectedTemplate,
  onSelectTemplate,
  publisher,
  onPublisherChange,
}: {
  templates: TextbookTemplate[];
  selectedTemplate: TextbookTemplate | null;
  onSelectTemplate: (v: TextbookTemplate | null) => void;
  publisher: string;
  onPublisherChange: (v: string) => void;
}) {
  const handleToggle = (item: TextbookTemplate) => {
    onSelectTemplate(selectedTemplate?.id === item.id ? null : item);
  };

  return (
    <div className={styles.templateSection}>
      <div className={styles.templateHeader}>
        <p className={styles.sectionLabel} style={{ margin: 0 }}>템플릿 선택하기</p>
        <p className={styles.sectionSubLabel}>템플릿을 선택하고 수업 목적에 맞게 세션을 생성하세요.</p>
      </div>

      <select
        className={`${styles.select} ${styles.selected}`}
        value={publisher}
        onChange={(e) => onPublisherChange(e.target.value)}
      >
        {PUBLISHERS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      <div className={styles.templateListContainer}>
        {templates.length === 0 ? (
          <p className={styles.sectionSubLabel} style={{ padding: '16px 0' }}>
            선택한 조건에 해당하는 템플릿이 없습니다.
          </p>
        ) : (
          templates.map((item) => (
            <div
              key={item.id}
              className={`${styles.templateItem} ${selectedTemplate?.id === item.id ? styles.templateItemSelected : ''}`}
              onClick={() => handleToggle(item)}
            >
              <div className={styles.templateItemContent}>
                <p className={styles.templateUnit}>{item.unit}</p>
                <div className={styles.templateLessonRow}>
                  <span className={styles.templateLesson}>{item.lesson}</span>
                  <span className={styles.templatePages}>{item.pages}</span>
                </div>
                <div className={styles.templateObjectiveRow}>
                  <span className={styles.templateObjectiveTag}>학습목표</span>
                  <span className={styles.templateObjectiveText}>{item.objective}</span>
                </div>
              </div>
              {selectedTemplate?.id === item.id && (
                <Check size={18} color="#22cb84" strokeWidth={2.5} className={styles.templateCheckIcon} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Step 3: AI & 보조자료 업로드 ── */
function StepAIUpload({
  aiGuide, onAiGuideChange, selectedAiGuide, files, onFilesChange,
}: {
  aiGuide: string; onAiGuideChange: (v: string) => void;
  selectedAiGuide: { value: string; label: string; desc: string };
  files: File[]; onFilesChange: (f: File[]) => void;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    onFilesChange([...files, ...dropped]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesChange([...files, ...Array.from(e.target.files)]);
    }
  };

  return (
    <>
      <div className={styles.step3Row}>
        <div className={styles.step3LabelCol}>
          <p className={styles.sectionLabel} style={{ marginBottom: 0 }}>AI 코칭 가이드</p>
          <p className={styles.sectionSubLabel}>세션이 활성화되는 기간을 설정해주세요.</p>
        </div>
        <div className={styles.step3ContentCol}>
          <select
            className={`${styles.select} ${styles.selected}`}
            value={aiGuide}
            onChange={(e) => onAiGuideChange(e.target.value)}
          >
            {AI_GUIDE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
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
          <p className={styles.sectionSubLabel}>학생이 다운로드 할 수 있는 보조 자료를 업로드해주세요.</p>
        </div>
        <div style={{ flex: 1 }}>
          <label>
            <div
              className={styles.uploadArea}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <CloudUpload size={24} color="#797c7c" />
              <div className={styles.uploadContent}>
                {files.length > 0 ? (
                  <>
                    <p className={styles.uploadTitle}>{files.length}개 파일 선택됨</p>
                    <p className={styles.uploadSubtitle}>{files.map((f) => f.name).join(', ')}</p>
                  </>
                ) : (
                  <>
                    <p className={styles.uploadTitle}>파일 업로드 또는 PDF, 이미지 파일 드래그</p>
                    <p className={styles.uploadSubtitle}>PDF, JPG, PNG 파일 (최대 50MB)</p>
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
