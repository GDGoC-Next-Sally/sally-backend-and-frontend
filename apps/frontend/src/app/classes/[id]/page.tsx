import { SessionGrid } from '@/components/sessions/SessionGrid';
import { StudentSidebar } from '@/components/students/StudentSidebar';

export default function ClassDetailPage() {
  return (
    <div style={{ display: 'flex', gap: '24px', padding: '24px', backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 60px)', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <SessionGrid />
      <StudentSidebar />
    </div>
  );
}
