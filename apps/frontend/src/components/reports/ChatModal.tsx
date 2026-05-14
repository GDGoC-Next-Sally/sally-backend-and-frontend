'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getMessages, type ChatMessage } from '@/actions/livechat';
import styles from './ChatModal.module.css';

interface ChatModalProps {
  dialogId: number;
  sessionTitle: string;
  teacherName: string;
  onClose: () => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const hour = h % 12 || 12;
  return `${ampm} ${hour}:${m}`;
}

export function ChatModal({ dialogId, sessionTitle, teacherName, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMessages(dialogId)
      .then(msgs => setMessages(msgs))
      .catch(() => setMessages([]))
      .finally(() => setIsLoading(false));
  }, [dialogId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <p className={styles.title}>{sessionTitle}</p>
            <p className={styles.subtitle}>{teacherName} 선생님</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.messageArea}>
          {isLoading ? (
            <div className={styles.empty}>채팅 기록을 불러오는 중...</div>
          ) : messages.length === 0 ? (
            <div className={styles.empty}>채팅 기록이 없습니다.</div>
          ) : (
            messages.map(msg => {
              const isStudent = msg.sender_type === 'STUDENT';
              return (
                <div
                  key={msg.id}
                  className={`${styles.msgRow} ${isStudent ? styles.msgRowRight : ''}`}
                >
                  {!isStudent && <div className={styles.avatar} />}
                  <span className={`${styles.bubble} ${isStudent ? styles.bubbleRight : styles.bubbleLeft}`}>
                    {msg.content}
                  </span>
                  <span className={styles.time}>{formatTime(msg.created_at)}</span>
                  {isStudent && <div className={styles.avatar} />}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
