import { StudentLiveSession } from '@/components/students/StudentLiveSession';

interface Props {
  params: { classId: string; sessionId: string };
}

export default function StudentSessionPage({ params }: Props) {
  return <StudentLiveSession classId={params.classId} sessionId={params.sessionId} />;
}
