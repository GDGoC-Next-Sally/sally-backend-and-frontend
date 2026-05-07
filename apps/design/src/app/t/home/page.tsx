/**
 * Teacher — Home page (design/mock)
 * Placeholder — extend with a TeacherDashboard component as the UI matures.
 */
import Link from 'next/link';
import styles from './page.module.css';

export default function TeacherHomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>선생님 홈</h1>
        <p className={styles.sub}>Teacher dashboard — coming soon in design.</p>
        <Link href="/t/classes" className={styles.link}>클래스 목록 보기 →</Link>
      </div>
    </main>
  );
}
