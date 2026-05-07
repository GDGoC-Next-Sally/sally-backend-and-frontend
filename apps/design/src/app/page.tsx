/**
 * Design hub — lets you jump to any view without auth.
 * Remove this page in production; real app uses /login redirect.
 */
import styles from './page.module.css';

const ROUTES = [
  { label: '선생님 홈', href: '/t/home', role: 'teacher' },
  { label: '선생님 클래스 목록', href: '/t/classes', role: 'teacher' },
  { label: '학생 홈', href: '/s/home', role: 'student' },
  { label: '학생 클래스 목록', href: '/s/classes', role: 'student' },
];

export default function DesignHubPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.badge}>Design Preview</div>
        <h1 className={styles.title}>Sally UI</h1>
        <p className={styles.subtitle}>목 데이터로 렌더링된 화면입니다. 실 데이터 없이 디자인 검토용으로 사용하세요.</p>

        <div className={styles.section}>
          <p className={styles.sectionLabel}>선생님 뷰</p>
          <div className={styles.grid}>
            {ROUTES.filter((r) => r.role === 'teacher').map((r) => (
              <a key={r.href} href={r.href} className={styles.link}>
                {r.label} →
              </a>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionLabel}>학생 뷰</p>
          <div className={styles.grid}>
            {ROUTES.filter((r) => r.role === 'student').map((r) => (
              <a key={r.href} href={r.href} className={styles.link}>
                {r.label} →
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
