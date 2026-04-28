'use client';

import React, { useState } from 'react';
import styles from './CreateClassModal.module.css';

interface CreateClassModalProps {
  onClose: () => void;
}

export const CreateClassModal: React.FC<CreateClassModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [classType, setClassType] = useState('정규 수업');
  const [theme, setTheme] = useState(0);
  const [desc, setDesc] = useState('');

  const colors = ['#d0bfff', '#b2f2bb', '#ffd8a8', '#a5d8ff', '#ffb8d2'];

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      // API call to create class here
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h2 className={styles.title}>클래스 만들기</h2>
        
        <div className={styles.stepper}>
          <div className={`${styles.stepNode} ${step >= 1 ? styles.stepNodeActive : ''}`}>1</div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.stepNode} ${step >= 2 ? styles.stepNodeActive : ''}`}>2</div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.stepNode} ${step >= 3 ? styles.stepNodeActive : ''}`}>3</div>
        </div>

        {step === 1 && (
          <div>
            <div className={styles.formGroup}>
              <label className={styles.label}>클래스명</label>
              <input type="text" className={styles.input} placeholder="예) 중등 영어 2단원" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>수업 유형</label>
              <div className={styles.buttonGroup}>
                {['정규 수업', '보충', '자율'].map((type) => (
                  <button 
                    key={type}
                    className={`${styles.typeBtn} ${classType === type ? styles.typeBtnActive : ''}`}
                    onClick={() => setClassType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>배경 테마</label>
              <div className={styles.colorGroup}>
                {colors.map((color, idx) => (
                  <div 
                    key={idx}
                    className={`${styles.colorCircle} ${theme === idx ? styles.colorCircleActive : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setTheme(idx)}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className={styles.formGroup}>
              <label className={styles.label}>학기</label>
              <select className={styles.select}>
                <option>2025년 1학기</option>
                <option>2025년 2학기</option>
                <option>2026년 1학기</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>학년</label>
              <select className={styles.select}>
                <option>중등 1학년</option>
                <option>중등 2학년</option>
                <option>중등 3학년</option>
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className={styles.formGroup}>
              <label className={styles.label}>수업 설명</label>
              <textarea 
                className={styles.textarea}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={200}
              ></textarea>
              <div className={styles.charCount}>{desc.length}/200</div>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>취소</button>
          <button className={styles.nextBtn} onClick={handleNext}>
            {step === 3 ? '완료' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
};
