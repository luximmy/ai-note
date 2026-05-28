// src/app/app/layout.tsx
import { getAllDocumentsMeta } from '@/db/queries';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const documents = await getAllDocumentsMeta();
  return <AppShell documents={documents}>{children}</AppShell>;
}
