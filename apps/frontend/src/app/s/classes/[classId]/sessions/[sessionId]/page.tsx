import { StudentLiveSession } from '@/components/students/StudentLiveSession';
import { PageContainer } from '@/components/layout/PageContainer';

interface Props {
  params: Promise<{ classId: string; sessionId: string }>;
}

export default async function StudentSessionPage({ params }: Props) {
  const { classId, sessionId } = await params;
  return (
    <PageContainer>
      <StudentLiveSession classId={classId} sessionId={sessionId} />
    </PageContainer>
  );
}
