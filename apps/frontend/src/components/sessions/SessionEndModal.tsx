'use client';

import React from 'react';
import { X, Clock, User } from 'lucide-react';
import styles from './SessionEndModal.module.css';

interface SessionEndModalProps {
  onClose: () => void;
}

export const SessionEndModal: React.FC<SessionEndModalProps> = ({ onClose }) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={24} />
        </button>

        <h2 className={styles.title}>세션이 종료되었습니다.</h2>

        <div className={styles.infoRow}>
          <span className={styles.sessionTitle}>4월 24일 영어 수업</span>
          <span className={styles.badge}>종료</span>
        </div>

        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <Clock size={14} />
            수요일 5교시
          </div>
          <div className={styles.metaItem}>
            <User size={14} />
            28명
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statTitle}>참여율</span>
            <div className={styles.donutWrapper}>
              <div className={styles.donutCircle}></div>
              <div className={styles.donutText}>78<span className={styles.donutSmall}>%</span></div>
            </div>
            <span className={styles.statSub}>참여 학생 24/26명</span>
          </div>
          
          <div className={styles.statItem}>
            <span className={styles.statTitle}>활동 완료율</span>
            <div className={styles.donutWrapper}>
              <div className={styles.donutCircle}></div>
              <div className={styles.donutText}>78<span className={styles.donutSmall}>%</span></div>
            </div>
            <span className={styles.statSub}>완료 활동 18/20개</span>
          </div>
          
          <div className={styles.statItem}>
            <span className={styles.statTitle}>질문</span>
            <div className={styles.textStat}>
              17<span className={styles.textStatSmall}>개</span>
            </div>
            <span className={styles.statSub}>총 질문 수</span>
          </div>
        </div>

        <div className={styles.insights}>
          <h3 className={styles.insightsTitle}>주요 인사이트</h3>
          <ul className={styles.insightsList}>
            <li>어휘 퀴즈 정답률이 전반적으로 높았어요.</li>
            <li>내용 요약활동에서 학생의 참여도가 낮았어요.</li>
            <li>토론 활동에서 다양한 의견이 활발히 나왔어요.</li>
          </ul>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>취소</button>
          <button className={styles.nextBtn}>다음</button>
        </div>
      </div>
    </div>
  );
};
