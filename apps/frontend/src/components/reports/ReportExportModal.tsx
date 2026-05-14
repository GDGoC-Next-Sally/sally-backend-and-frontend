'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Link2, FolderDown } from 'lucide-react';
import styles from './ReportExportModal.module.css';

interface ReportExportModalProps {
  onClose: () => void;
}

type ExportType = 'pdf' | 'link' | 'file' | null;

export const ReportExportModal: React.FC<ReportExportModalProps> = ({ onClose }) => {
  const [selected, setSelected] = useState<ExportType>(null);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isGenerating) return;
    if (progress >= 100) { setIsGenerating(false); return; }
    const t = setTimeout(() => setProgress(p => Math.min(p + 8, 100)), 150);
    return () => clearTimeout(t);
  }, [isGenerating, progress]);

  const handleSelect = (type: ExportType) => {
    setSelected(type);
    setProgress(0);
    setIsGenerating(true);
  };

  const handleConfirm = () => {
    if (progress >= 100) onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} type="button">
          <X size={20} />
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>리포트 내보내기</h2>
          <p className={styles.subtitle}>원하는 형식으로 리포트를 저장하거나 공유할 수 있어요.</p>
        </div>

        <div className={styles.optionRow}>
          <button
            className={`${styles.optionCard} ${selected === 'pdf' ? styles.optionSelected : ''}`}
            onClick={() => handleSelect('pdf')}
            type="button"
          >
            <FileText size={40} color="#E8593C" strokeWidth={1.5} />
            <div className={styles.optionLabel}>PDF 다운로드</div>
            <div className={styles.optionSub}>내 기기에 저장</div>
          </button>

          <button
            className={`${styles.optionCard} ${selected === 'link' ? styles.optionSelected : ''}`}
            onClick={() => handleSelect('link')}
            type="button"
          >
            <Link2 size={40} color="#22CB84" strokeWidth={1.5} />
            <div className={styles.optionLabel}>링크 공유</div>
            <div className={styles.optionSub}>공유 링크 생성</div>
          </button>

          <button
            className={`${styles.optionCard} ${selected === 'file' ? styles.optionSelected : ''}`}
            onClick={() => handleSelect('file')}
            type="button"
          >
            <FolderDown size={40} color="#F59E0B" strokeWidth={1.5} />
            <div className={styles.optionLabel}>내 기기에 저장</div>
            <div className={styles.optionSub}>파일로 저장</div>
          </button>
        </div>

        {selected && (
          <div className={styles.progressSection}>
            <div className={styles.progressLabel}>
              {progress < 100 ? '리포트 생성 중...' : '생성 완료!'}
            </div>
            <div className={styles.progressSub}>
              {progress < 100 ? '잠시만 기다려주세요.' : '완료 버튼을 눌러 저장하세요.'}
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className={styles.btnRow}>
          <button className={styles.cancelBtn} onClick={onClose} type="button">취소</button>
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={progress < 100}
            type="button"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
};
