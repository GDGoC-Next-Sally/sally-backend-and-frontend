import { StudentSessionList } from '@/components/students/StudentSessionList';

interface Props {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function StudentClassDetailPage({ params, searchParams }: Props) {
  const { classId } = await params;
  const { tab } = await searchParams;
  return <StudentSessionList classId={classId} initialTab={tab} />;
}
