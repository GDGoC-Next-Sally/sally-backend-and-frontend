import { StudentSessionList } from '@/components/students/StudentSessionList';

interface Props {
  params: { classId: string };
  searchParams: { tab?: string };
}

export default function StudentClassDetailPage({ params, searchParams }: Props) {
  return <StudentSessionList classId={params.classId} initialTab={searchParams.tab} />;
}
