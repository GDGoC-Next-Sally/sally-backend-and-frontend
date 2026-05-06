import { StudentLiveSession } from '@/components/students/StudentLiveSession';

interface Props {
  params: Promise<{ classId: string; sessionId: string }>;
}

export default async function StudentSessionPage({ params }: Props) {
  const { classId, sessionId } = await params;
  return <StudentLiveSession classId={classId} sessionId={sessionId} />;
}
