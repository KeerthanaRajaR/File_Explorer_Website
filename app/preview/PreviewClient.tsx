"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type PreviewMode = 'text' | 'embed' | 'pdf' | 'error';

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'xml', 'yaml', 'yml', 'csv', 'log', 'mjs', 'cjs'
]);

const getExtension = (filePath: string): string => {
  const clean = filePath.split('?')[0];
  const idx = clean.lastIndexOf('.');
  return idx > -1 ? clean.slice(idx + 1).toLowerCase() : '';
};

const isImagePath = (filePath: string): boolean => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(filePath);

const isRenderableContentType = (contentType: string): boolean => {
  const type = contentType.toLowerCase();
  return (
    type.startsWith('image/') ||
    type === 'application/pdf' ||
    type.startsWith('text/') ||
    type.includes('json') ||
    type.includes('xml') ||
    type.includes('html')
  );
};

const getApiUrl = (targetPath: string): string => {
  const encoded = encodeURIComponent(targetPath);
  const ext = getExtension(targetPath);

  if (ext === 'docx') {
    return `/api/preview/docx?path=${encoded}`;
  }

  if (isImagePath(targetPath)) {
    return `/api/thumbnail?path=${encoded}`;
  }

  return `/api/file?path=${encoded}`;
};

export default function PreviewClient() {
  const searchParams = useSearchParams();
  const targetPath = searchParams.get('path') || '';

  const [mode, setMode] = useState<PreviewMode>('embed');
  const [textContent, setTextContent] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const ext = useMemo(() => getExtension(targetPath), [targetPath]);
  const apiUrl = useMemo(() => (targetPath ? getApiUrl(targetPath) : ''), [targetPath]);
  const isText = useMemo(() => TEXT_EXTENSIONS.has(ext), [ext]);

  useEffect(() => {
    let cancelled = false;
    let createdObjectUrl = '';

    const run = async () => {
      if (!targetPath || !apiUrl) {
        setMode('error');
        setError('Missing file path.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      setTextContent('');
      setEmbedUrl('');

      try {
        if (ext === 'docx') {
          setMode('embed');
          setEmbedUrl(apiUrl);
          setLoading(false);
          return;
        }

        if (isText) {
          const response = await fetch(apiUrl, { cache: 'no-store', credentials: 'same-origin' });
          if (!response.ok) {
            throw new Error(`Failed to load file (${response.status})`);
          }

          const text = await response.text();
          if (cancelled) return;

          setMode('text');
          setTextContent(text);
          setLoading(false);
          return;
        }

        const response = await fetch(apiUrl, { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok) {
          throw new Error(`Failed to load preview (${response.status})`);
        }

        const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();

        if (contentType === 'application/zip' && ext !== 'docx') {
          const docxPreviewUrl = `/api/preview/docx?path=${encodeURIComponent(targetPath)}`;
          const docxProbe = await fetch(docxPreviewUrl, { cache: 'no-store', credentials: 'same-origin' });
          if (docxProbe.ok) {
            setMode('embed');
            setEmbedUrl(docxPreviewUrl);
            setLoading(false);
            return;
          }
        }

        if (!isRenderableContentType(contentType)) {
          throw new Error(
            contentType
              ? `This file type (${contentType}) cannot be previewed inline. Use Download.`
              : 'This file cannot be previewed inline. Use Download.'
          );
        }

        const blob = await response.blob();
        if (cancelled) return;

        const typedBlob = contentType ? new Blob([blob], { type: contentType }) : blob;
        createdObjectUrl = URL.createObjectURL(typedBlob);
        setMode(contentType === 'application/pdf' ? 'pdf' : 'embed');
        setEmbedUrl(createdObjectUrl);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setMode('error');
        setError(err instanceof Error ? err.message : 'Failed to preview file.');
        setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [apiUrl, ext, isText, targetPath]);

  const encoded = targetPath ? encodeURIComponent(targetPath) : '';
  const downloadUrl = encoded ? `/api/download?path=${encoded}` : '#';

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">File Preview</h1>
            <p className="truncate text-sm text-gray-600">{targetPath || 'No file selected'}</p>
          </div>
          {encoded && (
            <a
              href={downloadUrl}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
            >
              Download
            </a>
          )}
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-3 md:p-4">
          {loading && <div className="py-20 text-center text-sm text-gray-500">Loading preview...</div>}

          {!loading && mode === 'text' && (
            <pre className="max-h-[80vh] overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-4 text-sm leading-6">
              {textContent}
            </pre>
          )}

          {!loading && mode === 'embed' && embedUrl && (
            <iframe
              title="File Preview"
              src={embedUrl}
              className="h-[80vh] w-full rounded border border-gray-200"
            />
          )}

          {!loading && mode === 'pdf' && embedUrl && (
            <object
              data={embedUrl}
              type="application/pdf"
              className="h-[80vh] w-full rounded border border-gray-200"
            >
              <div className="p-4 text-sm text-gray-700">
                PDF preview is not available in this browser.
                {encoded && (
                  <span>
                    {' '}
                    <a href={downloadUrl} className="underline">Download PDF</a>
                  </span>
                )}
              </div>
            </object>
          )}

          {!loading && mode === 'error' && (
            <div className="py-20 text-center text-sm text-red-600">
              <p>{error || 'Preview unavailable.'}</p>
              {encoded && (
                <p className="mt-2">
                  <a href={downloadUrl} className="underline">Click here to download the file</a>
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
