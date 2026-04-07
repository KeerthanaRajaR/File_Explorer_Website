import { FileExplorer } from '@/components/FileExplorer';

export const metadata = {
  title: 'File Explorer Web',
  description: 'A production-ready secure file explorer in Next.js',
};

export default function Home() {
  return (
    <main>
      <FileExplorer />
    </main>
  );
}
