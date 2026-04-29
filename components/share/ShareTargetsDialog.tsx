"use client";

import { useState } from 'react';
import { X, Copy, Mail, MessageCircle, Share2, Cloud, Clock, Lock, Loader2 } from 'lucide-react';

interface ShareTargetsDialogProps {
  isOpen: boolean;
  path: string | null;
  onClose: () => void;
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

export function ShareTargetsDialog({ isOpen, path, onClose, onShared }: ShareTargetsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);
  const [password, setPassword] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');

  if (!isOpen || !path) return null;

  const createShareUrl = async (): Promise<string | null> => {
    if (loading) return null;

    try {
      setLoading(true);

      const expiresAt = expiryHours > 0
        ? (() => {
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + expiryHours);
            return expiryDate.toISOString();
          })()
        : undefined;

      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          expiresAt,
          password: password || undefined,
        }),
      });

      const payload = await response.json();
      if (!payload?.success || !payload?.data?.url) {
        onShared?.(payload?.error || 'Failed to create share link', true);
        return null;
      }

      return typeof payload.data.url === 'string' && /^https?:\/\//i.test(payload.data.url)
        ? payload.data.url
        : new URL(payload.data.url, window.location.origin).toString();
    } catch {
      onShared?.('Failed to create share link', true);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'copy' | 'native' | 'email' | 'whatsapp' | 'onedrive') => {
    let preOpenedWindow: Window | null = null;
    if (action === 'whatsapp' || action === 'onedrive') {
      // Open synchronously during user click to avoid popup blockers.
      preOpenedWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');
    }

    const shareUrl = await createShareUrl();
    if (!shareUrl) {
      if (preOpenedWindow) preOpenedWindow.close();
      return;
    }

    if (action === 'copy') {
      const copied = await copyText(shareUrl);
      onShared?.(copied ? 'Link copied' : 'Link created, copy failed', !copied);
      return;
    }

    if (action === 'native') {
      try {
        if (navigator.share) {
          await navigator.share({ title: 'Shared file', text: 'Check this file', url: shareUrl });
          onShared?.('Shared successfully');
          onClose();
          return;
        }
      } catch {
        // noop
      }
      const copied = await copyText(shareUrl);
      onShared?.(copied ? 'Native share unavailable. Link copied.' : 'Native share unavailable and copy failed', !copied);
      return;
    }

    if (action === 'email') {
      const subject = encodeURIComponent('Shared file');
      const body = encodeURIComponent(`Hi,%0A%0AHere is the shared file link:%0A${shareUrl}%0A`);
      const recipient = emailTo.trim();
      const toSegment = recipient ? encodeURIComponent(recipient) : '';
      window.location.href = `mailto:${toSegment}?subject=${subject}&body=${body}`;
      onShared?.('Opened email app');
      return;
    }

    if (action === 'whatsapp') {
      const digits = whatsAppNumber.replace(/\D/g, '');
      const text = encodeURIComponent(`Shared file: ${shareUrl}`);
      const target = digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
      if (preOpenedWindow) {
        preOpenedWindow.location.href = target;
      } else {
        window.location.href = target;
      }
      onShared?.('Opened WhatsApp share');
      return;
    }

    const copied = await copyText(shareUrl);
    if (preOpenedWindow) {
      preOpenedWindow.location.href = 'https://onedrive.live.com/';
    } else {
      window.location.href = 'https://onedrive.live.com/';
    }
    onShared?.(copied ? 'Opened OneDrive. Link copied—paste it there.' : 'Opened OneDrive. Copy link manually.', !copied);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h2 className="font-semibold text-lg">Send link</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-500" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void handleAction('copy')} disabled={loading} className="px-2 py-2 text-xs rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1">
              <Copy size={12} /> Copy link
            </button>
            <button type="button" onClick={() => void handleAction('native')} disabled={loading} className="px-2 py-2 text-xs rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1">
              <Share2 size={12} /> Share sheet
            </button>
            <button type="button" onClick={() => void handleAction('email')} disabled={loading} className="px-2 py-2 text-xs rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1">
              <Mail size={12} /> Email
            </button>
            <button type="button" onClick={() => void handleAction('whatsapp')} disabled={loading} className="px-2 py-2 text-xs rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1">
              <MessageCircle size={12} /> WhatsApp
            </button>
          </div>

          <button type="button" onClick={() => void handleAction('onedrive')} disabled={loading} className="w-full px-2 py-2 text-xs rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1">
            <Cloud size={12} /> OneDrive (open + copy link)
          </button>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Clock size={12} className="inline mr-1" /> Expiry (hours)
            </label>
            <input
              type="number"
              min="0"
              max="720"
              value={expiryHours}
              onChange={(e) => setExpiryHours(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Set to 0 for no expiry</p>
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

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email recipient (optional)
            </label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="person@example.com"
              className="w-full text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              WhatsApp number (optional)
            </label>
            <input
              type="tel"
              value={whatsAppNumber}
              onChange={(e) => setWhatsAppNumber(e.target.value)}
              placeholder="e.g. 919876543210"
              className="w-full text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use country code, digits only for direct chat.</p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" disabled={loading}>
            {loading ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Working...</span> : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
