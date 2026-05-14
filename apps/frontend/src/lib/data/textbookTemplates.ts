import textbooksData from './textbooks.json';

export interface TextbookTemplate {
  /** 고유 ID: `${textbook.id}_u${unit_number}_s${sub_unit_number}` */
  id: string;
  publisher: string;
  subject: string;
  grade: string;
  semester: string;
  /** "1단원. 문학과 삶에서 만나는 의미" */
  unit: string;
  /** "운율, 비유, 상징의 즐거움" */
  lesson: string;
  /** "p. 10~27" */
  pages: string;
  /** "문학" */
  domain: string;

  // ── API(CreateSessionDto) 매핑 필드 ──
  /** session_name: "1단원. 문학과 삶에서 만나는 의미 – 운율, 비유, 상징의 즐거움" */
  session_name: string;
  /** objective: 첫 번째 학습목표 */
  objective: string;
  /** explanation: 단원 의도(unit_intent) */
  explanation: string;
}

/** textbooks.json 전체를 TextbookTemplate[] 로 변환 */
function buildTemplates(): TextbookTemplate[] {
  const result: TextbookTemplate[] = [];

  for (const book of textbooksData.textbooks) {
    for (const unit of book.units) {
      for (const sub of unit.sub_units) {
        result.push({
          id: `${book.id}_u${unit.unit_number}_s${sub.sub_unit_number}`,
          publisher: book.publisher,
          subject: book.subject,
          grade: book.grade,
          semester: book.semester,

          unit: `${unit.unit_number}단원. ${unit.unit_name}`,
          lesson: sub.sub_unit_name,
          pages: `p. ${sub.page_start}~${sub.page_end}`,
          domain: sub.domain,

          session_name: `${unit.unit_number}단원. ${unit.unit_name} – ${sub.sub_unit_name}`,
          objective: sub.learning_targets[0] ?? '',
          explanation: unit.unit_intent ?? '',
        });
      }
    }
  }

  return result;
}

const ALL_TEMPLATES = buildTemplates();

/** 중복 없는 출판사 목록 */
export function getPublishers(): string[] {
  return [...new Set(ALL_TEMPLATES.map((t) => t.publisher))];
}

/** publisher / subject / semester 로 필터링한 템플릿 반환 (빈 문자열 = 전체) */
export function getTemplates(filters: {
  publisher?: string;
  subject?: string;
  semester?: string;
}): TextbookTemplate[] {
  return ALL_TEMPLATES.filter((t) => {
    if (filters.publisher && t.publisher !== filters.publisher) return false;
    if (filters.subject && t.subject !== filters.subject) return false;
    // textbooks.json의 semester는 "1학기", UI는 "2026년 1학기" 형태이므로 끝부분만 비교
    if (filters.semester && !filters.semester.endsWith(t.semester)) return false;
    return true;
  });
}
