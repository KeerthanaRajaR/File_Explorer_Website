"use client";

import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Link2, Loader2, Clock, Lock } from 'lucide-react';

interface ShareButtonProps {
  path: string;
  className?: string;
  title?: string;
  onShared?: (message: string, isError?: boolean) => void;
}

const copyText = async (value: string): Promise<boolean> => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
  } catch {
    return false;
  }
};

export function ShareButton({ path, className, title = 'Share', onShared }: ShareButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);
  const [password, setPassword] = useState('');

  const handleShare = async (event: MouseEvent<HTMLButtonElement>, useExpiry: boolean = false, usePassword: boolean = false) => {
    event.preventDefault();
    event.stopPropagation();

    if (loading) return;

    try {
      setLoading(true);

      let expiresAt: string | undefined;
      if (useExpiry && expiryHours > 0) {
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + expiryHours);
        expiresAt = expiryDate.toISOString();
      }

      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          expiresAt,
          password: usePassword && password ? password : undefined,
        }),
      });

      const payload = await response.json();
      if (!payload?.success || !payload?.data?.url) {
        onShared?.(payload?.error || 'Failed to create share link', true);
        setShowOptions(false);
        return;
      }

      const shareUrl = new URL(payload.data.url, window.location.origin).toString();
      const copied = await copyText(shareUrl);

      if (copied) {
        const extras: string[] = [];
        if (useExpiry && expiryHours > 0) extras.push(`expires in ${expiryHours}h`);
        if (usePassword && password) extras.push('password protected');
        const msg = extras.length > 0 ? `Link copied (${extras.join(', ')})` : 'Link copied';
        onShared?.(msg);
      } else {
        onShared?.('Link created, copy failed', true);
      }

      setShowOptions(false);
      setPassword('');
    } catch {
      onShared?.('Failed to create share link', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => handleShare(e, false, false)}
        title={title}
        disabled={loading}
        className={className}
        aria-label={title}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
      </button>

      {showOptions && (
        <div className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 w-64 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Clock size={12} className="inline mr-1" /> Expiry (hours)
            </label>
            <input
              type="number"
              min="1"
              max="720"
              value={expiryHours}
              onChange={(e) => setExpiryHours(Math.max(1, parseInt(e.target.value) || 24))}
              className="w-full text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave at 0 for permanent</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Lock size={12} className="inline mr-1" /> Password (optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for no password"
              className="w-full text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => handleShare(e, expiryHours > 0, !!password)}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowOptions(false)}
              className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showOptions && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowOptions(true);
          }}
          className="ml-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hidden group-hover:inline"
          title="Share options"
        >
          ⚙️
        </button>
      )}
    </div>
  );
}
