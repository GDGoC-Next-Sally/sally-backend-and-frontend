'use client';

import React from 'react';
import styles from './StudentSessionEndModal.module.css';

interface Props {
  onClose: () => void;
  onNext: () => void;
}

/** 초록 체크 일러스트 */
const CheckIllustration = () => (
  <svg width="230" height="128" viewBox="0 0 230 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 배경 연한 원 */}
    <circle cx="115" cy="64" r="60" fill="#e6faf2" />
    {/* 초록 원 */}
    <circle cx="115" cy="64" r="44" fill="#22cb84" />
    {/* 체크 */}
    <polyline
      points="96,64 110,78 136,50"
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* 장식 점들 */}
    <circle cx="52" cy="36" r="5" fill="#22cb84" opacity="0.5" />
    <circle cx="40" cy="72" r="3.5" fill="#22cb84" opacity="0.35" />
    <circle cx="68" cy="106" r="4" fill="#22cb84" opacity="0.4" />
    <circle cx="178" cy="30" r="4" fill="#22cb84" opacity="0.45" />
    <circle cx="192" cy="68" r="5.5" fill="#22cb84" opacity="0.3" />
    <circle cx="168" cy="104" r="3" fill="#22cb84" opacity="0.4" />
  </svg>
);

/** 전구 아이콘 */
const BulbIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f76f8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.4-1.3 4.5-3.3 5.7-.4.3-.7.7-.7 1.1V17H10v-1.2c0-.4-.3-.8-.7-1.1A6 6 0 0 1 6 9a6 6 0 0 1 6-6z" />
  </svg>
);

export const StudentSessionEndModal: React.FC<Props> = ({ onClose, onNext }) => (
  <div className={styles.overlay} onClick={onClose}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      {/* 닫기 버튼 */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* 제목 */}
      <h2 className={styles.title}>수업이 종료되었습니다.</h2>

      {/* 일러스트 */}
      <div className={styles.illustration}>
        <CheckIllustration />
      </div>

      {/* 메시지 */}
      <div className={styles.message}>
        <p>참 잘했어요!</p>
        <p>오늘도 고생했어요👏</p>
      </div>

      {/* 파란 안내 박스 */}
      <div className={styles.infoBox}>
        <BulbIcon />
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
