'use client';

import React from 'react';
import styles from './ActiveSession.module.css';

export const ActiveSession = () => {
  return (
    <div className={styles.container}>
      <div className={styles.leftSidebar}>
        <div>
          <h3 className={styles.sectionTitle}>학생 목록</h3>
          <div className={styles.studentList}>
            <div className={`${styles.studentItem} ${styles.studentItemActive}`}>
              <div className={styles.studentInfo}>
                <div className={styles.avatar}></div>
                <div className={styles.nameBlock}>
                  <span className={styles.name}>김고대</span>
                  <span className={styles.subName}>관계대명사</span>
                </div>
              </div>
              <div className={styles.statusDot}></div>
            </div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={styles.studentItem}>
                <div className={styles.studentInfo}>
                  <div className={styles.avatar}></div>
                  <div className={styles.nameBlock}>
                    <span className={styles.name}>김고대</span>
                    <span className={styles.subName}>관계대명사</span>
                  </div>
                </div>
                <div className={styles.statusDot}></div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className={styles.sectionTitle}>영어 문법 단원</h3>
          <div className={styles.unitList}>
            <div className={`${styles.unitItem} ${styles.unitItemActive}`}>
              <div className={`${styles.unitDot} ${styles.unitDotActive}`}></div>
              관계대명사
            </div>
            {['to 부정사', '접속사', '동명사', '분사'].map((unit, i) => (
              <div key={i} className={styles.unitItem}>
                <div className={styles.unitDot}></div>
                {unit}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.chatArea}>
        <div className={styles.chatHeader}>
          <div className={styles.chatTitleBlock}>
            <div className={styles.chatAvatar}></div>
            <div>
              <h2 className={styles.chatTitle}>김고대 학생과 AI 코치</h2>
              <span className={styles.chatSub}>관계대명사 단원 학습 중</span>
            </div>
          </div>
          
          <div className={styles.statusBar}>
            <span className={styles.statusLabel}>학습 상태</span>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill}></div>
            </div>
            <span className={styles.statusValue}>안정 72/100</span>
          </div>
        </div>

        <div className={styles.chatContainer}>
          <div className={styles.messageRow}>
            <div className={styles.messageAvatar}></div>
            <div className={`${styles.messageBubble} ${styles.bubbleLeft}`}></div>
          </div>
          <div className={`${styles.messageRow} ${styles.messageRowRight}`}>
            <div className={styles.messageAvatar}></div>
            <div className={`${styles.messageBubble} ${styles.bubbleRight}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
