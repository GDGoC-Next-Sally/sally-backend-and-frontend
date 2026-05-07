import { SessionPrep } from '@/components/sessions/SessionPrep';
import { StudentSidebar } from '@/components/students/StudentSidebar';

export default function SessionPrepPage() {
  return (
    <div style={{
      display: 'flex',
      gap: '20px',
      padding: '24px',
      backgroundColor: 'var(--color-bg)',
      minHeight: 'calc(100vh - 60px)',
      maxWidth: '1400px',
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <StudentSidebar />
      <SessionPrep />
    </div>
  );
}
