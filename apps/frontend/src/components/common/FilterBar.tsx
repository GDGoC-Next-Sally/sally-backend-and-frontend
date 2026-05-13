'use client';

import React from 'react';
import { Search } from 'lucide-react';
import styles from './FilterBar.module.css';

interface SortOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  sortOptions?: SortOption[];
  /** 우측 슬롯 — SessionGrid의 "세션 만들기" 버튼 등 추가 액션을 넣을 때 사용 */
  children?: React.ReactNode;
}

const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: 'recent', label: '최근 활동순' },
  { value: 'name', label: '이름순' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  onSearch,
  placeholder = '검색',
  sortOptions = DEFAULT_SORT_OPTIONS,
  children,
}) => {
  return (
    <div className={styles.filterBar}>
      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} size={18} strokeWidth={2.5} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <select className={styles.sortSelect} defaultValue="">
        <option value="" disabled>정렬</option>
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {children && <div className={styles.rightSlot}>{children}</div>}
    </div>
  );
};
