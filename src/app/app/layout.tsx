// src/app/app/layout.tsx
import { getSession } from '@/lib/auth';
import { getUserById, getAllDocumentsMeta } from '@/db/queries';
import { AppShell } from '@/components/layout/AppShell';
import { redirect } from 'next/navigation';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await getUserById(session.userId);
  if (!user) {
    redirect('/login');
  }

  const documents = await getAllDocumentsMeta(session.userId);
  return (
    <AppShell documents={documents} user={{ name: user.name, email: user.email }}>
      {children}
    </AppShell>
  );
}
