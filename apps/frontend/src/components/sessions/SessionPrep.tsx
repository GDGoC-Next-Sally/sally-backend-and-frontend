'use client';

import React, { useState } from 'react';
import { SessionCodeModal } from './SessionCodeModal';
import styles from './SessionPrep.module.css';

export const SessionPrep = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className={styles.mainContent}>
      <div className={styles.header}>
        <div>
          <div className={styles.titleArea}>
            <div className={styles.titleIcon}></div>
            <h1 className={styles.title}>고려중학교 3학년 4반</h1>
          </div>
        </div>
        <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)}>세션 시작하기</button>
      </div>

      <div className={styles.tags}>
        <span className={styles.tag}>중등 영어</span>
        <span className={styles.tag}>3학년</span>
        <span className={styles.tag}>2026 1학기</span>
        <span className={styles.tag}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          28명
        </span>
      </div>

      <p className={styles.subtitle}>진행하실 클래스를 선택해주세요.</p>

      <div className={styles.prepContainer}>
        <div className={styles.placeholderImage}></div>
        
        <h2 className={styles.prepTitle}>
          <span className={styles.highlight}>4월 1주차</span> 세션을 준비 중입니다.
        </h2>
        <p className={styles.prepSubtitle}>수업 자료와 활동을 실행한 후<br/>세션을 시작할 수 있습니다.</p>

        <div className={styles.checkList}>
          <div className={styles.checkItem}>
            <div className={styles.itemIcon}></div>
            <div className={styles.itemText}>
              <span className={styles.itemTitle}>수업 목표</span>
              <span className={styles.itemSub}>학생들이 오늘 달성할 학습목표를 설정해보세요.</span>
            </div>
          </div>

          <div className={styles.checkItem}>
            <div className={styles.itemIcon}></div>
            <div className={styles.itemText}>
              <span className={styles.itemTitle}>오늘의 자료</span>
              <span className={styles.itemSub}>PPT, 영상, 문서 등 수업에 필요한 자료를 업로드하세요.</span>
            </div>
          </div>

          <div className={styles.checkItem}>
            <div className={styles.itemIcon}></div>
            <div className={styles.itemText}>
              <span className={styles.itemTitle}>활동 순서</span>
              <span className={styles.itemSub}>학습 활동과 시간 배분을 계획해보세요.</span>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && <SessionCodeModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};
