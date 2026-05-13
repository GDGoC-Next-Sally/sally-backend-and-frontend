'use client';

import React from 'react';
import Image from 'next/image';
import { X, Lightbulb } from 'lucide-react';
import styles from './StudentSessionEndModal.module.css';

interface Props {
  onClose: () => void;
  onNext: () => void;
}

export const StudentSessionEndModal: React.FC<Props> = ({ onClose, onNext }) => (
  <div className={styles.overlay} onClick={onClose}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      {/* 닫기 버튼 */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
        <X size={18} />
      </button>

      {/* 제목 */}
      <h2 className={styles.title}>수업이 종료되었습니다.</h2>

      {/* 일러스트 */}
      <div className={styles.illustration}>
        <Image src="/images/sessionsend.png" alt="세션 종료" width={230} height={128} />
      </div>

      {/* 메시지 */}
      <div className={styles.message}>
        <p>참 잘했어요!</p>
        <p>오늘도 고생했어요👏</p>
      </div>

      {/* 파란 안내 박스 */}
      <div className={styles.infoBox}>
        <Lightbulb size={24} color="#0f76f8" strokeWidth={1.8} />
        <p className={styles.infoText}>
          수업 후, 학습 리포트를 바탕으로{' '}
          어려웠던 부분을 다시 복습해보세요.
        </p>
      </div>

      {/* 버튼 */}
      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose}>취소</button>
        <button className={styles.confirmBtn} onClick={onNext}>확인</button>
      </div>
    </div>
  </div>
);
