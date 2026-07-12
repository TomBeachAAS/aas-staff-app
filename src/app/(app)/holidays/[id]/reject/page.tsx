import { redirect } from 'next/navigation';

export default async function RejectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/holidays/${id}/approve`);
}
