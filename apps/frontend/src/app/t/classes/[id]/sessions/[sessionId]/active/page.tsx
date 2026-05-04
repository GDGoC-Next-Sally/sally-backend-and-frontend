import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string; sessionId: string }>;
}

export default async function ActiveRedirectPage({ params }: Props) {
  const { id, sessionId } = await params;
  redirect(`/t/classes/${id}/sessions/${sessionId}`);
}
