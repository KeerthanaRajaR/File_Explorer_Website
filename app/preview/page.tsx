import { Suspense } from 'react';
import PreviewClient from './PreviewClient';

export const dynamic = 'force-dynamic';

export default function PreviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-50 p-6 text-sm text-gray-500">Loading preview...</main>}>
      <PreviewClient />
    </Suspense>
  );
}
