"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';

type SharedState = 'loading' | 'ready' | 'error' | 'password_required';

export default function SharedFilePage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params.token;

  const [state, setState] = useState<SharedState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('application/octet-stream');
  const [isDocx, setIsDocx] = useState(false);
  const [fileName, setFileName] = useState<string>('Shared file');
  const [password, setPassword] = useState(searchParams.get('password') || '');
  const [showPassword, setShowPassword] = useState(false);

  const apiUrl = useMemo(() => `/api/share/${encodeURIComponent(token)}`, [token]);
  const protectedApiUrl = useMemo(() => {
    if (!password) return apiUrl;
    return `${apiUrl}?password=${encodeURIComponent(password)}`;
  }, [apiUrl, password]);

  const docxPreviewUrl = useMemo(() => {
    const base = `/api/share/${encodeURIComponent(token)}/preview`;
    if (!password) return base;
    return `${base}?password=${encodeURIComponent(password)}`;
  }, [token, password]);

  const parseFileName = (contentDisposition: string | null): string => {
    if (!contentDisposition) return 'Shared file';
    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (!match?.[1]) return 'Shared file';
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async (pwd?: string) => {
      setState('loading');
      setError(null);

      try {
        let url = apiUrl;
        if (pwd) {
          url += `?password=${encodeURIComponent(pwd)}`;
        }

        const res = await fetch(url);
        
        if (res.status === 401) {
          if (!cancelled) {
            setState('password_required');
            setError('This file is password protected');
          }
          return;
        }

        if (!res.ok) {
          setState('error');
          setError(res.status === 404 ? 'Share link not found or expired.' : 'Failed to load shared file.');
          return;
        }

        const type = res.headers.get('content-type') || 'application/octet-stream';
        const resolvedFileName = parseFileName(res.headers.get('content-disposition'));
        const lowerFileName = resolvedFileName.toLowerCase();
        const shouldUseDocxPreview = lowerFileName.endsWith('.docx');

        setFileName(resolvedFileName);

        if (shouldUseDocxPreview) {
          if (cancelled) return;
          setMimeType('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          setBlobUrl(null);
          setIsDocx(true);
          setState('ready');
          return;
        }

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setMimeType(type);
        setBlobUrl(objectUrl);
  setIsDocx(false);
        setState('ready');
      } catch {
        if (!cancelled) {
          setState('error');
          setError('Failed to load shared file.');
        }
      }
    };

    if (state === 'password_required' && password) {
      load(password);
    } else if (state === 'loading') {
      load();
    }

    return () => {
      cancelled = true;
      setBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, [apiUrl, password, state]);

  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-6 md:p-8">
          <h1 className="text-2xl font-bold mb-1">📥 Shared file</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Local secure share link</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-medium">{fileName}</p>

          {state === 'loading' && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading shared file...</p>
            </div>
          )}

          {state === 'error' && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
              {error || 'Unable to open this share link.'}
            </div>
          )}

          {state === 'password_required' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <Lock size={16} /> {error}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (password) {
                    setState('loading');
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoFocus
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!password}
                  className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Unlock
                </button>
              </form>
            </div>
          )}

          {state === 'ready' && (blobUrl || isDocx) && (
            <div className="space-y-4">
              {isDocx && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-white">
                  <iframe
                    src={docxPreviewUrl}
                    title="DOCX Preview"
                    className="w-full h-[70vh]"
                  />
                </div>
              )}

              {isImage && (
                <img
                  src={blobUrl || undefined}
                  alt="Shared file"
                  className="max-h-[60vh] w-auto max-w-full rounded-lg border border-gray-200 dark:border-gray-800 object-contain mx-auto shadow-md"
                />
              )}

              {isVideo && (
                <video
                  src={blobUrl || undefined}
                  controls
                  className="max-h-[60vh] w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-black shadow-md"
                />
              )}

              {isAudio && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 p-6">
                  <audio src={blobUrl || undefined} controls className="w-full" />
                </div>
              )}

              {!isDocx && !isImage && !isVideo && !isAudio && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 p-6 text-center text-sm text-gray-600 dark:text-gray-300">
                  Preview is not available for this file type.
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-4">
                <a
                  href={protectedApiUrl}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-md"
                >
                  ⬇️ Download file
                </a>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-6">
          Secure link. This file may expire or be password-protected.
        </p>
      </div>
    </main>
  );
}
